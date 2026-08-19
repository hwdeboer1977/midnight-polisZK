import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { RosterUpload } from "../components/RosterUpload";
import { Tile } from "../components/Tile";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, group } from "../lib/format";
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

function Instance({ instance }: { instance: PayrollInstance }) {
  const { name, deployment, state, blockHeight, role } = instance;

  // Newest first: the month someone is looking for is almost always the last
  // one filed, and a correction to an old month should not bury it.
  const periods = state
    ? Array.from(state.periods).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    : [];
  const latest = state && state.latestPeriod > 0n ? state.latestPeriod : null;
  const counts = state?.employeeCountFor;
  const totals = state?.totalPayrollFor;
  const commitments =
    state && latest && state.commitmentsFor.member(latest)
      ? Number(state.commitmentsFor.lookup(latest).size())
      : 0;

  return (
    <section className="card">
      <h2>
        <span className="badge">{name}</span>
        {role === "platform" ? <span className="tag">you deployed this</span> : null}
      </h2>

      <div className="tiles inline">
        <Tile
          label="Employees"
          value={
            latest && counts?.member(latest)
              ? group(counts!.lookup(latest))
              : "—"
          }
          unit={latest ? periodName(latest) : "no payroll filed yet"}
        />
        <Tile
          label="Total payroll"
          value={
            latest && totals?.member(latest)
              ? formatPeur(totals.lookup(latest))
              : "—"
          }
          unit={latest ? `${periodName(latest)} · public aggregate` : "public aggregate"}
          accent
        />
        <Tile
          label="Periods filed"
          value={state ? String(periods.length) : "—"}
          unit={blockHeight ? `block ${group(BigInt(blockHeight))}` : "months on chain"}
        />
      </div>

      <CopyRow label="Contract" value={deployment.contractAddress} />
      {state && !state.employerAssigned ? (
        <div className="row">
          <div className="k">Status</div>
          <div className="v warn-text">no employer assigned yet</div>
        </div>
      ) : null}

      {state && periods.length > 0
        ? periods.map((period) => {
            const rows = state.commitmentsFor.member(period)
              ? Array.from(state.commitmentsFor.lookup(period))
              : [];
            const total = state.totalPayrollFor.member(period)
              ? formatPeur(state.totalPayrollFor.lookup(period))
              : "—";
            return (
              <details className="details" key={String(period)}>
                <summary>
                  {periodName(period)} — {total} pEUR, {rows.length} commitments
                </summary>
                {rows.map(([index, commitment]) => (
                  <CopyRow
                    key={String(index)}
                    label={`#${index}`}
                    value={hex(commitment)}
                  />
                ))}
              </details>
            );
          })
        : null}

      {commitments > 0 ? (
        <p className="note">
          Each commitment is a hash of one salary and a secret nonce. Opaque without
          the nonce, which only you hold — so no salary is derivable from what is
          published here. Every period stays on chain, so a past month remains
          provable after later ones are filed.
        </p>
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

  if (!account) {
    return (
      <>
        <section className="card">
          <h2>Payroll</h2>
          <p className="lead-sm">
            Connect your company signing key to see your payroll contract. You will only
            ever see contracts your key controls.
          </p>
        </section>
        <WalletPicker heading="Choose your signing key" subject="signing key" />
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
      <section className="card">
        <h2>No payroll contract yet</h2>
        <p className="lead-sm">
          This signing key does not control a payroll contract on {networkId}.
        </p>
        <p className="note">
          {instances.length > 0
            ? `${instances.length} contract${instances.length === 1 ? "" : "s"} exist on this network, none of them yours.`
            : "No contracts have been deployed on this network yet."}{" "}
          <Link to="/register">Register your company</Link> to get one.
        </p>
        {error ? <p className="status error">{error}</p> : null}
      </section>
    );
  }

  return (
    <>
      {error ? <p className="status error">Could not read state: {error}</p> : null}
      {mine.map((instance) => (
        // Per instance, not around the list: one contract left on an older
        // version of the ledger should not hide the others.
        <ErrorBoundary key={instance.name} what={instance.name}>
          <Instance instance={instance} />
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
          }}
          // A filed period changes the ledger this page is showing, so re-read
          // rather than leaving the tiles a month behind until someone reloads.
          onSubmitted={refresh}
        />
      ) : null}
    </>
  );
}
