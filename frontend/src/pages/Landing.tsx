import { Link } from "react-router-dom";

// Drop the URL in here to surface the demo link under the hero; empty
// renders nothing rather than a dead play button.
const DEMO_VIDEO_URL = "";

/**
 * The entry page. Deliberately explains the privacy model before asking anyone
 * to connect a wallet — "what does this publish about my staff?" is the first
 * question a payroll product has to answer.
 */
export function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        {/* The wordmark and the positioning line are one lockup here, so the
            masthead drops its copy on this route rather than saying it twice. */}
        <h1 className="brand">
          IncomeLayer<span className="zk">ZK</span>
        </h1>
        <p className="tagline">
          Private payroll and social protection on Midnight
        </p>
        <p className="lede">
          Run payroll, withhold tax, pool contributions, and pay unemployment
          benefits — with every individual figure sealed and every aggregate
          provably correct.
        </p>
        {/* Understanding before commitment: a jury reads what the system does
            before it is asked to connect a wallet, so the explainer leads. */}
        <div className="cta">
          <a className="button" href="#how-it-works">
            How it works
          </a>
          <Link className="button secondary" to="/app">
            Launch app
          </Link>
        </div>
        {DEMO_VIDEO_URL ? (
          <p className="demo-link">
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer noopener">
              ▶ Watch the two-minute demo
            </a>
          </p>
        ) : null}
      </section>

      {/* The two diagrams carry the argument better than prose does: one shows a
          payroll period, one shows what a claim against it discloses. */}
      <section className="usecase" id="how-it-works">
        <div className="usecase-text">
          <h2>A payroll period</h2>
          <p>
            Every row — the employee, their gross, their income tax, their social
            insurance contribution, their net pay — is sealed on the employer's
            machine. What the chain gets is the headcount and four column totals,
            provably consistent with the rows behind them.
          </p>
          <p className="note">
            Each employee is paid their net as a shielded coin: the transfer settles
            on chain, the amount never appears.
          </p>
        </div>
        <figure className="figure">
          <img
            src="/payroll-privacy.svg"
            alt="A payroll period for ten employees. Each employee's gross, income tax, social insurance contribution and net pay is sealed; only the headcount and the four column totals are public on chain."
          />
        </figure>
      </section>

      <section className="usecase reverse">
        <div className="usecase-text">
          <h2>A claim against it</h2>
          <p>
            Twenty-four sealed monthly attestations go into a zero-knowledge proof.
            The fund learns one thing: the claim is valid. Not the salary history it
            was derived from, not the benefit amount, not the duration, not who the
            claimant is.
          </p>
          <p className="note">
            Only the pooled figures are public — contributions in, benefits out,
            balance. Anyone can check the fund is solvent; no one can recover an
            individual from it.
          </p>
        </div>
        <figure className="figure">
          <img
            src="/insurance-claim.svg"
            alt="An unemployment claim. Sealed monthly salary attestations feed a zero-knowledge proof; the fund learns only that the claim is valid, while the benefit amount and duration stay sealed and only pooled fund totals are public."
          />
        </figure>
      </section>

      <section className="explain">
        <h2>What actually reaches the chain</h2>
        <div className="split">
          <div className="col public">
            <h4>Public</h4>
            <ul>
              <li>Number of employees</li>
              <li>Total monthly payroll</li>
              <li>One opaque commitment per employee</li>
              <li>Who the employer is (a public key)</li>
              <li>Total pEUR in circulation</li>
            </ul>
          </div>
          <div className="col private">
            <h4>Never published</h4>
            <ul>
              <li>Any individual salary</li>
              <li>Employee names and addresses</li>
              <li>Who holds how much pEUR</li>
              <li>What any single payment was worth</li>
            </ul>
          </div>
        </div>
        <p className="note">
          The whole roster is submitted in one transaction on purpose. Paying people
          one at a time would move the public total by exactly one salary each time,
          and anyone watching blocks could read every amount off the differences.
        </p>
      </section>
    </div>
  );
}
