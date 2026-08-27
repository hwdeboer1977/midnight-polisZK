import { useState } from "react";
import { ServiceUnavailable } from "./ServiceUnavailable";
import { apiUrl, platformActions } from "../lib/origin";

/**
 * Makes the service forget what it has deployed and who has signed up.
 *
 * A testing affordance for the operator, and the most destructive control in the
 * app — which is why it is two clicks and says what it costs on the second one
 * rather than in a note underneath.
 *
 * ── Why this cannot work on the hosted page ─────────────────────────────────
 *
 * Gated on `platformActions`, exactly like the faucet and the mint button, and
 * for the same reason `origin.ts` sets out at length: `/api/reset` sits behind
 * the platform bearer token, and a token shipped in a Vite bundle is a token
 * published. So this is an operator action available where the operator is — on
 * their own machine, through the dev proxy. On a hosted build the control still
 * renders and explains itself, because a button that silently vanishes teaches
 * nobody where it went.
 *
 * ── What it destroys ────────────────────────────────────────────────────────
 *
 * `deployment.json` is the only record of an onboarded contract's address, and
 * `assignEmployer` can be called once — so a contract already bound to an
 * employer is theirs permanently, and once its address is gone nothing can reach
 * it again. On a service with real employers on it this strands them. The
 * confirmation says that in those words rather than asking "are you sure?".
 */
export function ServiceReset() {
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
        headers: { "content-type": "application/json" },
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

  return (
    <section className="card">
      <h2>Reset this service</h2>
      <p className="lead-sm">
        Forgets every contract this service has deployed and every employer key
        that has signed up. For testing.
      </p>

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
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={busy || !platformActions}
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
          className="ghost"
          disabled={!platformActions}
          onClick={() => setConfirming(true)}
        >
          Reset the service
        </button>
      )}

      {error ? <p className="status error">{error}</p> : null}
      {!platformActions ? <ServiceUnavailable what="service reset" /> : null}
    </section>
  );
}
