import { useEffect, useState } from "react";
import { CopyRow } from "../components/CopyRow";
import { EXPLORERS } from "../lib/chain";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";
import { Link } from "react-router-dom";
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
  // Only to decide whether the sections BELOW registration have anything to
  // show. `Register` asks for the signing key; until that is answered, funding
  // and balances have nothing to say, and a heading over an empty space reads
  // as a section that failed to load.
  const { account } = useWallet();

  return (
    <>
      <section className="area-head">
        <h1>Reference</h1>
        {/* Reference, not a checklist. Whether an organization is registered was
            stated here, on Overview, and again inside Register — three places
            answering one question, which is two too many. Overview owns "what do
            I have to do"; this page owns "what are my keys and addresses". */}
        <p className="lede">
          Your keys, your contracts and your balances. What you have to{" "}
          <em>do</em> is on <Link to="/employer">Overview</Link>.
        </p>
      </section>

      <SetupStatus />
      <Register />

      {account ? (
        <>
          <section className="area-sub">
            <h2>Wallet &amp; funding</h2>
            <p className="note" style={{ marginTop: 0 }}>
              What you hold, where people pay you, and how to get the pEUR
              salaries settle in.
            </p>
          </section>
          <Overview variant="funding" />
        </>
      ) : null}

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
/**
 * The keys and addresses this employer holds, and nothing else.
 *
 * The "Organization: Registered ✓" row that used to lead this panel is gone:
 * Overview's checklist answers that, and stating it here as well meant a
 * question with two homes and, when they disagreed, no way to tell which was
 * right.
 */
function SetupStatus() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const here = Object.values(deployments).filter((d) => d.networkId === networkId);

  /**
   * THIS employer's contract, not the first one on the network.
   *
   * It used to be `here.find(d => d.contractName === "payroll")`, which is
   * correct only while exactly one payroll contract exists. On preview there
   * are six, so this row showed a stranger's contract address under the heading
   * "your keys and addresses" — beside a panel that named the right one, on the
   * same screen.
   *
   * Ownership is not in the deployment list, and cannot be: that file records
   * that a contract exists, while `assignEmployer` decides whose it is and the
   * answer lives on chain. `usePayrollInstances` reads it and reports a role
   * per instance, which is what the Roster and the Overview checklist already
   * filter on — this page had the hook imported and was not using it here.
   */
  const { instances } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );
  const payroll = instances.find((instance) => instance.role === "employer")?.deployment;

  const peur = here.find((d) => d.contractName === "peur");
  const explorer = EXPLORERS[networkId] ?? "";
  const link = (address: string) =>
    explorer ? (
      <a
        className="explorer"
        href={`${explorer}${address}`}
        target="_blank"
        rel="noreferrer"
      >
        explorer
      </a>
    ) : null;

  return (
    <section className="card">
      <h2>Keys and addresses</h2>

      <div className="row">
        <div className="k">Network</div>
        <div className="v">Midnight {networkId}</div>
      </div>

      {account ? (
        <CopyRow label="Coin public key" value={account.coinPublicKey} />
      ) : (
        <div className="row">
          <div className="k">Coin public key</div>
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

      <p className="note">
        Your coin public key is what every circuit checks before it accepts a
        filing from you. The two addresses are public and searchable.
      </p>
    </section>
  );
}
