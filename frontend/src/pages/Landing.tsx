import { Link } from "react-router-dom";

/**
 * The entry page. Deliberately explains the privacy model before asking anyone
 * to connect a wallet — "what does this publish about my staff?" is the first
 * question a payroll product has to answer.
 */
export function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <h1>
          Payroll that keeps salaries <span className="zk">private</span>
        </h1>
        <p className="lede">
          Run payroll on Midnight without publishing what anyone earns. The chain
          learns the headcount and the total — never an individual salary, never a
          name, never an address.
        </p>
        <div className="cta">
          <Link className="button" to="/register">
            Register as an employer
          </Link>
          <Link className="button secondary" to="/app">
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="steps">
        <article>
          <div className="step-n">1</div>
          <h3>Register</h3>
          <p>
            Connect your own wallet. It generates your keys — we never see a private
            key, which is what makes the next step meaningful.
          </p>
        </article>
        <article>
          <div className="step-n">2</div>
          <h3>Get your contract</h3>
          <p>
            You are assigned your own payroll contract, once and permanently. After
            that not even the platform can write to it or take it back.
          </p>
        </article>
        <article>
          <div className="step-n">3</div>
          <h3>Upload your roster</h3>
          <p>
            A spreadsheet of names, addresses and salaries — parsed on your machine.
            Only the salaries enter the proof, and only their sum is published.
          </p>
        </article>
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
