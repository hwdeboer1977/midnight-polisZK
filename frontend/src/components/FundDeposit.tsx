import { useEffect, useState } from "react";
import { apiUrl } from "../lib/origin";
import { loadDeployments } from "../lib/deployments";
import { formatPeur, parsePeurInput, toPeurInput } from "../lib/format";
import { readNationalDeposits, type NationalDeposits } from "../lib/nationalDeposits";
import { NationalArrivals } from "./NationalArrivals";

type TreasuryName = "social-treasury" | "tax-treasury" | "platform";

interface TreasuryBalance {
  from: TreasuryName;
  /** Minor units as a string — JSON has no bigint. Null when unreadable. */
  minor: string | null;
  /** Unshielded NIGHT in the same wallet. Without it the pEUR cannot be spent. */
  nightMinor: string | null;
  /**
   * The most that can be moved in ONE transaction.
   *
   * Below `minor` whenever the wallet holds two coins of the same value: the
   * balancer discards candidates by value alone, so spending one of a matching
   * pair drops the other. A treasury collects identical amounts as a matter of
   * course — the same payroll remits the same withholding every month — so this
   * is the ordinary case rather than an odd one.
   */
  spendableMinor: string | null;
  error?: string;
}

const WALLET_LABEL: Record<TreasuryName, string> = {
  "social-treasury": "Social treasury (contributions)",
  "tax-treasury": "Tax treasury",
  platform: "Platform wallet (top-up)",
};

/**
 * Moving a treasury's pEUR into the benefit fund or the tax vault.
 *
 * The last hop, and the one nothing used to perform. `remitTax` and
 * `remitSocial` send each period's withholding to the two treasury wallets, and
 * until now nothing spent those: every deposit the fund had ever received came
 * from the PLATFORM wallet instead, so contributions accumulated in one place
 * while benefits were paid out of another. This closes that.
 *
 * Behind the platform token WHEN THE SERVICE HAS ONE. `requirePlatformToken`
 * passes when `PLATFORM_API_TOKEN` is unset, which `config.ts` permits only on
 * loopback — so a local service needs no token and demanding one here made the
 * panel look locked when it was not. `/api/health` says which case this is, and
 * the field appears only in the guarded one.
 */
export function FundDeposit({
  networkId,
  onDeposited,
}: {
  networkId: string;
  /**
   * Fired once a remittance has landed, so the page's own read of the two
   * receiving contracts refreshes rather than waiting for a reload. This
   * component re-reads the per-period arrivals itself; the lifetime totals
   * beside it belong to the page.
   */
  onDeposited?: () => void;
}) {
  /**
   * What the operator typed, in pEUR rather than in minor units.
   *
   * The field used to take minor units, which meant a deposit of a hundred
   * euros was typed as 100000000 and a deposit of a hundred was typed by
   * mistake — the same nine-digit figure the treasury balance is quoted in, and
   * a factor of a million from what it looked like. `parsePeurInput` converts
   * before the request is sent, so the wire still carries minor units and the
   * service's parser stays the authority on what is valid.
   */
  const [amount, setAmount] = useState("");
  const amountMinor = parsePeurInput(amount);
  /**
   * What is being sent, which decides BOTH ends of the transfer.
   *
   * There used to be two selects — a destination and a source — sitting side by
   * side and reading as a duplicate, because in every ordinary case one
   * determined the other: contributions come out of the social treasury and go
   * to the fund, wage tax comes out of the tax treasury and goes to the vault.
   * Offering the pairing as two free choices meant offering three wrong
   * combinations, one of which (tax treasury → benefit fund) would have spent
   * the wrong month's money into the wrong contract and recorded it as a
   * contribution.
   *
   * The one case where they genuinely come apart is a platform top-up, and that
   * is now what it looks like: a checkbox that changes the source, leaving the
   * destination alone.
   */
  const [target, setTarget] = useState<"fund" | "taxvault">("fund");
  const [topUp, setTopUp] = useState(false);
  const from: TreasuryName = topUp
    ? "platform"
    : target === "taxvault"
      ? "tax-treasury"
      : "social-treasury";
  const [period, setPeriod] = useState("");
  const [source, setSource] = useState("");
  const [token, setToken] = useState("");

  /**
   * What the two receiving contracts already hold for the period being typed.
   *
   * Read from THEM, not from payroll: payroll's ledger stops at `remitTax`, so
   * it cannot answer whether the second hop landed and never could. This is the
   * only confirmation the operation has — a deposit reports a tx hash, and a tx
   * hash is not the same claim as "the fund recorded €400 against October".
   *
   * It also answers the question that comes before pressing anything: whether
   * this period has already been deposited. `contributedFor` is cumulative
   * rather than write-once, so a second deposit is added rather than refused —
   * the contract will not stop a month being paid twice, and this is what shows
   * it before it happens.
   */
  const shownPeriod = /^\d{6}$/.test(period.trim()) ? Number(period.trim()) : null;
  const [national, setNational] = useState<NationalDeposits | null>(null);
  const [nationalNonce, setNationalNonce] = useState(0);
  useEffect(() => {
    if (shownPeriod === null) {
      setNational(null);
      return;
    }
    let cancelled = false;
    void readNationalDeposits(networkId, shownPeriod).then((result) => {
      if (!cancelled) setNational(result);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId, shownPeriod, nationalNonce]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ txHash: string; ordinal: number } | null>(null);

  /**
   * Whether this service checks a bearer token at all.
   *
   * `null` while unknown, and the field is hidden until the answer arrives
   * rather than shown and then withdrawn. `/api/health` publishes this
   * deliberately — a caller deserves to know whether it is about to send a
   * secret to something that never reads one.
   */
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch(apiUrl("/api/health"))
      .then((r) => r.json())
      .then((health: { authenticated?: boolean }) => {
        if (!cancelled) setAuthenticated(Boolean(health.authenticated));
      })
      .catch(() => {
        // Unreachable service. Shown, because a token that turns out to be
        // unnecessary costs a wasted keystroke and a missing one costs a 401
        // nobody can explain.
        if (!cancelled) setAuthenticated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** What each wallet holds, once asked. Never read without asking — see `checkBalances`. */
  const [balances, setBalances] = useState<TreasuryBalance[] | null>(null);
  const [reading, setReading] = useState(false);
  const [funding, setFunding] = useState(false);
  const selected = balances?.find((balance) => balance.from === from) ?? null;
  // The reachable figure, never the balance. A Max that fills more than the
  // balancer can assemble fails minutes later as `Insufficient funds for
  // fallible segment`, which describes neither the wallet nor the amount.
  const maxMinor = selected?.spendableMinor ?? null;

  // Defaulted to the payroll contract this deployment runs, which is where the
  // money came from in every ordinary case. Editable, because an operator may be
  // depositing on behalf of an earlier instance.
  useEffect(() => {
    if (source) return;
    void loadDeployments().then((all) => {
      const payroll = all[`${networkId}/payroll`];
      if (payroll && !source) setSource(payroll.contractAddress);
    });
  }, [networkId, source]);


  const authHeader = (): Record<string, string> =>
    token.trim() ? { authorization: `Bearer ${token.trim()}` } : {};

  /**
   * Runs a job route to completion.
   *
   * Both routes here answer with a job id rather than a result: a deposit
   * proves for minutes and a balance read syncs a wallet, and neither belongs
   * in an open HTTP request. The polling is identical, so it lives once.
   */
  async function runJob<T>(
    path: string,
    body: unknown,
    onLog: (lines: string[]) => void
  ): Promise<T | undefined> {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    const started = (await response.json().catch(() => ({}))) as {
      jobId?: string;
      error?: string;
    };
    if (!response.ok) throw new Error(started.error ?? `Service returned ${response.status}`);

    const poll = async (): Promise<T | undefined> => {
      const r = await fetch(apiUrl(`/api/job/${started.jobId}`));
      const job = (await r.json()) as {
        status: string;
        log?: string[];
        error?: string;
        result?: T;
      };
      onLog(job.log ?? []);
      if (job.status === "running") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return poll();
      }
      if (job.status === "failed") throw new Error(job.error ?? "The job failed");
      return job.result;
    };
    return poll();
  }

  /**
   * Asks the service what the treasuries hold.
   *
   * On a button rather than on mount, and that is not laziness. A shielded
   * balance cannot be read from the indexer — only the holder of the spending
   * key can decrypt its own coins — so answering this builds each wallet and
   * syncs it. Doing that every time the step renders would sync two wallets
   * per page load for a figure nobody had asked for.
   */
  async function checkBalances() {
    setError(null);
    setReading(true);
    try {
      // Both treasuries every time — the point of the list is to see what each
      // holds — plus the platform only while a top-up is actually selected, so
      // an unrelated wallet is not synced for nothing.
      const wallets = Array.from(new Set<TreasuryName>(["social-treasury", "tax-treasury", from]));
      const result = await runJob<TreasuryBalance[]>(
        "/api/treasuries/balances",
        { wallets },
        setLog
      );
      setBalances(result ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setReading(false);
    }
  }

  /**
   * Gives the treasuries the NIGHT they need to pay a fee.
   *
   * The step that has no manual alternative, which is why it is a button. The
   * treasury seeds are raw hex, and a browser wallet imports a recovery phrase
   * and nothing else — so these keys cannot be opened in Lace or IAM and
   * cannot be pointed at a faucet by hand. This service holds them already.
   */
  async function fundWithNight() {
    setError(null);
    setFunding(true);
    try {
      await runJob("/api/treasuries/night", {}, setLog);
      // Re-read rather than assume: what matters afterwards is what the wallets
      // now hold, and that is the same question the balance list answers.
      await checkBalances();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setFunding(false);
    }
  }

  async function deposit() {
    setError(null);
    setDone(null);
    setLog([]);
    setBusy(true);
    try {
      if (amountMinor === null) throw new Error("An amount in pEUR, e.g. 200.20");
      const result = await runJob<{ txHash: string; ordinal: number }>(
        "/api/fund/deposit",
        // Minor units on the wire, as the service expects — the euro figure
        // above is a display convention of this field and nothing else.
        { amount: String(amountMinor), from, target, period, source },
        setLog
      );
      if (result) {
        setDone(result);
        // The point of the arrivals line above: what the receiving contract now
        // records, rather than the tx hash this returns.
        setNationalNonce((n) => n + 1);
        onDeposited?.();
        // What was just spent is no longer there. Leaving the old figure on
        // screen beside a Max button would offer an amount the wallet cannot
        // cover any more.
        setBalances(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const working = busy || reading || funding;
  /** A wallet holding money it cannot move: pEUR, no NIGHT. */
  const stranded = balances?.some((b) => b.minor !== "0" && b.nightMinor === "0") ?? false;

  // No card. The operator page wraps this in its tinted treasury zone and
  // renders the process strip above it, so a card here would draw a white box
  // inside a purple one for no reason. The one white surface is the action
  // panel below, which is the point of the tint: the thing you press stands out
  // of the zone that frames it.
  return (
    <div className="settlement">
      {/* The hop as one line, left to right, in the order it is decided: what is
          moving, for which month, out of which wallet. It used to be three
          controls in a row with a paragraph before them and two after, and the
          sequence had to be inferred from the prose. */}
      <div className="settlement-panel">
        {/* What the selected wallet can actually send, once asked. Purple and
            large, because it is the answer to "is there anything to do" at the
            exact moment the operator is deciding — and because a Max button
            beside a figure nobody has read is a guess. */}
        {maxMinor !== null && maxMinor !== "0" ? (
          <p className="ready-line">
            <strong>€{formatPeur(BigInt(maxMinor))}</strong> ready to remit from the{" "}
            {WALLET_LABEL[from].toLowerCase()}
          </p>
        ) : null}

        <div className="settlement-row">
        <select
          value={target}
          disabled={working}
          onChange={(e) => setTarget(e.target.value as "fund" | "taxvault")}
        >
          <option value="fund">Contributions → benefit fund</option>
          <option value="taxvault">Wage tax → tax vault</option>
        </select>
        <input
          value={period}
          disabled={working}
          placeholder="Period, e.g. 202609"
          style={{ minWidth: 130 }}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <input
          value={amount}
          disabled={working}
          inputMode="decimal"
          placeholder="Amount in pEUR"
          style={{ minWidth: 150 }}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          type="button"
          className="ghost"
          // Only once a balance has actually been read. A Max that guesses is
          // worse than no Max: it would fill a figure the wallet cannot cover
          // and fail minutes later inside the balancer.
          disabled={working || maxMinor === null || maxMinor === "0"}
          title={
            maxMinor === null
              ? "Check the balances first — a shielded balance cannot be guessed"
              : `The most the ${WALLET_LABEL[from]} can send in one transaction`
          }
          onClick={() => maxMinor && setAmount(toPeurInput(BigInt(maxMinor)))}
        >
          Max
        </button>
        {authenticated ? (
          <input
            type="password"
            value={token}
            disabled={working}
            placeholder="Platform token"
            autoComplete="off"
            style={{ minWidth: 160 }}
            onChange={(e) => setToken(e.target.value)}
          />
        ) : null}
        {/* The amount on the button, not only in the field beside it. This is
            the last chance to notice a figure before minutes of proving, and a
            button reading "Remit" says nothing about what is about to move. */}
        <button
          type="button"
          className="primary remit"
          disabled={working || amountMinor === null || !period.trim() || !source.trim()}
          onClick={() => void deposit()}
        >
          {busy
            ? "Remitting…"
            : amountMinor === null
              ? "Remit"
              : `Remit €${formatPeur(amountMinor)} →`}
        </button>
      </div>

        <AmountEcho
          typed={amount}
          minor={amountMinor}
          maxMinor={maxMinor}
          wallet={WALLET_LABEL[from]}
        />
      </div>

      <label className="inline-check settlement-topup">
        <input
          type="checkbox"
          checked={topUp}
          disabled={working}
          onChange={(e) => setTopUp(e.target.checked)}
        />
        Top up from the platform wallet instead
      </label>

      <p className="note" style={{ marginTop: 4 }}>
        Paying from <strong>{WALLET_LABEL[from]}</strong>.
        {topUp
          ? " A top-up is the platform covering the contract, not a period's withholding arriving — the deposit is still recorded against the period above."
          : " Each destination is paid by the treasury that was remitted for it, so the pairing is not a choice."}
      </p>

      {shownPeriod === null ? null : (
        <div className="settlement-arrivals">
          <NationalArrivals deposits={national} period={shownPeriod} />
          <button
            type="button"
            className="ghost"
            disabled={working}
            onClick={() => setNationalNonce((n) => n + 1)}
          >
            Re-check
          </button>
        </div>
      )}

      <h3 className="balance-head">Treasury wallets</h3>
      <TreasuryBalances
        balances={balances}
        reading={reading}
        funding={funding}
        stranded={stranded}
        onCheck={() => void checkBalances()}
        onFund={() => void fundWithNight()}
        disabled={working}
      />

      <details className="details">
        <summary>How settlement works</summary>
        <p className="note">
          Each period's withholding leaves the payroll contract in two
          transactions the EMPLOYER signs — <code>remitTax</code> and{" "}
          <code>remitSocial</code> — which put it in the two treasury wallets.
          At that point nothing on chain says what it was for. This step is the
          second hop: it moves the money into the contracts that govern it, and
          records the period and the paying payroll contract as it lands.
        </p>
        <p className="note">
          Contributions go to the benefit fund, which pays claims out of them.
          Wage tax goes to the vault, which records it per period and can only
          ever pay out to the authority frozen at its deploy. Neither
          destination can be redirected.
        </p>
        <p className="note">
          <code>contributedFor</code> and <code>receivedFor</code> can therefore
          be compared against that period's totals on the payroll contract.
          Neither contract can verify the claim — one contract cannot read
          another's ledger — so a mismatch is publicly visible rather than
          refused. It is also cumulative rather than write-once: depositing the
          same period twice adds, so read the arrivals line above first.
        </p>
        <p className="note">
          The paying payroll contract, recorded with the deposit. Defaulted to
          the one this deployment runs; editable for a deposit made on behalf of
          an earlier instance.
        </p>
        <input
          value={source}
          disabled={working}
          placeholder="Payroll contract these came from"
          style={{ marginTop: 4, width: "100%", fontFamily: "monospace", fontSize: 12 }}
          onChange={(e) => setSource(e.target.value)}
        />
        <p className="note">
          The coin's nonce is written to the service's pool file before the
          transaction is sent, because that file is the only record of the
          fund's coins that exists anywhere — a coin the fund holds but cannot
          describe is a coin no claim can spend.
        </p>
        {authenticated === false ? (
          <p className="note">
            This service has no <code>PLATFORM_API_TOKEN</code> set, so it is
            not asking for one. That is only allowed on loopback —{" "}
            <code>config.ts</code> refuses to bind anywhere else without a token
            — so the guard is the machine rather than a secret. Nothing else
            changes: the treasury seeds still live only here, and only this
            service can spend them.
          </p>
        ) : null}
      </details>

      {log.length > 0 ? <pre className="log">{log.join("\n")}</pre> : null}
      {error ? <p className="status error">{error}</p> : null}
      {done ? (
        <p className="ok-line">
          ✓ Remitted — pool coin #{done.ordinal}, tx {done.txHash}
        </p>
      ) : null}
    </div>
  );
}

/**
 * What the wallets hold, and the control that asks.
 *
 * Three states per wallet, kept apart for the same reason the arrivals summary
 * keeps them apart: a figure is what is there, zero is an empty wallet, and an
 * error is a seed this service does not have. Rendering the third as zero would
 * say the treasury was emptied when in fact it was never readable.
 */
function TreasuryBalances({
  balances,
  reading,
  funding,
  stranded,
  onCheck,
  onFund,
  disabled,
}: {
  balances: TreasuryBalance[] | null;
  reading: boolean;
  funding: boolean;
  stranded: boolean;
  onCheck: () => void;
  onFund: () => void;
  disabled: boolean;
}) {
  return (
    <div className="treasury-balances">
      <button type="button" className="ghost" disabled={disabled} onClick={onCheck}>
        {reading ? "Reading the wallets…" : balances ? "Re-check balances" : "Check balances"}
      </button>
      {stranded ? (
        <button type="button" className="ghost" disabled={disabled} onClick={onFund}>
          {funding ? "Sending NIGHT and registering…" : "Fund the treasuries with NIGHT"}
        </button>
      ) : null}
      {balances?.some((b) => b.minor !== "0" && b.nightMinor === "0") ? (
        <p className="status error" style={{ marginTop: 6 }}>
          That wallet cannot pay a fee, so a deposit from it fails while being
          balanced — as <code>Insufficient funds for fallible segment</code>,
          which names a segment and not a wallet. Press{" "}
          <strong>Fund the treasuries with NIGHT</strong>: the platform wallet
          sends some and each treasury registers it for DUST generation. It
          cannot be done by hand — these seeds are raw hex, and a browser wallet
          only imports a recovery phrase.
        </p>
      ) : null}
      {balances?.some(
        (b) => b.spendableMinor !== null && b.spendableMinor !== b.minor
      ) ? (
        <p className="note" style={{ marginTop: 6 }}>
          A wallet holding two coins of the same value can only reach one of
          them per transaction — the balancer drops candidates by value alone,
          so spending one discards its twin. Identical amounts are normal here,
          since the same payroll remits the same withholding every month.
          Nothing is lost: deposit what is reachable, then repeat, and the
          change carries values that no longer collide.
        </p>
      ) : null}
      {balances ? (
        <ul>
          {balances.map((balance) => (
            <li key={balance.from}>
              {WALLET_LABEL[balance.from]}:{" "}
              {balance.minor === null ? (
                <span className="faint">{balance.error ?? "could not be read"}</span>
              ) : (
                <>
                  <strong>€{formatPeur(BigInt(balance.minor))}</strong>
                  {balance.spendableMinor !== null &&
                  balance.spendableMinor !== balance.minor ? (
                    <span className="capped">
                      {" "}
                      · €{formatPeur(BigInt(balance.spendableMinor))} in one transaction
                    </span>
                  ) : null}
                  {/* The fee, beside the money it moves. A treasury only ever
                      receives — nothing sends it NIGHT — so a balance it cannot
                      spend is its ordinary state rather than an odd one, and
                      the balancer reports that as a segment number. */}
                  {balance.nightMinor === "0" && balance.minor !== "0" ? (
                    <span className="no-fees"> · no NIGHT — cannot pay a fee to spend this</span>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="note" style={{ margin: 0 }}>
          A shielded balance is not public — only the holder of the spending key
          can decrypt its own coins — so this builds each wallet and syncs it.
          Seconds on a warm cache, minutes after a restart.
        </p>
      )}
    </div>
  );
}

/**
 * The typed figure in minor units, beside what the wallet holds.
 *
 * The field takes euros; the chain, the service and every log line carry minor
 * units. Echoing the conversion is the cheapest possible check that the two
 * agree, and comparing it against the balance catches the other half — an
 * amount the wallet cannot cover, which the service would otherwise refuse only
 * after the operator had waited for a sync.
 */
function AmountEcho({
  typed,
  minor,
  maxMinor,
  wallet,
}: {
  typed: string;
  minor: bigint | null;
  maxMinor: string | null;
  wallet: string;
}) {
  if (!typed.trim()) return null;
  if (minor === null) {
    return (
      <p className="note" style={{ marginTop: 4 }}>
        An amount in pEUR greater than zero, with at most 6 decimal places and no
        thousands separators.
      </p>
    );
  }

  const over = maxMinor !== null && minor > BigInt(maxMinor);
  return (
    <p className={over ? "status error" : "note"} style={{ marginTop: 4 }}>
      €{formatPeur(minor)} = {String(minor)} minor units
      {over ? ` — more than the ${wallet} holds, so this would be refused.` : ""}
    </p>
  );
}
