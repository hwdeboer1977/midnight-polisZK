// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { DUTCH_V1, computeLine, type TaxParams } from "../generated/tax-params";
import { formatPeur, formatPeurWhole, group } from "../lib/format";
import { describeMonths, periodName } from "../lib/period";
import { readTaxRules, type TaxRules as Rules } from "../lib/taxRules";
import { useWallet } from "../wallet/WalletContext";

/**
 * The rules every published figure was computed under.
 *
 * Public, and deliberately not filed under Employer. An employer does not
 * choose these — they are held to them — and the page that publishes what was
 * withheld across the network never said what schedule produced it. That gap is
 * the whole reason this exists: a total nobody can reproduce is a claim, not a
 * proof.
 *
 * Everything here is read from the registry contract. The same numbers exist as
 * a constant in this bundle, and the page shows whether the two agree rather
 * than assuming it — a bundle can say whatever it was built to say.
 *
 * ── On the shape of the page ───────────────────────────────────────────────
 *
 * It was a stack of tables at one weight, which is a document. Four blocks now,
 * in the order the questions arrive: what are the rates, how do they reach a
 * payslip, who published them, and what do they produce. The rates and the
 * worked figures are the loud parts because they are what a visitor came for;
 * the hashes are a card that looks like verification rather than a debug dump.
 * No substance was cut — the longer arguments sit behind disclosures.
 */
export function TaxRules() {
  const { networkId } = useWallet();
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const next = await readTaxRules(networkId);
        if (!cancelled) setRules(next);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  const latest = rules?.latest ?? null;
  const params = latest?.params ?? null;

  return (
    <>
      <section className="net-head">
        <h1 className="brand-head">Tax parameters</h1>
        <p className="lede">
          The published payroll rules behind every figure this network reports —
          on chain, versioned, and checkable by anyone.
        </p>
      </section>

      {loading ? <p className="note">Reading the registry…</p> : null}
      {error ? <p className="status error">Could not read the registry: {error}</p> : null}

      {!loading && rules && !rules.registry ? (
        <p className="status error">
          No rule registry is configured for this build, so nothing here can be
          verified. Deploy one with <code>npm run deploy:tax</code> and rebuild the
          frontend config.
        </p>
      ) : null}

      {rules && params && latest ? (
        <>
          <div className="rule-chips">
            <span className="rule-chip lead">Schedule v{latest.version}</span>
            <span className="rule-chip live">
              <span className="dot" aria-hidden="true" /> In force
            </span>
            <span className="rule-chip">Since {periodName(latest.validFrom)}</span>
            <span className="rule-chip">Published on chain</span>
            <span className="rule-chip">Immutable</span>
          </div>

          <Schedule params={params} />

          <Flow />

          <Verification rules={rules} params={params} hash={latest.hash} />

          <Produces params={params} />

          <Window rules={rules} version={latest.version} />

          {rules.versions.length > 1 ? (
            <section className="card">
              <h2>Earlier versions</h2>
              <p className="note">
                Kept, not replaced. A period filed under an older version is still
                checked against that version, so publishing a new schedule never
                changes what was already filed.
              </p>
              <table className="roster">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>From</th>
                    <th className="num">Bands</th>
                    <th className="num">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.versions.map((v) => (
                    <tr key={v.version}>
                      <td>v{v.version}</td>
                      <td>{periodName(v.validFrom)}</td>
                      <td className="num">
                        {rate(v.params.rate1)} / {rate(v.params.rate2)} /{" "}
                        {rate(v.params.rate3)}
                      </td>
                      <td className="num">{rate(v.params.contribRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && rules?.registry && !latest ? (
        <p className="status error">
          The registry at {rules.registry} has no rule set published yet, so no month
          can be filed against it.
        </p>
      ) : null}
    </>
  );
}

/** ── 1. the rates, which are what anyone came here for ──────────────────── */
function Schedule({ params }: { params: TaxParams }) {
  // The lower bound of band 2 is the first whole euro above band 1's ceiling.
  // Stated in whole euros like everything else here; the exact boundary, cents
  // included, is in each row's hover.
  const band2From = params.threshold1 / 1_000_000n + 1n;

  return (
    <section className="card schedule-card">
      <div className="schedule-grid">
        <div className="schedule-col">
          <h2>Income tax</h2>
          {/* The band is the rule; the rate is one attribute of it. Setting the
              percentages at 27px and the ranges at note size inverted that —
              the eye landed on three numbers and had to hunt for what they
              applied to. */}
          <div className="rate-head">
            <span>Monthly taxable income</span>
            <span>Tax rate</span>
          </div>
          <ul className="rate-list">
            <RateRow
              label={`€0 – €${formatPeurWhole(params.threshold1)}`}
              unit="/ month"
              exact={`Exactly €${formatPeur(params.threshold1)} per month`}
              rate={params.rate1}
            />
            <RateRow
              label={`€${group(band2From)} – €${formatPeurWhole(params.threshold2)}`}
              unit="/ month"
              exact={`Above €${formatPeur(params.threshold1)}, up to €${formatPeur(
                params.threshold2
              )} per month`}
              rate={params.rate2}
            />
            <RateRow
              label={`Above €${formatPeurWhole(params.threshold2)}`}
              unit="/ month"
              exact={`Above €${formatPeur(params.threshold2)} per month`}
              rate={params.rate3}
            />
          </ul>
          <details className="why">
            <summary>How monthly thresholds are derived</summary>
            <p className="note">
              The schedule is published annually — €
              {formatPeurWhole(params.threshold1 * 12n)} and €
              {formatPeurWhole(params.threshold2 * 12n)} a year — and a payroll
              period is a month, so each is divided by twelve. Both divide into
              whole monthly cents, so nothing is lost in the conversion; the
              exact monthly figure is on each row above.
            </p>
          </details>
        </div>

        <div className="schedule-col">
          <h2>Social insurance</h2>
          <div className="rate-head">
            <span>Contributable income</span>
            <span>Rate</span>
          </div>
          <ul className="rate-list">
            {/* The rule a viewer needs is "3% of contributable income". The
                ceiling is real and has to be stated, but rendering it as a
                €0 – €1,000,000 range put an obviously artificial number where
                the rule belongs, and read as absurd before the note explaining
                it was reached. */}
            <RateRow
              label="All contributable income"
              marker="*"
              exact={`Capped at €${formatPeur(params.maxContribBase)} per month`}
              rate={params.contribRate}
            />
          </ul>
          <p className="demo-param">
            <strong>Demo parameter</strong>
            <span className="demo-marker">*</span> Ceiling €
            {formatPeurWhole(params.maxContribBase)} / month — above any salary
            this system will see, so the contribution is effectively uncapped. A
            production deployment publishes the jurisdiction's statutory ceiling
            as a new immutable version rather than editing this one.
          </p>
        </div>
      </div>
    </section>
  );
}

function RateRow({
  label,
  unit,
  marker,
  exact,
  rate: basisPoints,
}: {
  label: string;
  /** "/ month", set quieter than the range it qualifies. */
  unit?: string;
  /** Ties the row to a footnote below it, for a caveat that is not the rule. */
  marker?: string;
  exact: string;
  rate: number;
}) {
  return (
    <li className="rate-row" title={exact}>
      <span className="rate-band">
        {label}
        {unit ? <span className="rate-unit"> {unit}</span> : null}
        {marker ? <span className="rate-marker">{marker}</span> : null}
      </span>
      <span className="rate-value">{rate(basisPoints)}</span>
    </li>
  );
}

/** ── 2. how a schedule reaches a payslip without disclosing one ─────────── */
function Flow() {
  return (
    <figure className="rule-flow">
      <div className="flow-track">
        <div className="flow-node open">
          <span className="flow-title">Published rules</span>
          <span className="flow-sub">this schedule, on chain</span>
        </div>
        <div className="flow-sealed">
          <span className="flow-seal-label">🔒 never leaves the employer</span>
          <div className="flow-track inner">
            <div className="flow-node sealed">
              <span className="flow-title">Payroll</span>
              <span className="flow-sub">one gross per person</span>
            </div>
            <div className="flow-node sealed">
              <span className="flow-title">ZK circuit</span>
              <span className="flow-sub">tax · contribution · net</span>
            </div>
          </div>
        </div>
        <div className="flow-node open">
          <span className="flow-title">Public totals</span>
          <span className="flow-sub">headcount + four column totals</span>
        </div>
      </div>
      <figcaption>
        Individual calculations stay sealed. The aggregates are public — and
        provably the result of the schedule above.
      </figcaption>
    </figure>
  );
}

/** ── 3. who published it, and does this page agree ──────────────────────── */
function Verification({
  rules,
  params,
  hash,
}: {
  rules: Rules;
  params: TaxParams;
  hash: string;
}) {
  const agreed = agrees(params);
  return (
    <section className={agreed ? "card verify-card" : "card verify-card off"}>
      <h2>
        <span className="verify-mark" aria-hidden="true">
          {agreed ? "✓" : "!"}
        </span>
        {agreed ? "Verified against on-chain state" : "Does not match on-chain state"}
      </h2>
      {rules.registry ? <CopyRow label="Registry" value={rules.registry} /> : null}
      <CopyRow label="Version hash" value={hash} />
      {rules.authority ? <CopyRow label="Published by" value={rules.authority} /> : null}
      <p className={agreed ? "ok-line verify-line" : "status error verify-line"}>
        {agreed
          ? "✓ The registry and this application agree, field for field."
          : "⚠ The registry does not match the schedule compiled into this page. Trust the registry: it is what the contracts check against."}
      </p>
      <details className="why">
        <summary>What is actually being verified</summary>
        <p className="note">
          The version hash is what a payroll contract records for each month it
          accepts. Filing recomputes it in circuit from the figures supplied and
          refuses the month unless the two match — so a filed period cannot have
          used any other schedule, and the registry is append-only, so this one
          cannot be edited afterwards. {rules.versions.length} version
          {rules.versions.length === 1 ? " has" : "s have"} been published.
        </p>
      </details>
    </section>
  );
}

/** ── 4. what it produces, on real numbers you can change ────────────────── */
const EXAMPLES = [3_000n, 5_000n, 9_000n];

function Produces({ params }: { params: TaxParams }) {
  const [entered, setEntered] = useState("5,000");

  const euros = useMemo(() => {
    const digits = entered.replace(/\D/g, "").slice(0, 7);
    return digits ? BigInt(digits) : 0n;
  }, [entered]);

  const custom = useMemo(() => wholeLine(euros * 1_000_000n, params), [euros, params]);

  return (
    <section className="card produces-card">
      <h2>What it produces</h2>

      <div className="example-row">
        {EXAMPLES.map((gross) => {
          const line = wholeLine(gross * 1_000_000n, params);
          return (
            <button
              type="button"
              key={String(gross)}
              className={euros === gross ? "example active" : "example"}
              onClick={() => setEntered(group(gross))}
            >
              <span className="example-gross">€{group(line.gross)}</span>
              <span className="example-label">gross</span>
              <span className="example-split">
                <span title={`Exactly €${formatPeur(line.taxMinor)}`}>
                  €{group(line.tax)} tax
                </span>
                <span title={`Exactly €${formatPeur(line.contribMinor)}`}>
                  €{group(line.contrib)} insurance
                </span>
              </span>
              <span className="example-net" title={`Exactly €${formatPeur(line.netMinor)}`}>
                €{group(line.net)} <small>net</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="try">
        <label className="try-field">
          <span>Try another salary</span>
          <span className="try-input">
            <span className="try-currency" aria-hidden="true">€</span>
            <input
              inputMode="numeric"
              value={entered}
              onChange={(e) => setEntered(e.target.value)}
              aria-label="Monthly gross salary in euro"
            />
            <span className="try-pencil" aria-hidden="true">✎</span>
          </span>
        </label>
        <div className="try-out">
          <TryStep k="Gross" v={custom.gross} exact={custom.grossMinor} />
          <TryStep k="Tax" v={custom.tax} exact={custom.taxMinor} />
          <TryStep k="Insurance" v={custom.contrib} exact={custom.contribMinor} />
          <TryStep k="Net" v={custom.net} exact={custom.netMinor} strong />
        </div>
      </div>

      <details className="why">
        <summary>How rounding is handled</summary>
        <p className="note">
          Whole euros, exact amounts on hover. Tax and contribution are floored, as
          the circuit floors them, and the net is what remains of the gross — every
          employee is rounded on their own line and the lines are then summed, never
          a rate reapplied to a total.
        </p>
      </details>
    </section>
  );
}

function TryStep({
  k,
  v,
  exact,
  strong,
}: {
  k: string;
  v: bigint;
  exact: bigint;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "try-step strong" : "try-step"}>
      <span className="try-k">{k}</span>
      <span className="try-v" title={`Exactly €${formatPeur(exact)}`}>
        €{group(v)}
      </span>
    </div>
  );
}

/** ── which months this schedule has actually been recorded for ──────────── */
function Window({ rules, version }: { rules: Rules; version: number }) {
  return (
    <section className="card">
      <h2>Months bound to this schedule</h2>
      {rules.windows.length === 0 ? (
        <p className="note">No payroll contract on this network to report on.</p>
      ) : (
        <table className="roster">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Months open</th>
              <th>Rules</th>
            </tr>
          </thead>
          <tbody>
            {rules.windows.map((w) => (
              <tr key={w.address}>
                <td title={w.address}>{w.label}</td>
                <td>{describeMonths(w.months)}</td>
                <td>
                  {w.months.length === 0 ? (
                    "—"
                  ) : w.unmatched.length === 0 ? (
                    <span className="ok-cell">✓ v{version}</span>
                  ) : (
                    <span className="warn-cell">
                      ⚠ {w.unmatched.map(periodName).join(", ")} point at an
                      unpublished schedule
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="note">
        Opening a month is the platform's act, not the employer's — a month outside
        this list is refused by the contract, which is why the{" "}
        <Link to="/employer">filing card</Link> says so before anyone spends minutes
        proving it.
      </p>
      <details className="why">
        <summary>Why a payroll contract stores this at all</summary>
        <p className="note">
          A payroll contract cannot read the registry: contracts on Midnight cannot
          read each other's state. So the platform records the version hash on the
          payroll contract, one month at a time, before that month can be filed.
          Write-once per month, so the rules a period was filed under cannot be
          changed after the fact.
        </p>
      </details>
    </section>
  );
}

/**
 * A payslip line in whole euros that still adds up.
 *
 * Tax and contribution are floored — the direction the circuit floors them, so a
 * displayed withholding is never a euro more than the ledger holds — and the net
 * is the remainder. Rounding all three independently does not add up: at €3,000
 * the tax and the net are both exactly half a euro, and a row reading
 * 1,072 + 90 + 1,838 = 3,001 discredits a page whose claim is that its figures
 * reproduce. The exact minor units come back too, for the hover.
 */
function wholeLine(grossMinor: bigint, params: TaxParams) {
  const line = computeLine(grossMinor, params);
  const whole = (v: bigint) => v / 1_000_000n;
  const gross = whole(grossMinor);
  const tax = whole(line.taxMinor);
  const contrib = whole(line.contribMinor);
  return {
    gross,
    tax,
    contrib,
    net: gross - tax - contrib,
    grossMinor,
    taxMinor: line.taxMinor,
    contribMinor: line.contribMinor,
    netMinor: line.netMinor,
  };
}

/** Basis points as a percentage: 3575 -> "35.75%". */
function rate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

/**
 * Whether the chain's rule set matches the one compiled into this bundle.
 *
 * Compared field by field rather than by hash: the bundle's constant is a plain
 * object, so hashing it would mean reimplementing `persistentHash` here — a
 * second implementation to get wrong, checking a thing this comparison already
 * answers.
 */
function agrees(chain: TaxParams): boolean {
  return (
    chain.validFrom === DUTCH_V1.validFrom &&
    chain.threshold1 === DUTCH_V1.threshold1 &&
    chain.threshold2 === DUTCH_V1.threshold2 &&
    chain.rate1 === DUTCH_V1.rate1 &&
    chain.rate2 === DUTCH_V1.rate2 &&
    chain.rate3 === DUTCH_V1.rate3 &&
    chain.maxContribBase === DUTCH_V1.maxContribBase &&
    chain.contribRate === DUTCH_V1.contribRate
  );
}
