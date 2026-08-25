import { Link } from "react-router-dom";
import { ClaimForm } from "../components/ClaimForm";

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
const REQUIREMENTS = [
  {
    title: "Accredited employer",
    status: "available" as const,
    body: "The payroll contract naming you was deployed by the platform and assigned to a registered employer — provable today from the contract's own ledger.",
  },
  {
    // Neither available nor missing, and saying either would be wrong. The
    // check runs — `claim` asserts months worked against the published minimum
    // — but the number it checks is one the employer asserted, not one derived
    // from the twelve filings. The fund cannot read a payroll ledger, so it
    // cannot count them for itself; that is the same wall that shapes
    // everything else here, and it is a real limit rather than an unfinished
    // edge.
    title: "12 months employment",
    status: "partial" as const,
    body: "The claim circuit checks it, against a count your employer signed into the termination attestation — not against the twelve filings themselves. A fund contract cannot read a payroll contract's ledger, so it cannot do the counting; what it can do is refuse a claim whose attestation says fewer months. The count stays auditable afterwards, because the filings are public.",
  },
  {
    // "Assessed", not "paid", and the distinction is not pedantry: it is the
    // strongest claim the evidence supports. A commitment binds what was
    // WITHHELD from a salary. Whether it then reached a treasury is a shielded
    // transfer to a key nothing here can observe — `remitSocial` sends to
    // `socialTreasury`, and a fund contract cannot see that any more than it
    // can read another contract's ledger. Writing "paid" would be the one word
    // in this list a careful reviewer tests first.
    title: "Contributions assessed",
    status: "available" as const,
    body: "Each period's commitment binds the contribution withheld from your salary alongside the gross, so twelve openings prove twelve months of contributions were assessed. That they were remitted onward is a separate fact, and not one this system can show you.",
  },
  {
    title: "Termination attestation",
    status: "available" as const,
    body: "Your employer signs one statement that employment ended, naming the final period — which is what stops anyone choosing their best month later. It is published as a commitment, so the statement is fixed before anyone acts on it while months worked and your claim key stay off chain. The employer cannot spend it: claiming needs your own wallet key.",
  },
];

export function Claim() {
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
        <h2>Eligibility requirements</h2>
        <ul className="reqs">
          {REQUIREMENTS.map((req) => (
            <li key={req.title} className={req.status === "available" ? "req ready" : "req"}>
              <span className="req-mark">
                {req.status === "available" ? "✓" : req.status === "partial" ? "◐" : "○"}
              </span>
              <div>
                <strong>{req.title}</strong>
                <span className="req-status">
                  {req.status === "available"
                    ? "available"
                    : req.status === "partial"
                      ? "attested, not derived"
                      : "not implemented"}
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
          Three of the four requirements now have an on-chain source. A period
          commits to gross, tax, contribution and net together, with the circuit
          rebuilding them from the gross and the published rule set, so an
          opening proves what was withheld. `endEmployment` records the
          employer's statement that employment ended, as a commitment. What is
          left is deployment: a fund holding money, and a relay publishing the
          claim tree that a proof is checked against.
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
