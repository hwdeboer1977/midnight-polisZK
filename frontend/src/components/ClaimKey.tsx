import { useState } from "react";
import { CopyRow } from "./CopyRow";
import { deriveClaimIdentity } from "../lib/claimKey";

/**
 * The employee's claim key, derived here and never sent anywhere.
 *
 * This is the piece that has to happen BEFORE she is dismissed, which is worth
 * being blunt about on the page: her employer writes `hash(claimKey)` into the
 * termination attestation, and that attestation is write-once. An employee who
 * turns up afterwards with a freshly chosen passphrase has an anchor she cannot
 * open, and no correction is possible short of re-filing the period.
 *
 * Only the hash is shown. The key itself is the nullifier secret — the one
 * value that decides whether two of her claims can be linked to each other —
 * and a page that displays it invites it into a screenshot, a chat, or a
 * password manager shared with an employer. She re-derives it from the
 * passphrase at claim time, which is the whole point of deriving rather than
 * generating.
 */
export function ClaimKey({
  coinPublicKey,
  bare,
}: {
  coinPublicKey: string;
  bare?: boolean;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && passphrase !== confirm;

  async function derive() {
    setError(null);
    setHash(null);
    setBusy(true);
    try {
      const identity = await deriveClaimIdentity(passphrase, coinPublicKey);
      setHash(identity.claimKeyHash);
      // Held no longer than the derivation needs it. The hash is public; the
      // passphrase is hers, and this page has no reason to keep either.
      setPassphrase("");
      setConfirm("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      <p className="note" style={{ marginTop: 0 }}>
        A claim key is what lets you prove a future benefit claim is yours
        without anyone being able to recognise you — not the fund, not your
        employer, not an observer reading the chain. You do not store it. You
        choose a passphrase, and the key is derived from it whenever you need it.
      </p>
      {/* Paired with the same note on the payroll keys above. The two values
          look alike and go to different places, and each is unusable in the
          other's slot. */}
      <p className="note">
        <strong>This is not one of your wallet keys.</strong> Those identify you
        for the roster, so your employer can file and pay you. This one is
        rooted in a passphrase instead — precisely so that nobody who has ever
        paid you can recognise a claim as yours.
      </p>

      <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          type="password"
          value={passphrase}
          disabled={busy}
          placeholder="Choose a passphrase"
          autoComplete="new-password"
          style={{ minWidth: 260 }}
          onChange={(event) => setPassphrase(event.target.value)}
        />
        <input
          type="password"
          value={confirm}
          disabled={busy}
          placeholder="Type it again"
          autoComplete="new-password"
          style={{ minWidth: 260 }}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <button
          type="button"
          className="primary"
          disabled={busy || !passphrase || passphrase !== confirm}
          onClick={() => void derive()}
        >
          {busy ? "Deriving…" : "Derive my claim key"}
        </button>
      </div>

      {/* Typed twice because a typo is undetectable later: it derives a
          different key, your employer anchors that one, and the claim it
          unlocks is one you cannot open. */}
      {mismatch ? <p className="problems">The two do not match.</p> : null}
      {error ? <p className="problems">{error}</p> : null}

      {hash ? (
        <>
          <p className="ok-line">✓ Derived — send the hash below to your employer</p>
          <CopyRow label="Claim key hash" value={hash} />
          <p className="note">
            Safe to send: it is a hash, and it gives your employer no way to
            claim anything. They write it into the statement that ends your
            employment, so they need it <strong>before</strong> that statement
            is made — it cannot be added afterwards.
          </p>
          <p className="problems" style={{ marginTop: 12 }}>
            Your passphrase is the only way back to this key. It is not stored
            here, it is not recoverable, and nobody can reset it. Forget it and
            the anchor your employer published becomes one you cannot open.
          </p>
        </>
      ) : null}

      <details className="details" style={{ marginTop: 12 }}>
        <summary>Why a passphrase and not my wallet?</summary>
        <p className="note">
          A page cannot read your wallet's seed — no extension will hand one
          over, and that is correct. Deriving from a wallet signature fails for a
          different reason: the connector signs non-deterministically, so the
          same message would give a different key every time and nothing you
          derived would be reproducible.
        </p>
        <p className="note">
          The passphrase is salted with your own coin public key, so two people
          who happen to choose the same words still get different claim keys.
          The same passphrase in any browser, with this wallet connected, gives
          you the same key back.
        </p>
      </details>
    </>
  );

  if (bare) return body;

  return (
    <section className="callout">
      <h2>Your claim key</h2>
      {body}
    </section>
  );
}
