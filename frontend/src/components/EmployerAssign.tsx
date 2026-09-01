// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { CopyRow } from "./CopyRow";
import { useOnboarding } from "../lib/useOnboarding";
import { bytesToHex as hex, sameKey } from "../lib/keys";
import type { PayrollInstance } from "../lib/usePayrollInstances";

/**
 * Filling a vacant employer seat, from the operator's side.
 *
 * The mirror of the revoke action in `EmployerTable`, and the reason the two sit
 * together: revoking
 * empties a seat and nothing in this app could fill it again. `/api/onboard` was
 * reachable only from the employer's own registration page, which asks the
 * person at the keyboard for their key — so an operator revoking a company had
 * to send them back through signup to undo it, or fall back to the payroll CLI.
 *
 * ── Why the key is typed rather than read from the wallet ──────────────────
 *
 * The wallet connected here is the operator's. The key that goes on chain is
 * the employer's, and it is public — a coin public key discloses nothing and
 * proves nothing, which is why `/api/onboard` accepts one from anybody. Pasting
 * it is therefore the whole operation, and the risk is a typo rather than a
 * leak: a mistyped key assigns the contract to a keypair nobody holds, and
 * `assignEmployer` cannot be repeated, so undoing it means revoking first.
 * Hence the confirmation step, and hence the key echoed back before it.
 */
export function EmployerAssign({
  instances,
  onAssigned,
}: {
  instances: PayrollInstance[];
  onAssigned?: () => void;
}) {
  const [company, setCompany] = useState("");
  const [employerKey, setEmployerKey] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { job, submitting, unavailable, start } = useOnboarding();
  // `start` resolves when the job has been ACCEPTED, not when it has landed —
  // the assignment proves for minutes afterwards. Firing the refresh off the
  // promise would re-read the chain before the transaction existed and report
  // the seat as still vacant.
  const done = job?.status === "done";
  useEffect(() => {
    if (done) onAssigned?.();
  }, [done, onAssigned]);
  const busy = submitting || job?.status === "running";

  // Seats this wallet deployed and nobody holds. An occupied one is
  // the revoke action's business — `assignEmployer` asserts `!employerAssigned`
  // and would refuse after proving, which costs minutes to learn.
  const vacant = instances.filter(
    (instance) => instance.isPlatform && instance.state && !instance.state.employerAssigned
  );

  if (vacant.length === 0) return null;

  // The registry keys companies by slug, so it is derived from the name the
  // same way the employer's own registration derives it. One place where the
  // two flows must agree: a different slug for the same company is a second row
  // in the registry rather than an error anyone would see.
  const slug = company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const key = employerKey.trim().replace(/^0x/, "");
  const keyValid = /^[0-9a-f]{64}$/i.test(key);

  // A vacant contract that has been held before belongs to whoever held it.
  //
  // Checked here for the same reason `vacant` excludes occupied seats: the
  // contract asserts it, so getting it wrong is refused after minutes of
  // proving with "this contract belongs to another employer" — a true answer
  // arriving far too late to be useful. A seat nobody has ever held takes any
  // key, so its presence means nothing can be ruled out yet.
  const returning = vacant.filter((instance) => instance.state?.everAssigned);
  const anyFresh = returning.length < vacant.length;
  const acceptable = returning.map((instance) => hex(instance.state!.lastEmployer.bytes));
  const keyRefused =
    keyValid && !anyFresh && !acceptable.some((owner) => sameKey(owner, key));
  const ready = Boolean(slug) && keyValid && !keyRefused && !busy;

  return (
    <section className="card">
      <h2>Assign an employer</h2>
      <p className="lead-sm">
        Hands a vacant payroll contract to a company's signing key. Freeing it
        again is <strong>Revoke</strong> above, and it is a transaction of its
        own — but a revoked contract can only ever go back to the same employer,
        so this is not a way to move one company's contract to another.
      </p>

      {vacant.map((instance) => (
        <div key={instance.deployment.contractAddress}>
          <CopyRow label="Vacant contract" value={instance.deployment.contractAddress} />
          {instance.state?.everAssigned ? (
            <p className="note">
              Previously held, so this one is not free to give away: it goes back
              to <code>{hex(instance.state.lastEmployer.bytes).slice(0, 16)}…</code>{" "}
              or to nobody. The payroll already filed here is that employer's
              record, and the contract refuses any other key.
            </p>
          ) : null}
        </div>
      ))}

      {job?.status === "done" ? (
        <>
          <p className="ok-line">
            ✓ {job.result.instance} now holds {job.result.contractAddress.slice(0, 16)}…
          </p>
          <CopyRow label="Assignment" value={job.result.assignTxHash} />
          {job.result.periodsRecorded?.length ? (
            <p className="note">
              Rule sets recorded for {job.result.periodsRecorded.join(", ")} — an
              employer cannot file a period whose parameters were never written.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <label className="field">
            <span>Company name</span>
            <input
              type="text"
              value={company}
              disabled={busy}
              placeholder="Northwind Logistics"
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
          {slug ? <p className="note">Registered as <code>{slug}</code>.</p> : null}

          <label className="field">
            <span>Employer coin public key</span>
            <input
              type="text"
              value={employerKey}
              disabled={busy}
              placeholder="64 hex characters, from the company's own signing app"
              style={{ fontFamily: "monospace", fontSize: 12 }}
              onChange={(event) => setEmployerKey(event.target.value)}
            />
          </label>
          {employerKey.trim() && !keyValid ? (
            <p className="status error">
              A coin public key is 64 hex characters. The company's registration
              page shows theirs — the Bech32m form the wallet displays is not it.
            </p>
          ) : null}
          {keyRefused ? (
            <p className="status error">
              Every vacant contract here has been held before, and each one only
              takes its own employer back. This key holds none of them, so the
              contract would refuse the assignment — deploy a contract for this
              company instead.
            </p>
          ) : null}

          {/* Sent only when typed, exactly as the employer's own page sends it:
              the service ignores it unless SIGNUP_CODE is configured, so an open
              deployment and an invite-only one take the same request. An
              operator on an invite-only service is the person who set the code,
              so this is a field rather than a barrier. */}
          <label className="field">
            <span>Signup code (only if this service requires one)</span>
            <input
              type="password"
              value={signupCode}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setSignupCode(event.target.value)}
            />
          </label>

          {confirming ? (
            <>
              <p className="note">
                <code>{key}</code> becomes the employer of the contract above.
                Check it character for character: the assignment cannot be
                repeated, so a key nobody holds is undone only by revoking.
              </p>
              <div className="row-actions">
                <button
                  className="primary"
                  disabled={!ready}
                  onClick={() => {
                    setConfirming(false);
                    void start(slug, key, company.trim() || undefined, signupCode.trim() || undefined);
                  }}
                >
                  {busy ? "Assigning…" : "Confirm assignment"}
                </button>
                <button className="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button className="ghost" disabled={!ready} onClick={() => setConfirming(true)}>
              Assign this employer
            </button>
          )}
        </>
      )}

      {job?.status === "running" ? (
        <pre className="log">{job.log.join("\n")}</pre>
      ) : null}
      {job?.status === "failed" ? <p className="status error">{job.error}</p> : null}
      {unavailable ? (
        <p className="status error">
          The service is not reachable, and it is the only thing that can sign
          this — the contract's <code>platform</code> seed lives there, not in
          any wallet.
        </p>
      ) : null}
    </section>
  );
}
