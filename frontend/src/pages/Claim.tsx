import { Link } from "react-router-dom";

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
    title: "12 months employment",
    status: "missing" as const,
    body: "Twelve periods on chain whose payee hash matches your key. Your attestations already carry this; counting them inside a circuit does not exist yet.",
  },
  {
    title: "Contributions paid",
    status: "missing" as const,
    body: "Needs a contribution to exist. The payroll contract commits to one figure per employee — the gross salary — with no contribution component to check against.",
  },
  {
    title: "Termination attestation",
    status: "missing" as const,
    body: "Needs an employer-signed statement that employment ended. Nothing in the contract records an ending; a period simply stops appearing.",
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
              <span className="req-mark">{req.status === "available" ? "✓" : "○"}</span>
              <div>
                <strong>{req.title}</strong>
                <span className="req-status">
                  {req.status === "available" ? "available" : "not implemented"}
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

      <section className="card pending">
        <h2>Claim proof not yet implemented</h2>
        <p className="note" style={{ marginTop: 0 }}>
          There is no claim circuit and no social-protection fund on this
          network, so there is nothing to prove against and nothing to pay a
          benefit from. What exists today is the first requirement, and the
          evidence the second would consume —{" "}
          <Link to="/employee">your employment attestations</Link>.
        </p>
      </section>

      <section className="card">
        <h2>What a claim reveals</h2>
        <div className="split">
          <div className="col public">
            <h4>Public</h4>
            <ul>
              <li>Contributions received by the fund, in total</li>
              <li>Benefits paid by the fund, in total</li>
              <li>The fund's balance</li>
              <li>How many claims have settled</li>
            </ul>
          </div>
          <div className="col private">
            <h4>Never published</h4>
            <ul>
              <li>The benefit amount</li>
              <li>Its duration</li>
              <li>Who the claimant is</li>
              <li>The salary history it was derived from</li>
            </ul>
          </div>
        </div>
        <p className="note">
          Solvency stays checkable by anyone; no individual is recoverable from
          the figures that make it checkable.
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
          A claim circuit would take those periods as private inputs and output a
          single boolean: the four requirements hold. The fund contract would
          pool contributions, hold a shielded balance, and pay a benefit as a
          shielded coin, publishing only the four pooled totals above.
        </p>
        <p className="note">
          Three of the four requirements have no on-chain source yet.
          Contributions and terminations are not recorded at all, and employment
          length is countable only because attestations already are. The first
          contract change that unblocks this is the payroll breakdown — a period
          committing to gross, tax, contribution and net separately, with the
          circuit asserting they sum.
        </p>
      </details>
    </>
  );
}
