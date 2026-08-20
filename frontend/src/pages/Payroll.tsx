import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { RosterUpload } from "../components/RosterUpload";
import { StageGate } from "../components/StageGate";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, group } from "../lib/format";
import type { PayrollLedger } from "../lib/contracts";
import { usePayrollInstances, type PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** 202603 -> "March 2026". */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function periodName(period: bigint): string {
  const n = Number(period);
  const month = MONTHS[(n % 100) - 1];
  return month ? `${month} ${Math.floor(n / 100)}` : String(period);
}

/**
 * Payroll history: one row per period filed, newest first.
 *
 * The employer sees the aggregate for each month here and the private rows
 * behind it in the filing flow below; the public page sees only the totals.
 * That contrast is the whole architecture, and putting the months in a table
 * rather than a stack of cards is what makes it readable at a glance.
 */
function PeriodHistory({ instance }: { instance: PayrollInstance }) {
  const { state, blockHeight, role, deployment, name } = instance;

  // Newest first: the month someone is looking for is almost always the last
  // one filed, and a correction to an old month should not bury it.
  const periods = state
    ? Array.from(state.periods).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    : [];

  const countFor = (period: bigint) =>
    state?.employeeCountFor.member(period) ? Number(state.employeeCountFor.lookup(period)) : 0;
  const grossFor = (period: bigint) =>
    state?.totalPayrollFor.member(period) ? state.totalPayrollFor.lookup(period) : 0n;

  /** How many slots of a period are marked done in one of the flag maps. */
  const countFlags = (map: PayrollLedger["fundedFor"] | undefined, period: bigint) => {
    if (!map || !map.member(period)) return 0;
    let n = 0;
    for (const [, done] of map.lookup(period)) if (done) n += 1;
    return n;
  };

  return (
    <section className="card">
      <h2>
        <span className="badge">{deployment.instance ?? name}</span>
        {role === "platform" ? <span className="tag">you deployed this</span> : null}
      </h2>

      {periods.length === 0 ? (
        <p className="muted">No periods filed on this contract yet.</p>
      ) : (
        <>
          <table className="roster">
            <thead>
              <tr>
                <th>Period</th>
                <th className="num">Workers</th>
                <th className="num">Gross</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const workers = countFor(period);
                const funded = countFlags(state?.fundedFor, period);
                const paid = countFlags(state?.paidFor, period);
                return (
                  <tr key={String(period)}>
                    <td>{periodName(period)}</td>
                    <td className="num">{workers}</td>
                    <td className="num">€{formatPeur(grossFor(period))}</td>
                    <td>
                      {workers > 0 && paid === workers ? (
                        <span className="ok-line">Settled</span>
                      ) : funded === workers && workers > 0 ? (
                        <span className="muted">Funded</span>
                      ) : (
                        <span className="muted">Filed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Stated once, below the table, rather than as three columns of
              dashes. A column that never has a value is not information; it is
              a reminder of something missing, repeated once per row. */}
          <p className="note">
            The current contract commits one gross salary per employee. Tax,
            social contributions and net salary are outside this prototype —
            everything in the table above is read from the contract's own public
            ledger.
          </p>

          <details className="details">
            <summary>Commitments per period</summary>
            {periods.map((period) => {
              const rows =
                state && state.commitmentsFor.member(period)
                  ? Array.from(state.commitmentsFor.lookup(period))
                  : [];
              return (
                <details className="details" key={String(period)}>
                  <summary>
                    {periodName(period)} — {rows.length} commitments
                  </summary>
                  {rows.map(([index, commitment]) => (
                    <CopyRow key={String(index)} label={`#${index}`} value={hex(commitment)} />
                  ))}
                </details>
              );
            })}
            <p className="note">
              Each commitment is a hash of one salary and a secret nonce. Opaque
              without the nonce, which only you hold — so no salary is derivable
              from what is published here. Every period stays on chain, so a past
              month remains provable after later ones are filed.
            </p>
          </details>
        </>
      )}

      <CopyRow label="Contract" value={deployment.contractAddress} />
      {state && !state.employerAssigned ? (
        <div className="row">
          <div className="k">Status</div>
          <div className="v warn-text">no employer assigned yet</div>
        </div>
      ) : null}
      {blockHeight ? (
        <p className="note">Read at block {group(BigInt(blockHeight))}.</p>
      ) : null}
    </section>
  );
}

export function Payroll() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances, loading, error, refresh } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

  const head = (
    <section className="area-head">
      <h1>Payroll</h1>
      <p className="lede">
        One row per month filed. The private figures behind each row never left
        your machine — what is on chain is the aggregate and one opaque
        commitment per worker.
      </p>
    </section>
  );

  if (!account) {
    return (
      <>
        {head}
        <StageGate
          title="Setup first"
          needs="Filing a period needs your company signing key, and you will only ever see contracts that key controls. Connect and register on Setup."
          to="/employer/setup"
          action="Go to Setup"
        />
      </>
    );
  }

  // Ownership is read from the contracts, so this is not a cosmetic filter: an
  // employer sees the instance their key controls, and an operator additionally
  // sees the ones they deployed. Everyone else's are simply not shown.
  const mine = instances.filter((instance) => instance.role !== "none");
  const asEmployer = mine.filter((instance) => instance.role === "employer");

  if (loading && instances.length === 0) {
    return (
      <section className="card">
        <h2>Payroll</h2>
        <p className="muted">Reading contracts…</p>
      </section>
    );
  }

  if (mine.length === 0) {
    return (
      <>
        {head}
        <StageGate
          title="Setup first"
          needs={`This signing key does not control a payroll contract on ${networkId}. Register your organization to be assigned one.`}
          to="/employer/setup"
          action="Go to Setup"
        />
        {error ? <p className="status error">{error}</p> : null}
      </>
    );
  }

  return (
    <>
      {head}

      {error ? <p className="status error">Could not read state: {error}</p> : null}
      {mine.map((instance) => (
        // Per instance, not around the list: one contract left on an older
        // version of the ledger should not hide the others.
        <ErrorBoundary key={instance.name} what={instance.name}>
          <PeriodHistory instance={instance} />
        </ErrorBoundary>
      ))}
      {asEmployer.length > 0 ? (
        <RosterUpload
          // The first instance this key is employer of. An employer controlling
          // several would need to pick; nobody does yet, and a selector for a
          // list of one is worse than no selector.
          target={{
            name: asEmployer[0]!.name,
            contractAddress: asEmployer[0]!.deployment.contractAddress,
            // The local service signs with the platform wallet, so it can only
            // act on an instance whose employer IS the platform. Read off the
            // contract rather than assumed: the ledger holds both keys.
            operatorIsEmployer: (() => {
              const s = asEmployer[0]!.state;
              return s
                ? hex(s.platform.bytes) === hex(s.employer.bytes)
                : false;
            })(),
          }}
          // A filed period changes the ledger this page is showing, so re-read
          // rather than leaving the tiles a month behind until someone reloads.
          onSubmitted={refresh}
        />
      ) : null}
    </>
  );
}
