// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { bytesToHex as hex } from "../lib/keys";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PayslipRecovery } from "../components/PayslipRecovery";
import { StageGate } from "../components/StageGate";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, group } from "../lib/format";
import type { PayrollLedger } from "../lib/contracts";
import { usePayrollInstances, type PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

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
  const columnFor = (
    map: { member(k: bigint): boolean; lookup(k: bigint): bigint } | undefined,
    period: bigint
  ) => (map?.member(period) ? map.lookup(period) : 0n);
  const grossFor = (period: bigint) => columnFor(state?.totalPayrollFor, period);

  /** How many slots of a period are marked done in one of the flag maps. */
  const countFlags = (map: PayrollLedger["fundedFor"] | undefined, period: bigint) => {
    if (!map || !map.member(period)) return 0;
    let n = 0;
    for (const [, done] of map.lookup(period)) if (done) n += 1;
    return n;
  };

  return (
    <section className="card record-card">
      {/* Named, not badged. "Payroll" in a pill beside the instance tag read as
          "PAYROLL payroll" and said nothing about what the card holds: the
          public, on-chain half of this page — every month this contract has
          filed. The private half is the payslip panel below it. */}
      <h2 className="record-head">
        <span className="section-title">Filed payroll periods</span>
        {/* Only a real instance name. Without one this fell back to the
            contract's generic name and rendered "payroll" in a pill beside a
            heading that already said so. */}
        {deployment.instance ? <span className="tag">{deployment.instance}</span> : null}
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
                <th className="num">Tax</th>
                <th className="num">Social</th>
                <th className="num">Net</th>
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
                    <td className="num strong">€{formatPeur(grossFor(period))}</td>
                    <td className="num muted">
                      €{formatPeur(columnFor(state?.totalTaxFor, period))}
                    </td>
                    <td className="num muted">
                      €{formatPeur(columnFor(state?.totalSocialFor, period))}
                    </td>
                    <td className="num strong">
                      €{formatPeur(columnFor(state?.totalNetFor, period))}
                    </td>
                    <td>
                      {workers > 0 && paid === workers ? (
                        <span className="pill ok">✓ Settled</span>
                      ) : funded === workers && workers > 0 ? (
                        <span className="pill info">Funded</span>
                      ) : (
                        <span className="pill neutral">Filed</span>
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
            Every figure is read from the contract's own public ledger. The
            withholding is computed inside the circuit from each gross salary and
            the rule set recorded for that period, so these columns are what the
            published rates produce — not what anyone typed.
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

export function EmployerHistory() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances, loading, error } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

  // A link carrying #end-employment has to wait for the section to exist: the
  // instances load from the chain, so the element is not in the document when
  // the route mounts and the browser's own hash handling finds nothing.
  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, instances]);

  const head = (
    <section className="area-head">
      <h1>Payroll history</h1>
      <p className="lede">
        View each filed payroll period and retrieve its private payslips. The
        figures behind each row never left your machine — what is on chain is the
        aggregate and one opaque commitment per employee. To run a month, go to{" "}
        <Link to="/employer">Payroll</Link>.
      </p>
    </section>
  );

  if (!account) {
    return (
      <>
        {head}
        <StageGate
          title="Register first"
          needs="Filing a period needs your company signing key, and you will only ever see contracts that key controls. Connect and register on Setup."
          to="/employer/settings"
          action="Go to Settings"
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
          title="Register first"
          needs={`This signing key does not control a payroll contract on ${networkId}. Register your organization to be assigned one.`}
          to="/employer/settings"
          action="Go to Settings"
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

      {asEmployer.length > 0 && asEmployer[0]!.state ? (
        <>
          <PayslipRecovery
            contractAddress={asEmployer[0]!.deployment.contractAddress}
            networkId={networkId}
            periods={[...asEmployer[0]!.state!.periods]
              .map(Number)
              .sort((a, b) => b - a)}
          />

        </>
      ) : null}
    </>
  );
}
