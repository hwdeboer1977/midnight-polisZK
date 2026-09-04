// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WalletPicker } from "../components/WalletPicker";
import { findAttestations, type Attestation } from "../lib/attestations";
import { CopyRow } from "../components/CopyRow";
import { FilePicker } from "../components/FilePicker";
import { formatPeur, formatPeurTile } from "../lib/format";
import {
  loadDeployments,
  type Deployment,
  type Deployments,
} from "../lib/deployments";
import { periodName } from "../generated/roster";
import { bytesToHex } from "../lib/keys";
import { checkPayslip, type CheckedPayslip } from "../lib/checkPayslip";
import { useWallet } from "../wallet/WalletContext";


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

        const scan = await findAttestations(networkId, account.coinPublicKey);
        if (!cancelled) {
          setRows(scan.rows);
          setEmployerOf(scan.employerOf);
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
          <h1>Your salary</h1>
          <p className="lede">
            Your salary details stay private. They are not published on chain and
            can only be seen from your payslip.
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

  /** Whether naming the contract per row distinguishes anything. */
  const manyEmployers = new Set(rows.map((row) => row.employer)).size > 1;
  const walletName = wallet?.name || wallet?.rdns || null;

  return (
    <>
      <section className="area-head">
        <h1>Your salary</h1>
        <p className="lede">
          Your salary details stay private. Only you can see these figures — they
          are not hidden behind a login, they were never published.
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
          {employerOf ? (
            /* A state, not a finding. This was a full card competing with the
               payslip action above it — but "you are on the wrong side of the
               product" is one line, and the interesting half of it is WHY an
               employer's own wallet cannot see its employees' pay. That is the
               privacy model working, so it folds open rather than being told. */
            <div className="role-notice">
              <div className="role-notice-head">
                <strong>Employer wallet connected</strong>
                <Link className="button secondary compact" to="/employer">
                  Go to Employer →
                </Link>
              </div>
              <p className="note" style={{ margin: 0 }}>
                This wallet holds no private salary records of its own.
              </p>
              <details className="why">
                <summary>Why can't this wallet see employee salaries?</summary>
                <p className="note">
                  Because nothing on chain holds them. Filing a month publishes
                  one opaque commitment per employee and four column totals — the
                  figures behind them stay on the machine that filed them and
                  reach each employee in a payslip. An employer can re-open their
                  own copy from the workbook; the chain cannot, and neither can
                  this page.
                </p>
                <p className="note">
                  So this is not a permission check that happens to fail. There
                  is no record here to be refused access to.
                </p>
              </details>
            </div>
          ) : (
          <section className="card">
            <h2>No payroll found</h2>
            <p className="lead-sm" style={{ marginTop: 0 }}>
              No payroll period on {networkId} names this wallet as a payee. If
              your employer has already added you, the likeliest cause is that a
              different wallet is connected than the one you sent them — the keys
              below are the ones they need.
            </p>
            <div className="actions">
              <button onClick={() => setShowKeys((open) => !open)}>
                {showKeys ? "Hide my payroll keys" : "View my payroll keys"}
              </button>
            </div>

            {/* Inside the panel that raises the question. It used to sit below
                every other card on the page, which is the one place someone
                asking "why can't I see my payroll" will not look. */}
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
          </section>
          )}

          {showKeys && !employerOf ? (
            <PayrollKeys account={account} wallet={walletName} />
          ) : null}
        </>
      ) : (
        <>
          <section className="card headline">
            <div className="headline-value" title={`Exactly €${formatPeur(balance)}`}>
              €{formatPeurTile(balance)}
            </div>
            {/* This is the WALLET's pEUR balance, not a sum of salaries: the
                same wallet can hold a faucet claim or any other transfer, so
                "from 1 payroll period received" claimed an origin the figure
                does not have. How many periods were paid is a separate fact,
                and Salary history below lists them.

                Naming it still matters — a payslip reading €134.75 above a
                figure of €1,016.40 invites exactly one question, and "pEUR in
                your wallet" answered it only if you already knew the difference
                between a month's pay and a running balance. */}
            <div className="headline-label">Payroll wallet balance</div>
            <div className="headline-sub">pEUR this wallet can spend</div>
            <p className="ok-line" style={{ margin: "10px 0 0" }}>
              ✓ Received privately
            </p>
          </section>

          {/* Termination is public per slot, so this page can say so rather
              than waiting for someone to be told — but what to DO about it now
              lives on the benefit tab, along with the claim key, the status
              check and the form. One link beats a second copy that drifts. */}
          {rows.some((row) => row.ended) ? (
            // Amber, not lavender. Lavender on this page means "your private
            // financial information"; this is a state transition with something
            // to do about it, and giving it the salary card's treatment made a
            // life event look like one more row of pay data. Amber says
            // attention without implying anything went wrong.
            <section className="card event-card">
              <h2>
                <span className="pill warn">Employment ended</span>
              </h2>
              <p className="lead-sm" style={{ margin: "0 0 12px" }}>
                {rows
                  .filter((row) => row.ended)
                  .map((row) => periodName(row.period))
                  .join(", ")}{" "}
                was attested on chain as your final period. You may be eligible
                for an unemployment benefit.
              </p>
              <div className="actions">
                {/* "Check", not "Go to": nobody knows yet whether they
                    qualify, and a button that assumes the answer is a button
                    that disappoints. */}
                <Link className="button" to="/employee/benefit">
                  Check unemployment benefit →
                </Link>
              </div>
            </section>
          ) : null}

          <section className="card">
            <h2 className="section-title accent">Salary history</h2>
            <table className="roster periods">
              <thead>
                <tr>
                  <th>Period</th>
                  {/* Only when it tells the reader something. Most people work
                      for one employer, and a column repeating the same name
                      down every row is a column that costs width and answers
                      nothing. It returns the moment there are two. */}
                  {manyEmployers ? <th>Employer</th> : null}
                  <th>Net salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.contractAddress}-${row.period}-${row.slot}`}>
                    <td>{periodName(row.period)}</td>
                    {manyEmployers ? <td className="muted">{row.employer}</td> : null}
                    <td className="num">
                      {opened &&
                      opened.slip.period === row.period &&
                      opened.slip.slot === row.slot &&
                      opened.slip.contract.replace(/^0x/, "").toLowerCase() ===
                        row.contractAddress.replace(/^0x/, "").toLowerCase() ? (
                        <strong>{formatPeur(BigInt(opened.slip.net))}</strong>
                      ) : (
                        // Not an em-dash. A blank money column on a page whose
                        // point is that amounts stay private reads as broken
                        // data; "sealed" says the emptiness is the design.
                        <span className="muted">sealed</span>
                      )}
                    </td>
                    <td>
                      {row.paid ? (
                        <span className="pill ok">✓ Received</span>
                      ) : row.funded ? (
                        <span className="pill info">Awaiting payday</span>
                      ) : (
                        <span className="pill neutral">Filed</span>
                      )}
                      {/* Alongside the payment status, not instead of it: a
                          final period is usually also a paid one, and replacing
                          the tick would lose the answer to the question this
                          column exists for. */}
                      {row.ended ? (
                        <div className="note" style={{ margin: "3px 0 0" }}>
                          final period
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              Each period is recorded on chain; the amount can only be opened
              with your payslip.
            </p>
            <details className="why">
              <summary>How salary privacy works</summary>
              <p className="note">
                Each row is an employer's on-chain statement that a period names
                your key — evidence of employment you hold yourself, that no
                employer can withdraw and no observer can read.
              </p>
            {/* ⚠️ This used to end "without the payslip for your final period
                you cannot make a claim at all", which was simply not true —
                `PayslipRecovery` regenerates any payslip from the openings on
                chain, and the employer has had that button the whole time.
                It was the scariest sentence on the page and it described a
                dead end that does not exist.

                What IS true is milder and worth saying plainly: the openings
                are sealed under the EMPLOYER's key, so the copy you hold is
                the only one YOU can open, and replacing it means asking a
                company you may no longer work for. That is a favour, not a
                cliff — and it is the argument for sealing a second copy to the
                employee's own encryption key, which the roster already
                collects. */}
              <p className="note">
                Keep the payslips your employer sends you. They are the only copy
                you can open yourself — the openings on chain are sealed under
                your employer's key. If you lose one, your employer can produce
                it again from the chain, so a lost payslip is a request to make,
                not a claim you forfeit.
              </p>
            </details>
          </section>

          {/* Quiet. It was a lavender panel the size of the salary card,
              which spent the page's strongest colour on the one block carrying
              no figures — and left lavender meaning both "your money" and "a
              note about privacy". */}
          {/* One privacy line, not four. The page already says it in the lede,
              on the balance card and beside every opened payslip; a fourth
              telling turns the claim into a refrain. What survives is the
              sentence that states the architecture. */}
          <p className="privacy-note">
            <span aria-hidden="true">🛡</span>
            <span>
              <strong>Your salary is not public.</strong> The chain records that
              payroll happened, not how much you earned.
            </span>
          </p>

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
      <section className="callout payslip-detail">
        <h2>
          {periodName(slip.period)}
          {slip.employee ? ` — ${slip.employee}` : ""}
        </h2>
        <p className="ok-line" style={{ marginTop: 0 }}>
          ✓ Matches the payroll commitment your employer filed on chain
        </p>
        {/* The two facts a judge — and an employee — should not have to infer
            from an absence. Nothing on this page could show them; that is the
            point, and saying so is the only way the point lands. */}
        <p className="ok-line" style={{ margin: "4px 0 0" }}>
          ✓ The amounts above were never published
        </p>
        <p className="ok-line" style={{ margin: "4px 0 0" }}>
          ✓ Your identity was never published
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
        {/* Gross and the two deductions are what the net is made of; the net
            is what actually arrived. A four-row table of equal weight made an
            employee read all four to find the one they came for. */}
        <table className="roster amounts">
          <tbody>
            {amounts.map(([label, amount]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="num">{formatPeur(amount)} pEUR</td>
              </tr>
            ))}
            <tr className="net-row">
              <td>Net paid to you</td>
              <td className="num">{formatPeur(BigInt(slip.net))} pEUR</td>
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
    <section className="callout payslip-open">
      {/* "Check your payslip" named the machinery. Verification is what this
          page does with the file, not what an employee came to do — they came
          to see what they were paid, and the check happens on the way. */}
      <h2>View your payslip</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Open your private payslip and verify it against your employer's on-chain
        filing.
      </p>

      {/* File only. The paste box is gone; the link route it also served is
          not — a payslip link carries the slip in its fragment, so opening one
          checks it on arrival without touching this control. */}
      <FilePicker
        label={busy ? "Opening…" : "Open payslip"}
        accept="application/json,.json,.txt"
        disabled={busy}
        onFile={async (file) => run(await file.text())}
      />

      {error ? <p className="status error">{error}</p> : null}
    </section>
  );
}

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
        not your claim key — that one is a file you create further down this
        page, and it is what a future benefit claim needs.
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
