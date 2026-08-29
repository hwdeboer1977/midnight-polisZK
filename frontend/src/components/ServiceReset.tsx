// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { apiUrl } from "../lib/origin";

/**
 * Makes the service forget what it has deployed and who has signed up.
 *
 * A testing affordance for the operator, and the most destructive control in the
 * app — which is why it is two clicks and says what it costs on the second one
 * rather than in a note underneath.
 *
 * ── Why this one is NOT gated on `platformActions` ─────────────────────────
 *
 * The faucet and the mint button are, and the difference is who they are for.
 * Those are offered to EMPLOYERS on a hosted page, and an employer holds no
 * platform token — so the only way to authorise them from a browser would be to
 * ship one in the bundle, which `origin.ts` rightly refuses.
 *
 * This is for the operator, who does hold the token. It is typed in at the
 * moment of use, so nothing is published: the bundle carries no secret, and the
 * token lives in this component's state until the tab is closed. That makes the
 * control work wherever the operator happens to be, hosted or local, which is
 * the whole point of it.
 *
 * Deliberately not `localStorage`. A platform token written to disk on whatever
 * machine last touched the admin page is a worse trade than retyping it, and
 * this is a button pressed rarely by one person.
 *
 * Left blank it sends no header at all, which is right for a local service: with
 * no token configured `requirePlatformToken` passes everything through.
 *
 * ── What it destroys ────────────────────────────────────────────────────────
 *
 * `deployment.json` is the only record of an onboarded contract's address, and
 * an address is the only way back to a contract. `revokeEmployer` changes who
 * holds an instance but not this: a revoked seat is still a seat on a contract
 * nothing can find once its address is gone. On a service with real employers on
 * it this strands them. The confirmation says that in those words rather than
 * asking "are you sure?".
 */
export function ServiceReset() {
  const [token, setToken] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[] | null>(null);

  async function reset() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(apiUrl("/api/reset"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Omitted entirely when blank rather than sent empty: an empty bearer
          // is a wrong token, and a local service with no token configured
          // should not be made to refuse one.
          ...(token.trim() ? { authorization: `Bearer ${token.trim()}` } : {}),
        },
        // The same confirmation the route demands. Sent from here rather than
        // made a field the operator types: the second click IS the confirmation,
        // and asking them to spell a word only trains them to spell it.
        body: JSON.stringify({ confirm: "reset" }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        removed?: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? `Service returned ${response.status}`);
      setDone(body.removed ?? []);
      setConfirming(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  // No card of its own any more. It lives inside the operator page's Testing
  // tools disclosure, which supplies the frame and the warning that this is not
  // part of normal operation — a card inside a disclosure inside a band drew
  // three boxes around one button.
  return (
    <div className="reset-block">

      {done ? (
        <p className="ok-line">
          ✓ Cleared {done.length > 0 ? done.join(", ") : "nothing — there was no state to clear"}.
          The contract list now falls back to the copy that ships with this build,
          and any key that was blocked from signing up can sign up again.
        </p>
      ) : confirming ? (
        <>
          <p className="note">
            <strong>This cannot be undone.</strong> The address of every contract
            this service onboarded is deleted, and that record is the only place
            those addresses exist. An employer's contract was assigned to them
            permanently and stays theirs — but without its address nothing can
            reach it again. Safe on a test deployment; on a real one it strands
            every employer on it.
          </p>
          <p className="note">
            The token is the one this service was started with
            (<code>PLATFORM_TOKEN</code>). It is sent with this request and kept
            nowhere — closing the tab forgets it. Leave it empty against a local
            service started without one.
          </p>
          <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
            <input
              type="password"
              value={token}
              disabled={busy}
              placeholder="Platform token"
              autoComplete="off"
              style={{ minWidth: 280 }}
              onChange={(event) => setToken(event.target.value)}
            />
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => void reset()}
            >
              {busy ? "Clearing…" : "Yes, forget everything"}
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
        <button
          type="button"
          className="ghost danger-text"
          onClick={() => setConfirming(true)}
        >
          Reset local operator state
        </button>
      )}

      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}
