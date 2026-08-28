import { useState } from "react";
import { CopyRow } from "./CopyRow";
import { revokeEmployer } from "../lib/revokeEmployer";
import { walletCanProve } from "../lib/submitPayroll";
import { bytesToHex } from "../lib/keys";
import type { PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * The platform's one lever over a live contract: taking the employer seat back.
 *
 * ── Why this reads the chain rather than the registry ──────────────────────
 *
 * The obvious home for this was a button on each row of `DeployerRegistry`, next
 * to "Deactivate registration". It is the wrong home twice over. The registry is
 * a Postgres table of companies that signed up through onboarding, so a contract
 * whose employer was assigned by hand has no row in it and would get no button —
 * which is exactly the case this is first being used for. And putting revoke
 * beside deactivate invites the misread those two cards work hard to prevent:
 * one ends a subscription and is reversible bookkeeping, the other is a chain
 * write that takes a customer's payroll contract away.
 *
 * So the source here is `usePayrollInstances`, which reads `employerAssigned`
 * and `employer` off the contract itself. A seat is offered for revocation when
 * the chain says it is occupied, whatever any database thinks.
 *
 * ── What the deployer is agreeing to ───────────────────────────────────────
 *
 * Stated on the card rather than in a tooltip, because it is not recoverable by
 * clicking again: the employer loses the ability to file, fund, pay and remit
 * from the moment this confirms. Their history does not move — every commitment,
 * opening and remitted total stays exactly where it is — and the seat can be
 * filled again, including by the same key. That is the difference worth showing:
 * this suspends someone, it does not erase them.
 */
export function EmployerRevoke({
  instances,
  onRevoked,
}: {
  instances: PayrollInstance[];
  onRevoked?: () => void;
}) {
  const { api, networkId } = useWallet();

  /**
   * Wallet proving, ON by default — the opposite of every other flow here, and
   * for a reason specific to this circuit.
   *
   * Everywhere else the toggle defaults off and carries a warning, because
   * proving consumes the witness and the witness is salaries, or a termination
   * opening. Handing that to the wallet means handing it wherever the wallet
   * chooses to prove, which is a privacy decision the page cannot make for
   * someone.
   *
   * `revokeEmployer` takes no arguments and reads no witness. Its entire input
   * is the caller's own public key, which the wallet already has and the chain
   * is about to see. There is nothing to leak, so the only thing left to weigh
   * is whether the operator has to run a proof server — and defaulting to "no"
   * is plainly better than a "Failed to fetch" from 127.0.0.1:6300.
   *
   * Still a checkbox rather than forced, because a wallet that proves remotely
   * may simply be slower or unavailable, and local proving must stay reachable.
   *
   * ── On the `fundWithholding` failure, which is not this ───────────────────
   *
   * Delegated proving failed there with `expected header tag
   * 'midnight:proof-versioned:', got 'midnight:vec(option(u64))'`, and the first
   * reading was "the wallet's prover disagrees with this build" — which would
   * have made this default wrong. It is not that: `setPayroll`, `fundEmployee`
   * and `payEmployee` all prove through the wallet on this same build.
   *
   * What distinguishes `fundWithholding` is that it calls `receiveShielded`
   * TWICE — two coins into the contract in one transaction, where every call
   * that works moves one or none. A `vec(…)` surfacing where a single proof was
   * expected fits a per-segment result the adapter reads as one proof.
   *
   * `revokeEmployer` moves no coins at all. It is the simplest transaction the
   * contract has, so it sits at the opposite end of whatever that is — which is
   * why the default stays ON here.
   */
  const canDelegate = api ? walletCanProve(api) : false;
  const [delegateProving, setDelegateProving] = useState(true);

  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<{ address: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only contracts this wallet is the platform of, and only those with someone
  // to revoke. A vacant seat needs `assignEmployer`, not this.
  const revocable = instances.filter(
    (instance) => instance.role === "platform" && instance.state?.employerAssigned
  );

  if (revocable.length === 0) return null;

  async function run(instance: PayrollInstance) {
    if (!api) {
      setError("Connect the platform wallet first.");
      return;
    }
    const address = instance.deployment.contractAddress;
    setPending(address);
    setError(null);
    setResult(null);
    try {
      const { txHash } = await revokeEmployer({
        api,
        networkId,
        contractAddress: address,
        provingMode: delegateProving && canDelegate ? "wallet" : "local",
        onProgress: setProgress,
      });
      setResult({ address, txHash });
      setConfirming(null);
      // Re-read the chain rather than assuming: the button disappearing is what
      // tells the deployer it actually landed, and it should say so because the
      // contract says so.
      onRevoked?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(null);
      setProgress("");
    }
  }

  return (
    <section className="card">
      <h2>Revoke an employer</h2>
      <p className="lead-sm">
        Takes the employer seat back on a contract you deployed. Only the
        platform key sees this.
      </p>

      {revocable.map((instance) => {
        const address = instance.deployment.contractAddress;
        const busy = pending === address;
        return (
          <div key={address} className="registry-row">
            <div className="registry-head">
              <span className="registry-name">{instance.name}</span>
              <span className="registry-status on">employer assigned</span>
            </div>
            <CopyRow label="Contract" value={address} />
            <CopyRow
              label="Employer key"
              value={instance.state ? bytesToHex(instance.state.employer.bytes) : ""}
            />

            {confirming === address ? (
              <>
                <p className="note" style={{ marginTop: 0 }}>
                  This employer stops being able to file, fund, pay or remit.
                  Their payroll history is untouched, and you can assign the seat
                  again afterwards — to them or to anyone else.
                </p>
                <label className="prove-here">
                  <input
                    type="checkbox"
                    checked={delegateProving && canDelegate}
                    disabled={busy || !canDelegate}
                    onChange={(event) => setDelegateProving(event.target.checked)}
                  />{" "}
                  Let the wallet generate the proof
                  <span className="muted">
                    {" "}
                    {canDelegate
                      ? "— no proof server needed on this machine. This circuit " +
                        "takes no private input, so nothing is disclosed by proving " +
                        "it elsewhere."
                      : "— this wallet cannot prove, so a proof server on this " +
                        "machine at 127.0.0.1:6300 is required."}
                  </span>
                </label>
                <div className="row-actions">
                  <button className="ghost" disabled={busy} onClick={() => void run(instance)}>
                    {busy ? "Revoking…" : "Confirm revoke"}
                  </button>
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <button className="ghost" onClick={() => setConfirming(address)}>
                Revoke employer
              </button>
            )}

            {busy && progress ? <p className="muted">{progress}</p> : null}
            {result?.address === address ? (
              <p className="status ok">Revoked. Tx {result.txHash.slice(0, 16)}…</p>
            ) : null}
          </div>
        );
      })}

      {error ? <p className="status error">{error}</p> : null}
    </section>
  );
}
