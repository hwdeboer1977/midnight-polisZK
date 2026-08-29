import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { DeployerRegistry } from "../components/DeployerRegistry";
import { EmployerAssign } from "../components/EmployerAssign";
import { EmployerRevoke } from "../components/EmployerRevoke";
import { FundDeposit } from "../components/FundDeposit";
import { ServiceReset } from "../components/ServiceReset";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * The platform's own console.
 *
 * These controls existed before this page did — as four cards at the bottom of
 * the public network page, each rendered only when the connected wallet turned
 * out to be the deployer. That put the operator's work in the one place written
 * for people who are not the operator, and hid the system's most consequential
 * buttons under a page most of its readers scroll past.
 *
 * ── Why the last payroll hop moved here ────────────────────────────────────
 *
 * `FundDeposit` also sat inside the employer's month stepper, as step five. It
 * was never the employer's step. That hop spends the TREASURY wallets — the
 * seeds live in this service, not in any browser — and it pays into the benefit
 * fund and the tax vault, which the platform deployed and governs. An employer
 * pressing it would be spending money that had already left their contract, on
 * behalf of an institution they are not. The step remains visible to them,
 * because whether their period's withholding actually arrived is very much
 * their business; performing it is not.
 *
 * ── What the gate is worth ─────────────────────────────────────────────────
 *
 * `isPlatform` is read off the contracts rather than from a configured address,
 * so a rotated platform key needs no code change. It hides controls; it secures
 * nothing. A coin public key is public, so anyone can claim to be this one — the
 * server refuses on the platform token, and the chain refuses on the signature.
 * Everything gated here is gated again by one of those two.
 */
export function Operator() {
  const { networkId, account } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances, loading, refresh } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );
  const isPlatform = instances.some((instance) => instance.isPlatform);

  if (!account) {
    return (
      <>
        <section className="card">
          <h2>Operator</h2>
          <p className="lead-sm">
            The platform's side of the system: moving each period's withholding
            into the national contracts, and deciding which company holds the
            payroll contract.
          </p>
          <p className="note">
            Connect the key that deployed these contracts. Every control here is
            checked again by the service or by the chain, so connecting the wrong
            one shows nothing rather than doing anything.
          </p>
        </section>
        <WalletPicker heading="Connect the platform key" subject="platform key" />
      </>
    );
  }

  if (!isPlatform) {
    return (
      <section className="card">
        <h2>Operator</h2>
        <p className="lead-sm">
          This key is not the platform of any contract on {networkId}.
        </p>
        <p className="note">
          {loading
            ? "Reading the contracts…"
            : "Every payroll contract records the key that deployed it, and this " +
              "is not it. If you are an employer, your own contract is under "}
          {loading ? null : <Link to="/employer">Employer</Link>}
          {loading ? null : "."}
        </p>
        <CopyRow label="Connected key" value={account.coinPublicKey} />
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h2>Operator</h2>
        <p className="lead-sm">
          What only the platform can do: move the collected withholding into the
          national contracts, and fill or empty the employer seat. The figures
          every one of these produces are on{" "}
          <Link to="/app">the public page</Link>.
        </p>
      </section>

      {/* First, because it is the step the system waits on. Everything else
          here is occasional — a company joins, a company leaves — while this one
          is owed every month, and the money sits in a keypair with no contract
          behind it until it runs. */}
      <FundDeposit networkId={networkId} />

      {/* Revoke above assign, in the order a seat actually changes hands: it has
          to be emptied before it can be filled, and `assignEmployer` cannot be
          repeated. Assign renders nothing while the seat is taken, so the pair
          reads as one control that swaps. */}
      <EmployerRevoke instances={instances} onRevoked={refresh} />
      <EmployerAssign instances={instances} onAssigned={refresh} />

      <DeployerRegistry networkId={networkId} />

      {/* Last. It deletes this service's own files, and it is the one thing here
          that cannot be undone by pressing something else. */}
      <ServiceReset />
    </>
  );
}
