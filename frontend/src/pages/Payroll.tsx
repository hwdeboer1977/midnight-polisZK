import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { RosterUpload } from "../components/RosterUpload";
import { Tile } from "../components/Tile";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { group } from "../lib/format";
import { usePayrollInstances, type PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function Instance({ instance }: { instance: PayrollInstance }) {
  const { name, deployment, state, blockHeight, role } = instance;
  const commitments = state ? Number(state.commitments.size()) : 0;

  return (
    <section className="card">
      <h2>
        <span className="badge">{name}</span>
        {role === "platform" ? <span className="tag">you deployed this</span> : null}
      </h2>

      <div className="tiles inline">
        <Tile
          label="Employees"
          value={state ? group(state.employeeCount) : "—"}
          unit="committed on chain"
        />
        <Tile
          label="Total payroll"
          value={state ? group(state.totalPayroll) : "—"}
          unit="public aggregate"
          accent
        />
        <Tile
          label="Commitments"
          value={state ? String(commitments) : "—"}
          unit={blockHeight ? `block ${group(BigInt(blockHeight))}` : "one per salary"}
        />
      </div>

      <CopyRow label="Contract" value={deployment.contractAddress} />
      {state && !state.employerAssigned ? (
        <div className="row">
          <div className="k">Status</div>
          <div className="v warn-text">no employer assigned yet</div>
        </div>
      ) : null}

      {commitments > 0 ? (
        <details className="details">
          <summary>Salary commitments ({commitments})</summary>
          {state
            ? Array.from(state.commitments).map(([index, commitment]) => (
                <CopyRow key={String(index)} label={`#${index}`} value={hex(commitment)} />
              ))
            : null}
          <p className="note">
            Each is a hash of one salary and a secret nonce. Opaque without the nonce,
            which only you hold — so no salary is derivable from what is published here.
          </p>
        </details>
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

  const { instances, loading, error } = usePayrollInstances(
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
        <Instance key={instance.name} instance={instance} />
      ))}
      {asEmployer.length > 0 ? <RosterUpload /> : null}
    </>
  );
}
