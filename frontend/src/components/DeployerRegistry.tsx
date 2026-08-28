import { CopyRow } from "./CopyRow";
import { useRegistrations } from "../lib/useRegistrations";
import { isPinned } from "../lib/deployments";

/**
 * The companies this deployer has onboarded. Read-only.
 *
 * Shown only to the platform key, and not because the contents are secret —
 * `/api/registrations` is public, and every contract address on this page
 * already is. It is hidden from everyone else because it is not their question:
 * a visitor reading the network's own page does not need a list of customers,
 * and an employer needs their own contract, not the roll.
 *
 * ── Why there is no button on it ───────────────────────────────────────────
 *
 * There was one: a toggle writing the registry's `status` column. It had to
 * carry two paragraphs explaining that pressing it changed nothing an employer
 * could feel — no transaction, no loss of any power — and an operator who
 * believes they have cut someone off when they have not is worse off than one
 * who was never offered the button.
 *
 * `revokeEmployer` is what cuts someone off, it is one card up, and it says so
 * plainly. With a control that works, a control that only looks like it works is
 * a liability. The status column still exists and `/api/platform/registrations/
 * status` still writes it, for an operator who wants the bookkeeping — it is
 * simply not a button here.
 *
 * The other lever that bites is `setParamsFor`: platform-only, write-once per
 * period, so an employer whose future months are never recorded cannot file
 * them. That is not a button either and should not become one — it works by
 * omission, and the window an employer already holds is one they keep.
 */
export function DeployerRegistry({ networkId }: { networkId: string }) {
  const { registrations, loading, error, reachable } = useRegistrations(networkId);

  /**
   * Hidden rather than shown-and-broken.
   *
   * `isPinned` now answers a narrower question than it used to. It began as
   * "was this compiled from source this build can transact with" — a real
   * problem, since a verifier-key mismatch surfaces as a wall of text at submit.
   * It resolves to `payroll_address`, so what it actually asks today is "is this
   * the contract this deployment runs", and rows for earlier contracts fail it
   * whatever they were compiled from.
   *
   * Both reasons point the same way and the copy below states the current one.
   * The registry keeps every company it ever onboarded — across redeployments,
   * across contract versions — and has no idea which contract is live, so the
   * filter has to happen here.
   *
   * The rows still exist in the registry and this changes nothing about them —
   * `/api/reset` does not clear registrations either, since they live in the
   * database rather than in the two files it removes.
   */
  const shown = (registrations ?? []).filter((row) => isPinned(row.contractAddress));

  return (
    <section className="card">
      <h2>Registered employers</h2>
      <p className="lead-sm">
        Companies you have onboarded on {networkId}. Only the platform key sees
        this.
      </p>

      {!reachable ? (
        <p className="note">
          This deployment has no registry service configured, so there is nothing
          to list. The registrations live in the operator's database, not on
          chain.
        </p>
      ) : loading && !registrations ? (
        <p className="muted">Reading the registry…</p>
      ) : registrations && shown.length === 0 ? (
        <p className="muted">No companies registered on {networkId} yet.</p>
      ) : (
        shown.map((row) => {
          const inactive = row.effectiveStatus === "inactive";
          // `status` is what was written; `effectiveStatus` also counts an
          // elapsed term. Distinguished here because "you deactivated them" and
          // "their term ran out" call for different actions from the operator.
          const lapsed = row.status === "active" && inactive;
          return (
            <div key={row.instance} className="registry-row">
              <div className="registry-head">
                <span className="registry-name">{row.companyName}</span>
                <span className={`registry-status ${inactive ? "off" : "on"}`}>
                  {lapsed ? "term elapsed" : inactive ? "inactive" : "active"}
                </span>
              </div>
              <p className="note" style={{ marginTop: 0 }}>
                <code>{row.instance}</code> · registered{" "}
                {row.registeredAt.slice(0, 10)} · term {row.termMonths} months ·
                expires {row.expiresAt.slice(0, 10)}
              </p>
              <CopyRow label="Contract" value={row.contractAddress} />
              <CopyRow label="Employer key" value={row.employerKey} />
            </div>
          );
        })
      )}

      {error ? <p className="status error">{error}</p> : null}

      <p className="note">
        This list is what the platform vouches for, not what the chain enforces.
        A row here cannot give anyone control of a contract and cannot take it
        away. To stop an employer filing, use <strong>Revoke an employer</strong>{" "}
        above — that one is a chain transaction.
      </p>
    </section>
  );
}
