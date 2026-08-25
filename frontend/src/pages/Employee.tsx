import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WalletPicker } from "../components/WalletPicker";
import { fetchContractState } from "../lib/chain";
import { decodePayrollLedger, loadContract } from "../lib/contracts";
import { CopyRow } from "../components/CopyRow";
import { ClaimKey } from "../components/ClaimKey";
import { FilePicker } from "../components/FilePicker";
import { formatPeur } from "../lib/format";
import {
  forNetwork,
  loadDeployments,
  type Deployment,
  type Deployments,
} from "../lib/deployments";
import { periodName } from "../generated/roster";
import { bytesToHex, keyToHex, sameKey } from "../lib/keys";
import { checkPayslip, type CheckedPayslip } from "../lib/checkPayslip";
import { useWallet } from "../wallet/WalletContext";

interface Attestation {
  period: number;
  slot: number;
  employer: string;
  contractAddress: string;
  paid: boolean;
  funded: boolean;
  /**
   * Whether the employer has attested that this was the final period.
   *
   * Public state — `terminationFor` has a key per terminated slot — so an
   * employee can learn from the chain that their employment ended, rather than
   * only from being told. What it commits to stays private: the months worked
   * and the claim-key hash are inside the commitment, not beside it.
   */
  ended: boolean;
  /** The commitment published for this slot — opaque without the opening. */
  commitment: string;
  /**
   * The other two public inputs to that commitment: who filed it, and under
   * which rule set. Captured here so a payslip can be checked without a second
   * pass over the chain — and public precisely so an employee can do it.
   */
  employerKey: Uint8Array;
  paramsHash: Uint8Array;
}

/**
 * The worker's own view: which periods name them, and what they were paid.
 *
 * This is the half of the system that makes the social-protection story more
 * than a slogan. The employee is not merely receiving money — they are
 * accumulating evidence of employment that they hold themselves, that no
 * employer can revoke, and that reveals nothing to anyone they do not show it
 * to.
 *
 * Every row is derived, never fetched from a server that could be lying:
 * `payeeFor` publishes a hash of the payee's coin public key, so the wallet
 * that holds the key can recognise its own slots and nobody else's. The amount
 * comes from the coin in the wallet, not from the chain — the chain never knew
 * it.
 */
export function Employee() {
  const { account, networkId, wallet } = useWallet();
  const [rows, setRows] = useState<Attestation[]>([]);
  /**
   * The instance this wallet is the EMPLOYER of, if any.
   *
   * Read in the same pass as the periods, because "no payroll found" has two
   * very different causes and only one of them is a problem. An employer's own
   * wallet matches no payee hash and never will — telling them to check their
   * keys sends them looking for a mistake that is not there.
   */
  const [employerOf, setEmployerOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [deployments, setDeployments] = useState<Deployments | null>(null);
  /** A payslip the employee has supplied, once it has been checked. */
  const [opened, setOpened] = useState<CheckedPayslip | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);


  /**
   * Opens one payslip against the chain.
   *
   * Works with or without a wallet. The commitment check is what makes the
   * figures trustworthy and needs nothing but the payslip and public state; a
   * connected wallet adds the separate question of whether the slot is bound to
   * the holder's key, reported as `mine`.
   */
  async function check(text: string) {
    setSlipError(null);
    try {
      setOpened(
        await checkPayslip({
          networkId,
          text,
          coinPublicKey: account?.coinPublicKey ?? null,
        })
      );
    } catch (cause) {
      setOpened(null);
      setSlipError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    if (!account) {
      setRows([]);
      setOpened(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const deployments = await loadDeployments();
        if (!cancelled) setDeployments(deployments);
        const payrolls = forNetwork(deployments, networkId).filter(
          ([, d]) => d.contractName === "payroll"
        );
        if (payrolls.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const contract = await loadContract("payroll");
        const module = contract as unknown as {
          pureCircuits: {
            payeeHash: (
              key: { bytes: Uint8Array },
              period: bigint,
              instance: Uint8Array
            ) => Uint8Array;
          };
        };

        // The same hash the circuit checks, computed with the contract's own
        // pure circuit rather than a TypeScript re-implementation that could
        // drift from the struct encoding Compact uses.
        //
        // Now bound to the period and the contract, so it is one value per slot
        // rather than one value per person — which is the point: equal hashes
        // across months no longer reveal that the same worker is behind them.
        // The cost is that this cannot be computed once up front.
        const myKey = fromHex(keyToHex(account.coinPublicKey));
        const bindingFor = (period: bigint, address: string) =>
          bytesToHex(
            module.pureCircuits.payeeHash(
              { bytes: myKey },
              period,
              fromHex(address.replace(/^0x/, ""))
            )
          );

        const found: Attestation[] = [];
        let employs: string | null = null;
        for (const [name, deployment] of payrolls) {
          const state = await fetchContractState(networkId, deployment.contractAddress);
          if (!state) continue;

          const ledger = decodePayrollLedger(contract, state.data);
          if (!ledger) continue;

          if (
            ledger.employerAssigned &&
            sameKey(bytesToHex(ledger.employer.bytes), account.coinPublicKey)
          ) {
            employs = employerLabel(name, deployment);
          }

          for (const period of [...ledger.periods]) {
            if (!ledger.payeeFor.member(period)) continue;
            const payees = ledger.payeeFor.lookup(period);
            const count = ledger.employeeCountFor.member(period)
              ? Number(ledger.employeeCountFor.lookup(period))
              : 0;

            for (let slot = 0; slot < count; slot += 1) {
              const key = BigInt(slot);
              if (!payees.member(key)) continue;
              if (
                bytesToHex(payees.lookup(key)) !==
                bindingFor(period, deployment.contractAddress)
              ) {
                continue;
              }

              found.push({
                period: Number(period),
                slot,
                employer: employerLabel(name, deployment),
                contractAddress: deployment.contractAddress,
                paid: ledger.paidFor.member(period) && ledger.paidFor.lookup(period).member(key)
                  ? ledger.paidFor.lookup(period).lookup(key)
                  : false,
                funded: ledger.fundedFor.member(period) && ledger.fundedFor.lookup(period).member(key)
                  ? ledger.fundedFor.lookup(period).lookup(key)
                  : false,
                commitment: ledger.commitmentsFor.member(period) &&
                  ledger.commitmentsFor.lookup(period).member(key)
                  ? bytesToHex(ledger.commitmentsFor.lookup(period).lookup(key))
                  : "",
                ended:
                  ledger.terminationFor?.member(period) === true &&
                  ledger.terminationFor.lookup(period).member(key),
                employerKey: ledger.employer.bytes,
                paramsHash: ledger.paramsHashFor.member(period)
                  ? ledger.paramsHashFor.lookup(period)
                  : new Uint8Array(32),
              });
            }
          }
        }

        found.sort((a, b) => b.period - a.period);
        if (!cancelled) {
          setRows(found);
          setEmployerOf(employs);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, networkId]);

  // Without a wallet the page is not empty, it is smaller. A payslip is its own
  // credential — nobody holds one but the employee it was issued to — so
  // reading what you were paid needs no extension installed and no account.
  // Connecting a wallet adds the two things a payslip genuinely cannot carry:
  // proof that the slot is bound to your key, and a spendable balance.
  if (!account) {
    return (
      <>
        <section className="area-head">
          <h1>Your income</h1>
          <p className="lede">
            Open the payslip your employer sent you — it is checked against what
            they published on chain, so the figures cannot have been changed
            after payday.
          </p>
        </section>

        <PayslipCheck
          onCheck={check}
          opened={opened}
          error={slipError}
          onClear={() => {
            setOpened(null);
            setSlipError(null);
          }}
        />

        <section className="callout">
          <h2>Connect your wallet for the rest</h2>
          <p className="note" style={{ marginTop: 0 }}>
            A payslip shows what you were paid. Your wallet shows what you can
            spend, and proves the period was filed for your key rather than
            simply claiming it. Nothing here can read a shielded balance on your
            behalf — that is what makes it private.
          </p>
          <WalletPicker />
        </section>
      </>
    );
  }

  const tokenId = deployments
    ? Object.values(deployments).find(
        (d) => d.contractName === "peur" && d.networkId === networkId
      )?.tokenId
    : undefined;
  const balance = tokenId
    ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))?.[1] ?? 0n
    : 0n;

  const paid = rows.filter((row) => row.paid);
  const walletName = wallet?.name || wallet?.rdns || null;

  return (
    <>
      <section className="area-head">
        <h1>Your income</h1>
        <p className="lede">
          Only you can see these figures. They are not hidden behind a login —
          they were never published.
        </p>
      </section>

      {error ? <p className="status error">{error}</p> : null}

      {/* Outside the wallet-dependent branches, because a payslip is readable in
          every state this page can be in — including the one that used to be a
          dead end: a wallet connected that no period names, which is exactly
          what an employer's own wallet looks like here. */}
      <PayslipCheck
        onCheck={check}
        opened={opened}
        error={slipError}
        onClear={() => {
          setOpened(null);
          setSlipError(null);
        }}
      />

      {loading ? (
        <p className="muted">Checking payroll contracts for periods that name you…</p>
      ) : rows.length === 0 ? (
        <>
          {/* Plain language first. Someone who cannot see their pay needs to
              know what to check, not how a commitment scheme works. */}
          <section className="card">
            <h2>
              {employerOf
                ? "This is an employer's wallet"
                : "No payroll found"}
            </h2>
            {employerOf ? (
              <>
                <p className="lead-sm" style={{ marginTop: 0 }}>
                  This wallet is the employer of{" "}
                  <strong>{employerOf}</strong>, so no period names it as a
                  payee — an employer files payroll, they are not on it. Nothing
                  is wrong.
                </p>
                <div className="actions">
                  <Link className="button" to="/employer">
                    Go to Employer
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="lead-sm" style={{ marginTop: 0 }}>
                  No payroll period on {networkId} names this wallet as a payee.
                  If your employer has already added you, the likeliest cause is
                  that a different wallet is connected than the one you sent
                  them — the keys below are the ones they need.
                </p>
                <div className="actions">
                  <button onClick={() => setShowKeys((open) => !open)}>
                    {showKeys ? "Hide my payroll keys" : "View my payroll keys"}
                  </button>
                </div>
              </>
            )}
          </section>

          {showKeys ? (
            <PayrollKeys account={account} wallet={walletName} />
          ) : null}

          <details className="details">
            <summary>Why can't I see my payroll?</summary>
            <p className="note">
              Your employer files a hash of your <strong>coin public key</strong>{" "}
              for each period, and this page finds your periods by recomputing
              that hash from the wallet you have connected. A different wallet,
              or a mistyped key, produces a different hash and matches nothing —
              which is what an empty list here usually means.
            </p>
            <p className="note">
              Your pay is sent as a shielded coin, and a coin can only be found
              by someone whose <strong>encryption public key</strong> the
              transaction was built with. If your employer filed the first key
              but not the second, the payment succeeded, the contract marked it
              paid, and your wallet can never see it. Both keys, every time.
            </p>
            <p className="note">
              Nothing about you is published, so there is nobody to ask on your
              behalf: send your employer both keys again and have them re-file
              the period.
            </p>
          </details>
        </>
      ) : (
        <>
          <section className="card headline">
            <div className="headline-value">€{formatPeur(balance)}</div>
            <div className="headline-label">
              pEUR in your wallet ·{" "}
              {paid.length === 1 ? "1 period" : `${paid.length} periods`} received
            </div>
            <p className="ok-line" style={{ margin: "10px 0 0" }}>
              ✓ Received privately
            </p>
          </section>

          {/* The one moment an employee has something to do. Termination is
              public per slot, so the page can say this rather than waiting for
              someone to tell them — and it is also when the claim key they
              chose earlier stops being hypothetical. */}
          {rows.some((row) => row.ended) ? (
            <section className="callout">
              <h2>Your employment ended — you can claim</h2>
              <p className="note" style={{ marginTop: 0 }}>
                An employer has attested on chain that{" "}
                {rows
                  .filter((row) => row.ended)
                  .map((row) => periodName(row.period))
                  .join(", ")}{" "}
                was a final period. Claiming proves you were employed long enough
                and what you earned, and discloses neither.
              </p>
              <p className="note">
                You will need three things: the <strong>claim bundle</strong>{" "}
                from the fund's relay, your <strong>payslip for that period</strong>,
                and the <strong>passphrase</strong> you used for your claim key
                below. All three, and this same wallet connected.
              </p>
              {/* This page cannot tell whether a claim has already been made.
                  The nullifier that records one is derived from the claimant's
                  secret claim key, so computing it needs the passphrase — which
                  is exactly what stops anyone else reading her claim history,
                  and what blinds this page too. Saying "you can claim" without
                  this reads as a promise the fund may refuse. */}
              <p className="note">
                Each period can be claimed once. This page cannot tell you
                whether you already have — checking would mean deriving your
                claim key, and nothing here holds your passphrase. That is the
                same reason nobody else can look up your claim history either. If
                you claim twice, the fund refuses the second one.
              </p>
              <div className="actions">
                <Link className="button" to="/claim">
                  Make a claim
                </Link>
              </div>
            </section>
          ) : null}

          <section className="card">
            <h2>Payroll periods</h2>
            <table className="roster">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Employer</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.contractAddress}-${row.period}-${row.slot}`}>
                    <td>{periodName(row.period)}</td>
                    <td className="muted">{row.employer}</td>
                    <td className="num">
                      {opened &&
                      opened.slip.period === row.period &&
                      opened.slip.slot === row.slot &&
                      opened.slip.contract.replace(/^0x/, "").toLowerCase() ===
                        row.contractAddress.replace(/^0x/, "").toLowerCase() ? (
                        <strong>{formatPeur(BigInt(opened.slip.net))}</strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {row.paid ? (
                        <span className="ok-line">✓ Received</span>
                      ) : row.funded ? (
                        <span className="muted">Awaiting payday</span>
                      ) : (
                        <span className="muted">Filed</span>
                      )}
                      {/* Alongside the payment status, not instead of it: a
                          final period is usually also a paid one, and replacing
                          the tick would lose the answer to the question this
                          column exists for. */}
                      {row.ended ? (
                        <div className="note" style={{ margin: "2px 0 0" }}>
                          final period
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              Each row is an employer's on-chain statement that a period names
              your key — evidence of employment you hold yourself, that no
              employer can withdraw and no observer can read.
            </p>
            {/* The sharpest thing an employee can lose, and nothing else on the
                page says it. The openings are sealed under the EMPLOYER's key,
                so recovering a payslip means asking a company you may no longer
                work for. */}
            <p className="problems" style={{ marginTop: 12 }}>
              Keep every payslip your employer sends you. They are the only copy
              you hold — the openings on chain are sealed under your employer's
              key, so only they can produce one again. Without the payslip for
              your final period you cannot make a claim at all.
            </p>
          </section>

          <section className="callout">
            <h2>Private by design</h2>
            <p className="note" style={{ marginTop: 0 }}>
              Your individual salary and payment history are visible to your
              wallet, but are not published on chain. What anyone else can see is
              that a period had a payee — never who, and never for how much.
            </p>
          </section>

          <details className="details">
            <summary>Why do I need a payslip to see the amount?</summary>
            <p className="note">
              Your employer publishes a commitment per period: a hash of the four
              amounts, the weeks worked and a secret nonce. It fixes the figures
              at filing time without revealing them, which is what keeps your
              salary off the chain — and also what stops this page from simply
              showing it to you.
            </p>
            <p className="note">
              The opening cannot be delivered on chain. Encrypting it to your
              encryption public key would produce something you could never
              open: the wallet connector exposes that key but no decrypt
              operation. Deriving a key from a wallet signature fails too — the
              connector signs non-deterministically, so the same message gives a
              different key each time. So the payslip travels to you directly,
              and the chain is what proves it genuine.
            </p>
            <p className="note">
              What that check gives you is stronger than a figure fetched from an
              employer's portal. The commitment was published before payday and
              cannot be moved, so an amount edited afterwards fails the hash.
              The slot is bound to your own wallet key, so a payslip issued to
              someone else will not match. And the circuit refused any coin whose
              value was not the committed net — so the amount shown is the amount
              that reached you.
            </p>
          </details>

          <details className="details">
            <summary>My payroll keys</summary>
            <PayrollKeys account={account} wallet={walletName} bare />
          </details>
        </>
      )}

      {/* Outside the payroll branch on purpose: this has to be done BEFORE an
          employer ends the employment, which is exactly when there may be no
          period filed for this wallet yet. Hiding it until payroll appears
          would hide it until it is too late to use. */}
      <ClaimKey coinPublicKey={account.coinPublicKey} />
    </>
  );
}

/**
 * Where an employee opens their own line.
 *
 * A file input and a paste box rather than one or the other, because a payslip
 * arrives as whichever the employer found easier to send. `decodePayslip`
 * accepts the file's JSON, the encoded blob, or a whole link, so neither route
 * asks the employee to know which of those they are holding.
 *
 * Nothing is uploaded and nothing is stored. The check runs here, against state
 * already fetched from the chain, with the contract's own pure circuit — no
 * transaction, no proof, no server that could be told to lie.
 */
function PayslipCheck({
  onCheck,
  opened,
  error,
  onClear,
}: {
  onCheck: (text: string) => Promise<void>;
  opened: CheckedPayslip | null;
  error: string | null;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function run(value: string) {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await onCheck(value);
    } finally {
      setBusy(false);
    }
  }

  if (opened) {
    const { slip, paid, funded, mine } = opened;
    const amounts: [string, bigint][] = [
      ["Gross", BigInt(slip.gross)],
      ["Income tax withheld", BigInt(slip.tax)],
      ["Social contribution", BigInt(slip.social)],
    ];
    return (
      <section className="callout">
        <h2>
          {periodName(slip.period)}
          {slip.employee ? ` — ${slip.employee}` : ""}
        </h2>
        <p className="ok-line" style={{ marginTop: 0 }}>
          ✓ Verified against the commitment your employer filed
        </p>
        {/* Three separate facts, kept separate on purpose. A payslip can be
            genuine and unpaid; it can be genuine and issued to someone else.
            Collapsing them into one tick would report the reassuring one. */}
        <p className={paid ? "ok-line" : "note"} style={{ margin: "4px 0 0" }}>
          {paid
            ? "✓ Paid — the chain records this slot as settled"
            : funded
              ? "· Funded, not yet paid"
              : "· Filed, not yet funded"}
        </p>
        {mine === null ? (
          <p className="note" style={{ margin: "4px 0 0" }}>
            · Connect your wallet to confirm this period was filed for your key
          </p>
        ) : mine ? (
          <p className="ok-line" style={{ margin: "4px 0 0" }}>
            ✓ Filed for the wallet you have connected
          </p>
        ) : (
          <p className="status error" style={{ margin: "8px 0 0" }}>
            This payslip is genuine, but the period was filed for a different
            wallet than the one connected — so the pay went somewhere else.
          </p>
        )}
        <table className="roster">
          <tbody>
            {amounts.map(([label, amount]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="num">{formatPeur(amount)} pEUR</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Net paid to you</strong>
              </td>
              <td className="num">
                <strong>{formatPeur(BigInt(slip.net))} pEUR</strong>
              </td>
            </tr>
            <tr>
              <td className="muted">Weeks worked</td>
              <td className="num muted">{slip.weeks}</td>
            </tr>
          </tbody>
        </table>
        <p className="note">
          These figures reproduce the hash published for this slot before payday.
          Your employer cannot have changed them afterwards, and the circuit
          refused to send any coin whose value was not the net shown here. None
          of this was checked by a server — it was recomputed in this page, from
          public state, with the contract's own circuit.
        </p>
        <button type="button" className="ghost" onClick={onClear}>
          Check another
        </button>
      </section>
    );
  }

  return (
    <section className="callout">
      <h2>Check your payslip</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Your employer sends you a payslip file. Open it here and this page will
        check it against what they published on chain — the amounts are not
        stored there, so this is the only way to see them, and the check is what
        makes them trustworthy.
      </p>

      {/* File only. The paste box is gone; the link route it also served is
          not — a payslip link carries the slip in its fragment, so opening one
          checks it on arrival without touching this control. */}
      <FilePicker
        label={busy ? "Checking…" : "Choose your payslip…"}
        accept="application/json,.json,.txt"
        disabled={busy}
        onFile={async (file) => run(await file.text())}
      />

      {error ? <p className="status error">{error}</p> : null}
    </section>
  );
}

/**
 * The two public keys an employer needs, and whose they are.
 *
 * Naming the wallet matters more than it looks. Someone can arrive here as an
 * employer, see a panel headed "My payroll keys", and reasonably wonder whose
 * keys they are being shown — the answer is always "the connected wallet's",
 * but a heading in the first person does not say that.
 */
function PayrollKeys({
  account,
  wallet,
  bare,
}: {
  account: { coinPublicKey: string; encryptionPublicKey: string };
  wallet?: string | null;
  bare?: boolean;
}) {
  const rows = (
    <>
      <p className="note" style={{ marginTop: 0 }}>
        These are the keys of the connected wallet
        {wallet ? ` (${wallet})` : ""}. Anyone connecting a different wallet sees
        that wallet's keys here instead.
      </p>
      <CopyRow label="Coin public key" value={account.coinPublicKey} />
      <CopyRow label="Encryption public key" value={account.encryptionPublicKey} />
      <p className="note">
        Send your employer both. Neither is a secret and neither lets anyone
        spend your pay — the first identifies you, the second is what your coin
        is encrypted to. With only the first, a payment is made that you can
        never see.
      </p>
      {/* Two sections on this page emit a long opaque value and they are not
          interchangeable. Saying so here is cheaper than the failure: a claim
          key hash pasted where a coin public key belongs matches no slot, and a
          coin public key pasted into a termination anchors something the
          employee cannot open. */}
      <p className="note">
        <strong>These are your wallet keys, for the roster.</strong> They are
        not your claim key — that one is derived from a passphrase further down
        this page, and it is what a future benefit claim needs.
      </p>
    </>
  );
  return bare ? (
    rows
  ) : (
    <section className="callout">
      <h2>My payroll keys</h2>
      {rows}
    </section>
  );
}

function employerLabel(name: string, deployment: Deployment): string {
  return (
    deployment.instance ??
    name.replace(/^.*payroll:?/, "") ??
    deployment.contractAddress.slice(0, 10)
  );
}

function fromHex(value: string): Uint8Array {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
