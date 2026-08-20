import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WalletPicker } from "../components/WalletPicker";
import { fetchContractState } from "../lib/chain";
import { loadContract, type PayrollLedger } from "../lib/contracts";
import { CopyRow } from "../components/CopyRow";
import { formatPeur } from "../lib/format";
import {
  forNetwork,
  loadDeployments,
  type Deployment,
  type Deployments,
} from "../lib/deployments";
import { periodName } from "../generated/roster";
import { bytesToHex, keyToHex } from "../lib/keys";
import { useWallet } from "../wallet/WalletContext";

interface Attestation {
  period: number;
  slot: number;
  employer: string;
  contractAddress: string;
  paid: boolean;
  funded: boolean;
  /** The commitment published for this slot — opaque without the opening. */
  commitment: string;
}

/**
 * The worker's own view: which periods name them, and what they were paid.
 *
 * This is the half of the system that makes the social-protection story more
 * than a slogan. The employee is not merely receiving money — they are
 * accumulating evidence of employment that they hold themselves, that no
 * employer can revoke, and that reveals nothing to anyone they do not show it
 * to.
 *
 * Every row is derived, never fetched from a server that could be lying:
 * `payeeFor` publishes a hash of the payee's coin public key, so the wallet
 * that holds the key can recognise its own slots and nobody else's. The amount
 * comes from the coin in the wallet, not from the chain — the chain never knew
 * it.
 */
export function Employee() {
  const { account, networkId, wallet } = useWallet();
  const [rows, setRows] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [deployments, setDeployments] = useState<Deployments | null>(null);

  useEffect(() => {
    if (!account) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const deployments = await loadDeployments();
        if (!cancelled) setDeployments(deployments);
        const payrolls = forNetwork(deployments, networkId).filter(
          ([, d]) => d.contractName === "payroll"
        );
        if (payrolls.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const contract = await loadContract("payroll");
        const module = contract as unknown as {
          pureCircuits: { payeeHash: (key: { bytes: Uint8Array }) => Uint8Array };
        };

        // The same hash the circuit checks, computed with the contract's own
        // pure circuit rather than a TypeScript re-implementation that could
        // drift from the struct encoding Compact uses.
        const mine = bytesToHex(
          module.pureCircuits.payeeHash({
            bytes: fromHex(keyToHex(account.coinPublicKey)),
          })
        );

        const found: Attestation[] = [];
        for (const [name, deployment] of payrolls) {
          const state = await fetchContractState(networkId, deployment.contractAddress);
          if (!state) continue;

          let ledger: PayrollLedger;
          try {
            ledger = contract.ledger(state.data) as PayrollLedger;
          } catch {
            continue;
          }

          for (const period of [...ledger.periods]) {
            if (!ledger.payeeFor.member(period)) continue;
            const payees = ledger.payeeFor.lookup(period);
            const count = ledger.employeeCountFor.member(period)
              ? Number(ledger.employeeCountFor.lookup(period))
              : 0;

            for (let slot = 0; slot < count; slot += 1) {
              const key = BigInt(slot);
              if (!payees.member(key)) continue;
              if (bytesToHex(payees.lookup(key)) !== mine) continue;

              found.push({
                period: Number(period),
                slot,
                employer: employerLabel(name, deployment),
                contractAddress: deployment.contractAddress,
                paid: ledger.paidFor.member(period) && ledger.paidFor.lookup(period).member(key)
                  ? ledger.paidFor.lookup(period).lookup(key)
                  : false,
                funded: ledger.fundedFor.member(period) && ledger.fundedFor.lookup(period).member(key)
                  ? ledger.fundedFor.lookup(period).lookup(key)
                  : false,
                commitment: ledger.commitmentsFor.member(period) &&
                  ledger.commitmentsFor.lookup(period).member(key)
                  ? bytesToHex(ledger.commitmentsFor.lookup(period).lookup(key))
                  : "",
              });
            }
          }
        }

        found.sort((a, b) => b.period - a.period);
        if (!cancelled) setRows(found);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, networkId]);

  if (!account) {
    return (
      <>
        <section className="area-head">
          <h1>Your income</h1>
          <p className="lede">
            Connect the wallet you gave your employer. It is the only thing that
            can recognise which payroll periods are yours.
          </p>
        </section>
        <WalletPicker />
      </>
    );
  }

  const tokenId = deployments
    ? Object.values(deployments).find(
        (d) => d.contractName === "peur" && d.networkId === networkId
      )?.tokenId
    : undefined;
  const balance = tokenId
    ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))?.[1] ?? 0n
    : 0n;

  const paid = rows.filter((row) => row.paid);
  const walletName = wallet?.name || wallet?.rdns || null;

  return (
    <>
      <section className="area-head">
        <h1>Your income</h1>
        <p className="lede">
          Only you can see these figures. They are not hidden behind a login —
          they were never published.
        </p>
      </section>

      {error ? <p className="status error">{error}</p> : null}

      {loading ? (
        <p className="muted">Checking payroll contracts for periods that name you…</p>
      ) : rows.length === 0 ? (
        <>
          {/* Plain language first. Someone who cannot see their pay needs to
              know what to check, not how a commitment scheme works. */}
          <section className="card">
            <h2>No payroll found</h2>
            <p className="lead-sm" style={{ marginTop: 0 }}>
              We couldn't find any payroll periods for this wallet. If your
              employer has already added you, check that they used the correct
              wallet keys.
            </p>
            <div className="actions">
              <button onClick={() => setShowKeys((open) => !open)}>
                {showKeys ? "Hide my payroll keys" : "View my payroll keys"}
              </button>
            </div>
          </section>

          {showKeys ? (
            <PayrollKeys account={account} wallet={walletName} />
          ) : null}

          <details className="details">
            <summary>Why can't I see my payroll?</summary>
            <p className="note">
              Your employer files a hash of your <strong>coin public key</strong>{" "}
              for each period, and this page finds your periods by recomputing
              that hash from the wallet you have connected. A different wallet,
              or a mistyped key, produces a different hash and matches nothing —
              which is what an empty list here usually means.
            </p>
            <p className="note">
              Your pay is sent as a shielded coin, and a coin can only be found
              by someone whose <strong>encryption public key</strong> the
              transaction was built with. If your employer filed the first key
              but not the second, the payment succeeded, the contract marked it
              paid, and your wallet can never see it. Both keys, every time.
            </p>
            <p className="note">
              Nothing about you is published, so there is nobody to ask on your
              behalf: send your employer both keys again and have them re-file
              the period.
            </p>
          </details>
        </>
      ) : (
        <>
          <section className="card headline">
            <div className="headline-value">€{formatPeur(balance)}</div>
            <div className="headline-label">
              pEUR in your wallet ·{" "}
              {paid.length === 1 ? "1 period" : `${paid.length} periods`} received
            </div>
            <p className="ok-line" style={{ margin: "10px 0 0" }}>
              ✓ Received privately
            </p>
          </section>

          <section className="card">
            <h2>Payroll periods</h2>
            <table className="roster">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Employer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.contractAddress}-${row.period}-${row.slot}`}>
                    <td>{periodName(row.period)}</td>
                    <td className="muted">{row.employer}</td>
                    <td>
                      {row.paid ? (
                        <span className="ok-line">✓ Received</span>
                      ) : row.funded ? (
                        <span className="muted">Awaiting payday</span>
                      ) : (
                        <span className="muted">Filed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              Each row is an employer's on-chain statement that a period names
              your key — evidence of employment you hold yourself, that no
              employer can withdraw and no observer can read.
            </p>
          </section>

          <section className="callout">
            <h2>Private by design</h2>
            <p className="note" style={{ marginTop: 0 }}>
              Your individual salary and payment history are visible to your
              wallet, but are not published on chain. What anyone else can see is
              that a period had a payee — never who, and never for how much.
            </p>
          </section>

          <details className="details">
            <summary>About payslip breakdown</summary>
            <p className="note">
              The current prototype records and privately pays gross salary only.
              Tax and social-contribution breakdowns are not yet included.
            </p>
            <p className="note">
              Per-period amounts are not listed above because your wallet reports
              one balance rather than the individual coins behind it. The amount
              for a given month is in the coin that month paid you.
            </p>
            <details className="details">
              <summary>Technical details</summary>
              <p className="note">
                Your employer publishes a commitment per period: a hash of your
                gross salary and a secret nonce, which fixes the figure at filing
                time without revealing it. Opening it needs the gross salary and
                the nonce together.
              </p>
              <p className="note">
                You cannot open it yet. The opening is sealed to the employer's
                key, and the SDK exposes no way to encrypt a payload to your
                encryption public key. The workable fix is to derive the
                commitment nonce from the coin nonce, which your wallet already
                learns when your pay arrives — then this page could open your own
                line with nothing extra published.
              </p>
              <p className="note">
                What is already guaranteed: the amount that reached you is the
                amount the contract was required to send, because the circuit
                refuses a coin whose value is not the committed one.
              </p>
            </details>
          </details>

          <details className="details">
            <summary>My payroll keys</summary>
            <PayrollKeys account={account} wallet={walletName} bare />
          </details>
        </>
      )}
    </>
  );
}

/**
 * The two public keys an employer needs, and whose they are.
 *
 * Naming the wallet matters more than it looks. Someone can arrive here as an
 * employer, see a panel headed "My payroll keys", and reasonably wonder whose
 * keys they are being shown — the answer is always "the connected wallet's",
 * but a heading in the first person does not say that.
 */
function PayrollKeys({
  account,
  wallet,
  bare,
}: {
  account: { coinPublicKey: string; encryptionPublicKey: string };
  wallet?: string | null;
  bare?: boolean;
}) {
  const rows = (
    <>
      <p className="note" style={{ marginTop: 0 }}>
        These are the keys of the connected wallet
        {wallet ? ` (${wallet})` : ""}. Anyone connecting a different wallet sees
        that wallet's keys here instead.
      </p>
      <CopyRow label="Coin public key" value={account.coinPublicKey} />
      <CopyRow label="Encryption public key" value={account.encryptionPublicKey} />
      <p className="note">
        Send your employer both. Neither is a secret and neither lets anyone
        spend your pay — the first identifies you, the second is what your coin
        is encrypted to. With only the first, a payment is made that you can
        never see.
      </p>
    </>
  );
  return bare ? (
    rows
  ) : (
    <section className="callout">
      <h2>My payroll keys</h2>
      {rows}
    </section>
  );
}

function employerLabel(name: string, deployment: Deployment): string {
  return (
    deployment.instance ??
    name.replace(/^.*payroll:?/, "") ??
    deployment.contractAddress.slice(0, 10)
  );
}

function fromHex(value: string): Uint8Array {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
