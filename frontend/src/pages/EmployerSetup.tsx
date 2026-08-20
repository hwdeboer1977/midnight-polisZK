import { useEffect, useState } from "react";
import { CopyRow } from "../components/CopyRow";
import { EXPLORERS } from "../lib/chain";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";
import { Overview } from "./Overview";
import { Peur } from "./Peur";
import { Register } from "./Register";

/**
 * Everything that is configuration rather than payroll: registration, keys,
 * addresses, funding, and the asset salaries settle in.
 *
 * pEUR lives here rather than in the top navigation on purpose. A visitor does
 * not care that this implementation happens to settle in a demo token until
 * they are inspecting the architecture, and a nav item named after a
 * smart-contract module describes the codebase instead of the system.
 */
export function EmployerSetup() {
  return (
    <>
      <section className="area-head">
        <h1>Setup</h1>
        <p className="lede">
          Set up your organization, payroll contract and settlement asset.
        </p>
      </section>

      <SetupStatus />
      <Register />

      <section className="area-sub">
        <h2>Wallet &amp; funding</h2>
        <p className="note" style={{ marginTop: 0 }}>
          What you hold, where people pay you, and how to get the pEUR salaries
          settle in.
        </p>
      </section>
      <Overview variant="funding" />

      {/* Everything a reviewer wants and an employer does not: raw addresses,
          deployed contracts, the token's own ledger. Present, because it is what
          proves the integration is real — one click away, because a registration
          page that opens as a debug console is a registration page nobody
          finishes. */}
      <details className="details advanced">
        <summary>Advanced / technical details</summary>
        <Overview variant="technical" />
        <section className="area-sub">
          <h2>Settlement asset</h2>
          <p className="note" style={{ marginTop: 0 }}>
            Salaries settle in pEUR, a demo stablecoin: anyone may mint it, in any
            amount, which makes it worthless as a store of value and is exactly
            the point — a demo should not need a faucet queue or an operator in
            the loop. A real deployment would settle in an asset whose supply is
            controlled and auditable against reserves.
          </p>
        </section>
        <Peur />
      </details>
    </>
  );
}

/**
 * How this organization is connected to IncomeLayerZK, in one place.
 *
 * The addresses a technical reviewer wants to inspect belong here rather than
 * on Payroll: someone filing a month should not have to scroll past contract
 * plumbing, and someone auditing the deployment should not have to hunt for it
 * behind a payroll flow.
 */
function SetupStatus() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );
  const mine = instances.filter((instance) => instance.role === "employer");
  const payroll = mine[0]?.deployment ?? null;
  const peur = Object.values(deployments).find(
    (d) => d.contractName === "peur" && d.networkId === networkId
  );
  const explorer = EXPLORERS[networkId] ?? "";

  const link = (address: string) =>
    explorer ? (
      <a
        className="explorer"
        href={`${explorer}${address}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        Explorer ↗
      </a>
    ) : null;

  return (
    <section className="card">
      <h2>Status</h2>

      <div className="row">
        <div className="k">Organization</div>
        <div className="v">
          {payroll ? (
            <span className="ok-line">Registered ✓</span>
          ) : (
            <span className="muted">Not registered yet</span>
          )}
        </div>
      </div>

      {account ? (
        <CopyRow label="Company signing key" value={account.coinPublicKey} />
      ) : (
        <div className="row">
          <div className="k">Company signing key</div>
          <div className="v muted">No wallet connected</div>
        </div>
      )}

      {payroll ? (
        <div className="deployed-row">
          <CopyRow label="Payroll contract" value={payroll.contractAddress} />
          {link(payroll.contractAddress)}
        </div>
      ) : null}

      {peur ? (
        <div className="deployed-row">
          <CopyRow label="Settlement asset (pEUR)" value={peur.contractAddress} />
          {link(peur.contractAddress)}
        </div>
      ) : null}

      <div className="row">
        <div className="k">Network</div>
        <div className="v">Midnight {networkId}</div>
      </div>

      {explorer ? null : (
        <p className="note">
          No explorer URL is configured for {networkId}, so the addresses above
          are shown without one — a dead link in front of a reviewer is worse
          than none. Set <code>EXPLORERS</code> in <code>lib/chain.ts</code> and
          they appear here and on the public page at once.
        </p>
      )}
    </section>
  );
}
