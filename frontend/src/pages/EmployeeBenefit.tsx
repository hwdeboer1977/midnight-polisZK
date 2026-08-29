import { Link } from "react-router-dom";
import { periodName } from "../generated/roster";
import { useWallet } from "../wallet/WalletContext";
import { ClaimForm } from "../components/ClaimForm";
import { ClaimKey } from "../components/ClaimKey";
import { ClaimStatus } from "../components/ClaimStatus";
import { WalletPicker } from "../components/WalletPicker";
import { useAttestations } from "../lib/useAttestations";
import { type Attestation } from "../lib/attestations";
import { BENEFIT_V1, PILOT_DURATION_MONTHS } from "../generated/benefit-params";

/**
 * Everything about the unemployment benefit, in one place.
 *
 * This was a top-level "Claim" area beside Public, Employer and Employee, and
 * the claim key lived on Employee while the claim itself lived here. That split
 * made the one ordering requirement in the whole system easy to miss: the key
 * has to exist before the employer files a write-once termination, and the page
 * that told you so was not the page you went to when you were dismissed.
 *
 * It is a sub-tab of Employee now for a second reason too. A claimant is an
 * employee — the same wallet, the same records, a different question asked of
 * them. A separate top-level area implied a separate role, and the one role
 * this system refuses to create is "unemployed": nobody is classified anywhere,
 * because a system that must label you before it can help you has already
 * published the thing you most wanted kept private. Claiming is something you
 * do, not something you are, and the navigation should not say otherwise.
 */
type Check = {
  title: string;
  /** What the chain says for THIS wallet, or null while unknown. */
  found: string | null;
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
      // Ticks once there is employment to attest to. The count itself lives
      // inside the termination commitment and cannot be read here — but a
      // half-mark read as "unmet", which is worse than the imprecision it was
      // guarding against. The badge and the status line carry the distinction
      // that matters: attested by an employer, not derived by the fund.
      found:
        rows === null
          ? null
          : rows.length > 0
            ? "attested in your termination — the circuit checks it"
            : "",
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
export function EmployeeBenefit() {
  const { account, networkId } = useWallet();
  const { rows, employerOf, ended, finalPeriod, loading, error } = useAttestations();

  if (!account) {
    return (
      <>
        <section className="area-head">
          <h1>Unemployment benefit</h1>
          <p className="lede">
            Prove you qualify without revealing your salary history, employer or
            identity.
          </p>
        </section>

        <section className="callout">
          <h2>Connect your wallet</h2>
          <p className="note" style={{ marginTop: 0 }}>
            A claim must be signed by the wallet your employer filed as payee,
            and everything below is a check against what the chain holds for
            that wallet rather than a description of the rules.
          </p>
          <WalletPicker />
        </section>

        <Eligibility rows={null} />
      </>
    );
  }

  return (
    <>
      <section className="area-head">
        <h1>Unemployment benefit</h1>
        <p className="lede">
          Prove you qualify without revealing your salary history, employer or
          identity.
        </p>
      </section>

      {error ? <p className="status error">{error}</p> : null}

      {/* Ordered by what this wallet needs next.

          While employed, the claim key comes first: it is the only thing here
          with a closing window, since the employer writes the hash into a
          write-once termination and an employee who reaches their last day
          without one can never claim.

          Once employment has ended that reverses. The key is already anchored
          or already lost, and what a claimant needs now is to claim. */}
      {/* `registered` is optimistic while the scan runs: "not on a payroll yet"
          is the wrong thing to show someone who is, and it would appear and
          then correct itself on every visit. Wrong in the harmless direction. */}
      {ended ? null : (
        <ClaimKey
          coinPublicKey={account.coinPublicKey}
          employerOf={employerOf}
          registered={loading || rows.length > 0}
        />
      )}

      {ended ? (
        <section className="callout outcome">
          {/* The result first, and named as a result. "Your employment ended —
              you can claim" leads with the loss and buries the entitlement in a
              subclause; what someone opening this page wants is the answer. */}
          <h2>You're eligible for unemployment benefit</h2>
          <p className="outcome-figure">
            <strong>{PILOT_DURATION_MONTHS}</strong> monthly payments available
          </p>
          <p className="lead-sm" style={{ margin: "0 0 12px" }}>
            {rows
              .filter((row) => row.ended)
              .map((row) => periodName(row.period))
              .join(", ")}{" "}
            was attested on chain as your final employment period.
          </p>
          {/* "You will need three things for each" read as "upload all three
              every month", which would be alarming: two of the three cannot be
              obtained again. Verified against the contract — the nullifier is
              `hash(claimKey, window, fund)`, so what changes month to month is
              the WINDOW and nothing else. The files are collected once. */}
          <p className="note" style={{ marginTop: 0 }}>
            Each payment is a separate claim against a different month, made
            with the <em>same</em> three files every time. You collect them once:
          </p>
          <ul className="needs">
            <li>
              <strong>Your claim bundle</strong> — from the fund's relay
            </li>
            <li>
              <strong>Your payslip for that period</strong> — from your employer
            </li>
            <li>
              <strong>Your claim-key file</strong> — the one you downloaded when
              you set up your claim key, with this same wallet connected
            </li>
          </ul>
        </section>
      ) : null}

      {ended ? (
        <ClaimStatus networkId={networkId} finalPeriod={finalPeriod ?? 0} />
      ) : null}

      {ended ? <ClaimKey coinPublicKey={account.coinPublicKey} employerOf={employerOf} ended /> : null}

      <Eligibility rows={rows} />

      {/* Was a standing note that nothing here ran. The fund is deployed and
          funded, a rule set is published and the relay publishes trees, so the
          honest thing on this page is now the form rather than the apology. */}
      <ClaimForm />

      <p className="note">
        The evidence a claim consumes is already yours —{" "}
        <Link to="/employee">your salary records</Link> carry the payslip it
        opens.
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

/** The four requirements, as a panel that works with or without a wallet. */
function Eligibility({ rows }: { rows: Attestation[] | null }) {
  return (
    <section className="card">
      <h2>{rows ? "Your eligibility" : "Eligibility requirements"}</h2>
      {!rows ? (
        <p className="note" style={{ marginTop: 0 }}>
          Connect your wallet and these become a check against what the chain
          actually holds for you, rather than a description of the rules.
        </p>
      ) : null}
      <ul className="reqs">
        {requirementsFor(rows).map((req) => (
          <li key={req.title} className={req.found ? "req ready" : "req"}>
            <span className="req-mark">
              {req.found ? "\u2713" : req.found === "" ? "\u25cb" : "\u00b7"}
            </span>
            <div>
              <strong>{req.title}</strong>
              {/* The pilot figure is the single easiest thing on this page to
                  misread as the real scheme, and it was the quietest of the
                  four. It is now the loudest. */}
              {req.pilot ? <span className="req-pilot">pilot figure — not 12</span> : null}
              <span className="req-status">
                {req.found === null
                  ? "connect a wallet to check"
                  : req.found === ""
                    ? "nothing found for this wallet"
                    : req.found}
              </span>
              {/* The mechanics, folded. Four requirements each followed by a
                  paragraph of circuit explanation made the page read as a
                  specification — and the thing an employee needs from this
                  panel is four ticks. */}
              <details className="details req-why">
                <summary>How this is verified</summary>
                <p className="note">{req.body}</p>
              </details>
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
  );
}
