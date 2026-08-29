// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { CopyRow } from "./CopyRow";
import { EmployerAssign } from "./EmployerAssign";
import { revokeEmployer } from "../lib/revokeEmployer";
import { walletCanProve } from "../lib/submitPayroll";
import { bytesToHex } from "../lib/keys";
import { useRegistrations, type Registration } from "../lib/useRegistrations";
import type { PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * Every payroll contract this platform deployed, and what can be done to it.
 *
 * One table where there were two cards. **Revoke an employer** listed the
 * contract and the employer key off the chain; **Registered employers** listed
 * the same contract and the same employer key out of the registry database, a
 * few centimetres apart, and neither said it was showing the other's row. The
 * duplication was not cosmetic — it left the operator to work out whether two
 * panels describing one company disagreed.
 *
 * They answer different questions, which is why both are still read. The chain
 * says who CONTROLS a contract; the registry says whether the platform still
 * VOUCHES for the company. A row that is active on chain and inactive in the
 * registry is not a contradiction — it is a subscription that lapsed while the
 * contract kept working. The status column now shows both, so the difference is
 * visible instead of implied.
 *
 * The chain is the spine. A contract assigned by hand has no registry row and
 * would have had no card at all under the old arrangement — which was exactly
 * the case revoke was first needed for.
 */
export function EmployerTable({
  instances,
  networkId,
  onChanged,
}: {
  instances: PayrollInstance[];
  networkId: string;
  onChanged?: () => void;
}) {
  const { registrations } = useRegistrations(networkId);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Only contracts this wallet deployed. `isPlatform` rather than
  // `role === "platform"`: role names one relationship and employer wins, so a
  // platform that assigned itself — which every local deployment does — would
  // vanish from its own table.
  const mine = instances.filter((instance) => instance.isPlatform);
  const vacant = mine.filter((instance) => instance.state && !instance.state.employerAssigned);

  const rowFor = (address: string): Registration | undefined =>
    (registrations ?? []).find(
      (row) => row.contractAddress.toLowerCase() === address.toLowerCase()
    );

  return (
    <>
      {mine.length === 0 ? (
        <p className="band-line">No payroll contracts deployed by this key on {networkId}.</p>
      ) : (
        <div className="op-table">
          <div className="op-row op-thead">
            <span>Employer</span>
            <span>Status</span>
            <span>Registered</span>
            <span>Contract</span>
            <span />
          </div>
          {mine.map((instance) => {
            const address = instance.deployment.contractAddress;
            const registration = rowFor(address);
            const assigned = Boolean(instance.state?.employerAssigned);
            const open = expanded === address;
            return (
              <div key={address} className={open ? "op-group open" : "op-group"}>
                <div className="op-row">
                  <span className="op-name">
                    {registration?.companyName ?? instance.name}
                  </span>
                  <span>
                    <Status assigned={assigned} registration={registration} />
                  </span>
                  <span className="op-muted">
                    {registration ? registration.registeredAt.slice(0, 10) : "—"}
                  </span>
                  <code className="op-addr" title={address}>
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </code>
                  <span>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setExpanded(open ? null : address)}
                    >
                      {open ? "Close" : "Manage"}
                    </button>
                  </span>
                </div>

                {open ? (
                  <div className="op-detail">
                    <CopyRow label="Contract" value={address} />
                    {instance.state?.employerAssigned ? (
                      <CopyRow
                        label="Employer key"
                        value={bytesToHex(instance.state.employer.bytes)}
                      />
                    ) : null}
                    {registration ? (
                      <p className="note" style={{ marginTop: 0 }}>
                        <code>{registration.instance}</code> · term{" "}
                        {registration.termMonths} months · expires{" "}
                        {registration.expiresAt.slice(0, 10)}
                      </p>
                    ) : (
                      <p className="note" style={{ marginTop: 0 }}>
                        No registry row — this contract was assigned outside the
                        signup flow, or its registration predates this service.
                        The chain is unaffected either way.
                      </p>
                    )}
                    {assigned ? (
                      <RevokeAction instance={instance} onRevoked={onChanged} />
                    ) : (
                      <p className="note">
                        This seat is vacant. Fill it below —{" "}
                        <code>assignEmployer</code> can be called exactly once
                        per contract.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Rendered once, under the table, rather than inside a vacant row: it is
          the same form whichever seat is empty, and there is only ever one. */}
      {vacant.length > 0 ? (
        <EmployerAssign instances={instances} onAssigned={onChanged} />
      ) : null}
    </>
  );
}

/**
 * Two facts in one cell, and never merged into one.
 *
 * On chain: is there an employer. In the registry: does the platform still
 * vouch for them. `status` is what was written; `effectiveStatus` also counts
 * an elapsed term, and the two are distinguished because "you deactivated them"
 * and "their term ran out" call for different actions.
 */
function Status({
  assigned,
  registration,
}: {
  assigned: boolean;
  registration?: Registration;
}) {
  if (!assigned) return <span className="op-status vacant">Vacant</span>;
  if (!registration) return <span className="op-status on">Active</span>;

  const inactive = registration.effectiveStatus === "inactive";
  const lapsed = registration.status === "active" && inactive;
  return (
    <>
      <span className="op-status on">Active</span>
      {inactive ? (
        <span className="op-status off" title="The registry, not the chain — this employer can still file">
          {lapsed ? "term elapsed" : "unregistered"}
        </span>
      ) : null}
    </>
  );
}

/**
 * Taking the employer seat back on one contract.
 *
 * ── What the deployer is agreeing to ───────────────────────────────────────
 *
 * Stated on the control rather than in a tooltip, because it is not recoverable
 * by clicking again: the employer loses the ability to file, fund, pay and
 * remit from the moment this confirms. Their history does not move — every
 * commitment, opening and remitted total stays exactly where it is — and the
 * seat can be filled again, including by the same key. That is the difference
 * worth showing: this suspends someone, it does not erase them.
 *
 * Deliberately NOT wired to the registry's status column, which sits in the
 * same row now. Ending a subscription and taking a customer's contract away are
 * one click apart in effect and a world apart in consequence; adjacent is fine,
 * merged is not.
 *
 * ── Wallet proving, ON by default ──────────────────────────────────────────
 *
 * The opposite of every other flow here, for a reason specific to this circuit.
 * Everywhere else the toggle defaults off, because proving consumes the witness
 * and the witness is salaries, or a termination opening — handing that to the
 * wallet means handing it wherever the wallet chooses to prove.
 *
 * `revokeEmployer` takes no arguments and reads no witness. Its entire input is
 * the caller's own public key, which the wallet already has and the chain is
 * about to see. There is nothing to leak, so the only thing left to weigh is
 * whether the operator has to run a proof server — and defaulting to "no" beats
 * a "Failed to fetch" from 127.0.0.1:6300. Still a checkbox rather than forced,
 * because a wallet that proves remotely may be slower or unavailable.
 */
function RevokeAction({
  instance,
  onRevoked,
}: {
  instance: PayrollInstance;
  onRevoked?: () => void;
}) {
  const { api, networkId } = useWallet();
  const canDelegate = api ? walletCanProve(api) : false;
  const [delegateProving, setDelegateProving] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!api) {
      setError("Connect the platform wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await revokeEmployer({
        api,
        networkId,
        contractAddress: instance.deployment.contractAddress,
        provingMode: delegateProving && canDelegate ? "wallet" : "local",
        onProgress: setProgress,
      });
      setTxHash(result.txHash);
      setConfirming(false);
      // Re-read the chain rather than assuming: the row flipping to Vacant is
      // what tells the operator it landed, and it should say so because the
      // contract says so.
      onRevoked?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  if (txHash) {
    return <p className="status ok">Revoked. Tx {txHash.slice(0, 16)}…</p>;
  }

  return (
    <div className="op-danger">
      {confirming ? (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            This employer stops being able to file, fund, pay or remit. Their
            payroll history is untouched, and the seat can be assigned again
            afterwards — to them or to anyone else.
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
                ? "— no proof server needed here. This circuit takes no private input, so nothing is disclosed by proving it elsewhere."
                : "— this wallet cannot prove, so a proof server on this machine at 127.0.0.1:6300 is required."}
            </span>
          </label>
          <div className="row-actions">
            <button type="button" className="danger" disabled={busy} onClick={() => void run()}>
              {busy ? "Revoking…" : "Confirm revoke"}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="ghost danger-text" onClick={() => setConfirming(true)}>
          Revoke employer
        </button>
      )}
      {busy && progress ? <p className="muted">{progress}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}
