import { CopyRow } from "./CopyRow";
import { ServiceUnavailable } from "./ServiceUnavailable";
import { useRegistrations } from "../lib/useRegistrations";

/**
 * The companies this deployer has onboarded, and the one thing it can do to
 * them.
 *
 * Shown only to the platform key, and not because the contents are secret —
 * `/api/registrations` is public, and every contract address on this page
 * already is. It is hidden from everyone else because it is not their question:
 * a visitor reading the network's own page does not need a list of customers,
 * and an employer needs their own contract, not the roll.
 *
 * ── What "deactivate" is, and is not ────────────────────────────────────────
 *
 * It writes one column in the registry. It does NOT touch the contract, and
 * cannot: `assignEmployer` is permanent and the employer keeps every power they
 * had a second earlier — filing, funding, paying, remitting. Contracts deployed
 * since `revoke` was added CAN be halted, but by a platform-signed transaction
 * from the payroll page, not by this column; instances older than that circuit
 * have no such lever at all. The card says so next to the button rather than in a
 * tooltip, because an operator who believes they have cut someone off when they
 * have not is worse off than one who was never offered the button.
 *
 * The lever that does bite is `setParamsFor`: platform-only, write-once per
 * period, so an employer whose future months are never recorded cannot file
 * them. That is not a button and should not become one — it works by omission,
 * and the window an employer already holds is one they keep.
 */
export function DeployerRegistry({ networkId }: { networkId: string }) {
  const { registrations, loading, error, pending, reachable, canWrite, setStatus } =
    useRegistrations(networkId);

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
      ) : registrations && registrations.length === 0 ? (
        <p className="muted">No companies registered on {networkId} yet.</p>
      ) : (
        registrations?.map((row) => {
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
              <button
                className="ghost"
                disabled={!canWrite || pending === row.instance}
                onClick={() =>
                  void setStatus(row.instance, inactive ? "active" : "inactive")
                }
              >
                {pending === row.instance
                  ? "Saving…"
                  : inactive
                    ? "Reactivate registration"
                    : "Deactivate registration"}
              </button>
            </div>
          );
        })
      )}

      {error ? <p className="status error">{error}</p> : null}

      {reachable && !canWrite ? (
        <ServiceUnavailable what="registration change" />
      ) : null}

      <p className="note">
        Deactivating ends the service registration. It does not end the
        employer's control of their contract — that was assigned once and cannot
        be taken back by anyone, including you. What it does change is what this
        platform vouches for. To stop an employer filing new months, stop
        recording rule sets for their future periods.
      </p>
    </section>
  );
}
