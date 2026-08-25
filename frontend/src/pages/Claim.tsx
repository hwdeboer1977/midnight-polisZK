import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { findAttestations, type Attestation } from "../lib/attestations";
import { periodName } from "../generated/roster";
import { useWallet } from "../wallet/WalletContext";
import { ClaimForm } from "../components/ClaimForm";
import { BENEFIT_V1 } from "../generated/benefit-params";

/**
 * Claiming an entitlement without disclosing what it rests on.
 *
 * Note what this area deliberately is not: a role. Nobody is classified as
 * "unemployed" anywhere in this system, because a system that has to label you
 * before it can help you has already published the thing you most wanted kept
 * private. A claimant instead proves statements about records they hold, and
 * the fund learns only that the statements hold.
 *
 * Nothing here generates a proof, and the page says so plainly rather than
 * mocking up a "Claim verified ✓". It earns its place regardless: it is what
 * makes payroll the private data layer rather than the product. Someone can
 * later prove social-protection eligibility from an employment history that was
 * never published — which is a good deal more interesting than private payroll
 * on its own.
 */
type Check = {
  title: string;
  /** What the chain says for THIS wallet, or null while unknown. */
  found: string | null;
  /** True when the item is a statement about the system, not about you. */
  general?: boolean;
  pilot?: boolean;
  body: string;
};

/**
 * The four requirements, bound to the connected wallet where they can be.
 *
 * They used to be four fixed rows with ticks beside them, describing how the
 * system works — and a tick reads as "you have this". Someone scanning the
 * panel concluded they had already qualified. Now each row reports what was
 * actually found for this wallet, so the panel is a pre-flight check rather
 * than a description with misleading punctuation.
 */
function requirementsFor(rows: Attestation[] | null): Check[] {
  const ended = rows?.filter((row) => row.ended) ?? [];
  const employers = [...new Set(rows?.map((row) => row.employer) ?? [])];

  return [
    {
      title: "Accredited employer",
      found:
        rows === null
          ? null
          : employers.length > 0
            ? `${employers.join(", ")} — assigned on chain`
            : "",
      body: "The payroll contract naming you was deployed by the platform and assigned to a registered employer — provable today from the contract's own ledger.",
    },
    {
      title: `${BENEFIT_V1.minMonths} month${BENEFIT_V1.minMonths === 1 ? "" : "s"} employment`,
      // Not a per-wallet fact: the count lives inside the termination
      // commitment, so this page cannot read it. What it can do is refuse to
      // imply it has.
      found: null,
      general: true,
      pilot: true,
      body: `The published rule set requires ${BENEFIT_V1.minMonths} month${BENEFIT_V1.minMonths === 1 ? "" : "s"} — a PILOT figure, not the twelve the real scheme asks for. The claim circuit checks it against a count your employer signed into the termination attestation, not against the filings themselves. A fund contract cannot read a payroll contract's ledger, so it cannot do the counting; what it can do is refuse a claim whose attestation says fewer months. The count stays auditable afterwards, because the filings are public. This page cannot show you the number: it is committed, not published.`,
    },
    {
      title: "Contributions assessed",
      found:
        rows === null
          ? null
          : rows.length > 0
            ? `${rows.length} period${rows.length === 1 ? "" : "s"} filed for you`
            : "",
      body: "Each period's commitment binds the contribution withheld from your salary alongside the gross, so an opening proves the contribution was assessed. That it was remitted onward is a separate fact, and not one this system can show you.",
    },
    {
      title: "Termination attestation",
      found:
        rows === null
          ? null
          : ended.length > 0
            ? `found for ${ended.map((row) => periodName(row.period)).join(", ")}`
            : "",
      body: "Your employer signs one statement that employment ended, naming the final period — which is what stops anyone choosing their best month later. It is published as a commitment, so the statement is fixed before anyone acts on it while months worked and your claim key stay off chain. The employer cannot spend it: claiming needs your own wallet key.",
    },
  ];
}
export function Claim() {
  const { account, networkId } = useWallet();
  const [rows, setRows] = useState<Attestation[] | null>(null);

  // The same scan the Employee page runs, so the two pages cannot disagree
  // about which periods name this wallet.
  useEffect(() => {
    if (!account) {
      setRows(null);
      return;
    }
    let cancelled = false;
    void findAttestations(networkId, account.coinPublicKey)
      .then((scan) => {
        if (!cancelled) setRows(scan.rows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [account, networkId]);

  return (
    <>
      <section className="area-head">
        <h1>Unemployment benefit claim</h1>
        <p className="lede">
          Prove you qualify without revealing your salary history, employer or
          identity.
        </p>
      </section>

      <section className="card">
        <h2>{account ? "Your eligibility" : "Eligibility requirements"}</h2>
        {!account ? (
          <p className="note" style={{ marginTop: 0 }}>
            Connect your wallet and these become a check against what the chain
            actually holds for you, rather than a description of the rules.
          </p>
        ) : null}
        <ul className="reqs">
          {requirementsFor(account ? rows : null).map((req) => (
            <li
              key={req.title}
              className={req.found ? "req ready" : req.general ? "req" : "req"}
            >
              <span className="req-mark">
                {req.general ? "◐" : req.found ? "✓" : req.found === "" ? "○" : "·"}
              </span>
              <div>
                <strong>{req.title}</strong>
                {/* The pilot figure is the single easiest thing on this page to
                    misread as the real scheme, and it was the quietest of the
                    four. It is now the loudest. */}
                {req.pilot ? <span className="req-pilot">pilot figure — not 12</span> : null}
                <span className="req-status">
                  {req.general
                    ? "attested by your employer, not derived here"
                    : req.found === null
                      ? "connect a wallet to check"
                      : req.found === ""
                        ? "nothing found for this wallet"
                        : req.found}
                </span>
                <p className="note" style={{ margin: "4px 0 0" }}>
                  {req.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="note">
          None of the four discloses the figures behind it. That is the point of
          proving rather than showing: the fund checks the statements, not the
          history the statements were derived from.
        </p>
      </section>

      {/* Was a standing note that nothing here ran. The fund is deployed and
          funded, a rule set is published and the relay publishes trees, so the
          honest thing on this page is now the form rather than the apology. */}
      <ClaimForm />

      <p className="note">
        No claim yet? The evidence one consumes is already yours —{" "}
        <Link to="/employee">your employment attestations</Link> — and your
        claim key is derived on that page too.
      </p>

      <section className="card">
        <h2>What a claim reveals</h2>
        <div className="split">
          <div className="col public">
            <h4>Public</h4>
            <ul>
              <li>How many claims have settled</li>
              <li>How many payments the fund has taken in</li>
              <li>Which periods have a claim tree published</li>
              <li>One spent nullifier per claim, linked to nobody</li>
            </ul>
          </div>
          <div className="col private">
            <h4>Never published</h4>
            <ul>
              <li>The benefit amount</li>
              <li>Who the claimant is, or which employer they left</li>
              <li>The salary it was derived from</li>
              <li>The fund's balance</li>
            </ul>
          </div>
        </div>
        <p className="note">
          Counts, not amounts. The fund's balance is a shielded coin, so it is
          not published either — and that cuts against the usual claim that a
          public fund should be publicly solvent. Hiding what each claimant
          received also hides what the pool holds: the two cannot be separated
          here, because successive balances would give away the differences
          between them.
        </p>
        <p className="note">
          What that leaves is an operator who can audit their own fund and a
          public that cannot. Closing it honestly would mean publishing
          something the fund attests to rather than something it proves — a
          periodic signed balance, say — and that is a different claim from the
          ones above, so it is not made here.
        </p>
      </section>

      <details className="details">
        <summary>Technical architecture</summary>
        <p className="note">
          Payroll is the private data layer. Each period publishes one opaque
          commitment per employee and a hash of the payee's coin public key —
          enough for a worker's own wallet to recognise its periods, and not
          enough for anyone else to learn who was paid or how much.
        </p>
        <p className="note">
          The claim circuit takes one period's opening as a private input, proves
          membership of a Merkle tree the fund publishes per period — one tree
          across every accredited employer, so a claimant is indistinguishable
          from everyone terminated that month — and pays a benefit derived from
          that month's gross, capped and rated by a published rule set. The
          benefit is a shielded coin; what the chain records is that a claim
          happened.
        </p>
        <p className="note">
          All four now have an on-chain source. A period commits to gross, tax,
          contribution and net together, with the circuit rebuilding them from
          the gross and the published rule set, so an opening proves what was
          withheld. <code>endEmployment</code> records the employer's statement
          that employment ended, as a commitment. The fund is deployed and
          funded, a rule set is published, and the relay publishes a claim tree
          per period — so a proof has something to be checked against.
        </p>
        <p className="note">
          The benefit is withheld under the same tax rules your final month was
          filed under. The circuit checks that by hashing the schedule against
          the one bound into your own salary commitment, so a benefit cannot be
          taxed under rules nobody published — and it can no longer exceed the
          take-home pay it replaces, which it could before withholding existed.
        </p>
        <p className="note">
          The relay exists because contracts here cannot read each other. Public
          payroll state has to be carried across to the fund by someone, and
          that someone is trusted to carry it faithfully — a forged tree is not
          prevented, only attributable and publicly checkable, since everything
          in it is public payroll state anyone can rebuild. Publishing is open to
          anyone, so a relay that declines to publish cannot quietly block a
          claim.
        </p>
      </details>
    </>
  );
}
