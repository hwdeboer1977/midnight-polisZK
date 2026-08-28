import { useEffect, useState } from "react";
import { apiUrl } from "../lib/origin";
import { loadDeployments } from "../lib/deployments";
import { formatPeur } from "../lib/format";

type TreasuryName = "social-treasury" | "tax-treasury" | "platform";

interface TreasuryBalance {
  from: TreasuryName;
  /** Minor units as a string — JSON has no bigint. Null when unreadable. */
  minor: string | null;
  /** Unshielded NIGHT in the same wallet. Without it the pEUR cannot be spent. */
  nightMinor: string | null;
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
  bare,
  defaultPeriod,
  defaultSource,
  onDeposited,
}: {
  networkId: string;
  /**
   * Rendered without its own card and heading, for embedding in the employer's
   * month stepper — which supplies both. The same prop `PayslipRecovery` takes,
   * for the same reason: a card inside a step draws a box around a box.
   */
  bare?: boolean;
  /**
   * The month the embedding context is working on, used as the initial value.
   *
   * Seeded rather than controlled. Depositing for an earlier month is a real
   * operation — a period can be remitted long after the calendar moved on — so
   * the field stays editable and this only saves the retype in the ordinary
   * case.
   */
  defaultPeriod?: number | null;
  /** The payroll contract the money came from, seeded the same way. */
  defaultSource?: string;
  /**
   * Fired once a deposit has landed, so an embedding step can re-read the
   * receiving contract rather than waiting for a reload to notice.
   */
  onDeposited?: () => void;
}) {
  const [amount, setAmount] = useState("");
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
  const [period, setPeriod] = useState(defaultPeriod ? String(defaultPeriod) : "");
  const [source, setSource] = useState(defaultSource ?? "");
  const [token, setToken] = useState("");
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
  const maxMinor = selected?.minor ?? null;

  // Defaulted to the payroll contract this deployment runs, which is where the
  // money came from in every ordinary case. Editable, because an operator may be
  // depositing on behalf of an earlier instance.
  useEffect(() => {
    if (source) return;
    if (defaultSource) {
      setSource(defaultSource);
      return;
    }
    void loadDeployments().then((all) => {
      const payroll = all[`${networkId}/payroll`];
      if (payroll && !source) setSource(payroll.contractAddress);
    });
  }, [networkId, source, defaultSource]);

  // Only while the operator has not typed one. A month arriving from the page
  // above must not overwrite a period being entered by hand — the field would
  // then reset under the cursor every time the stepper re-read the chain.
  useEffect(() => {
    if (defaultPeriod && !period) setPeriod(String(defaultPeriod));
  }, [defaultPeriod, period]);

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
      const result = await runJob<{ txHash: string; ordinal: number }>(
        "/api/fund/deposit",
        { amount, from, target, period, source },
        setLog
      );
      if (result) {
        setDone(result);
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
  const Frame = bare ? "div" : "section";

  return (
    <Frame className={bare ? "fund-deposit" : "card"}>
      {bare ? null : (
        <>
          <h2>Send withholding to the national contracts</h2>
          <p className="lead-sm">
            The last hop. <code>remitTax</code> and <code>remitSocial</code> leave
            each period's withholding in the two treasury wallets; this moves it
            into the contracts that govern it. Contributions go to the benefit
            fund, which pays claims from them; tax goes to the vault, which
            records it per period and can only pay out to the authority frozen at
            its deploy.
          </p>
        </>
      )}

      <div className="actions" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
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
          style={{ minWidth: 150 }}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <label className="inline-check">
          <input
            type="checkbox"
            checked={topUp}
            disabled={working}
            onChange={(e) => setTopUp(e.target.checked)}
          />
          Top up from the platform wallet
        </label>
      </div>

      <p className="note" style={{ marginTop: 6 }}>
        Paying from <strong>{WALLET_LABEL[from]}</strong>.
        {topUp
          ? " A top-up is the platform covering the contract, not a period's withholding arriving — the deposit is still recorded against the period below."
          : " Each destination is paid by the treasury that was remitted for it, so the pairing is not a choice."}
      </p>

      <TreasuryBalances
        balances={balances}
        reading={reading}
        funding={funding}
        stranded={stranded}
        onCheck={() => void checkBalances()}
        onFund={() => void fundWithNight()}
        disabled={working}
      />

      <div
        className="actions"
        style={{ flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}
      >
        <input
          value={amount}
          disabled={working}
          // Minor units, NOT euros, and it used to say "Amount in EUR, e.g.
          // 3000". `parsePeurAmount` takes whole minor units and pEUR has six
          // decimals, so that example was an instruction to deposit €0.003 —
          // the label and the parser disagreed by a factor of a million. The
          // euro value is echoed under the field so the figure can be read
          // rather than counted.
          placeholder="Amount in minor units, e.g. 200200000"
          style={{ minWidth: 200 }}
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
              : `Deposit everything the ${WALLET_LABEL[from]} holds`
          }
          onClick={() => maxMinor && setAmount(maxMinor)}
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
            style={{ minWidth: 220 }}
            onChange={(e) => setToken(e.target.value)}
          />
        ) : null}
        <button
          type="button"
          className="primary"
          disabled={working || !amount.trim() || !period.trim() || !source.trim()}
          onClick={() => void deposit()}
        >
          {busy ? "Depositing…" : "Deposit"}
        </button>
      </div>

      <AmountEcho amount={amount} maxMinor={maxMinor} wallet={WALLET_LABEL[from]} />

      <input
        value={source}
        disabled={working}
        placeholder="Payroll contract these came from"
        style={{ marginTop: 8, width: "100%", fontFamily: "monospace", fontSize: 12 }}
        onChange={(e) => setSource(e.target.value)}
      />

      {authenticated === false ? (
        <p className="note">
          This service has no <code>PLATFORM_API_TOKEN</code> set, so it is not
          asking for one. That is only allowed on loopback — <code>config.ts</code>{" "}
          refuses to bind anywhere else without a token — so the guard is the
          machine rather than a secret. Nothing else changes: the treasury seeds
          still live only here, and only this service can spend them.
        </p>
      ) : null}

      <p className="note">
        The period and the payroll address are recorded on the receiving
        contract, so <code>contributedFor</code> and <code>receivedFor</code> can
        be compared against that period's totals on the payroll contract. Neither
        contract can verify the claim — one contract cannot read another's ledger
        — so a mismatch is publicly visible rather than refused.
      </p>

      <p className="note">
        The coin's nonce is written to the service's pool file before the
        transaction is sent, because that file is the only record of the fund's
        coins that exists anywhere — a coin the fund holds but cannot describe is
        a coin no claim can spend.
      </p>

      {log.length > 0 ? <pre className="log">{log.join("\n")}</pre> : null}
      {error ? <p className="status error">{error}</p> : null}
      {done ? (
        <p className="ok-line">
          ✓ Deposited — pool coin #{done.ordinal}, tx {done.txHash}
        </p>
      ) : null}
    </Frame>
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
 * The typed figure, in euros, beside what the wallet holds.
 *
 * Six decimals is enough digits that a mistyped amount is a factor of ten no
 * one sees. Echoing it as money is the cheapest possible check, and comparing
 * it against the balance catches the other half — an amount the wallet cannot
 * cover, which the service would otherwise refuse only after the operator had
 * waited for a sync.
 */
function AmountEcho({
  amount,
  maxMinor,
  wallet,
}: {
  amount: string;
  maxMinor: string | null;
  wallet: string;
}) {
  const trimmed = amount.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    return (
      <p className="note" style={{ marginTop: 4 }}>
        Whole minor units only — no decimal point, no separators.
      </p>
    );
  }

  const minor = BigInt(trimmed);
  const over = maxMinor !== null && minor > BigInt(maxMinor);
  return (
    <p className={over ? "status error" : "note"} style={{ marginTop: 4 }}>
      €{formatPeur(minor)}
      {over ? ` — more than the ${wallet} holds, so this would be refused.` : ""}
    </p>
  );
}
