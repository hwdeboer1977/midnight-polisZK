import { useEffect, useState } from "react";
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
/**
 * Where a previously derived hash is remembered.
 *
 * Only the hash — it is public, it is what the employer publishes, and it gives
 * nobody a way to claim. The KEY is never stored anywhere, which is the whole
 * arrangement: it exists only while a passphrase is being turned into one.
 *
 * Keyed by coin public key so two employees sharing a browser do not see each
 * other's, and so switching wallets does not show the wrong one.
 */
function remembered(coinPublicKey: string): string | null {
  try {
    return window.localStorage.getItem(`polisZK/claim-key-hash/${coinPublicKey}`);
  } catch {
    return null;
  }
}

function remember(coinPublicKey: string, hash: string): void {
  try {
    window.localStorage.setItem(`polisZK/claim-key-hash/${coinPublicKey}`, hash);
  } catch {
    // A browser refusing storage costs the reminder, not the key — she can
    // still derive it, and the employer still holds the hash.
  }
}

export function ClaimKey({
  coinPublicKey,
  bare,
  employerOf,
  ended,
}: {
  coinPublicKey: string;
  bare?: boolean;
  /**
   * The instance this wallet is the EMPLOYER of, if any.
   *
   * An employer's own wallet is not a claimant, and telling one to send a hash
   * to their employer is telling them to send it to themselves. Harmless while
   * testing with one wallet; obviously wrong to anyone reading the page.
   */
  employerOf?: string | null;
  /**
   * Whether an employer has already attested a final period for this wallet.
   *
   * It changes what this panel means entirely. Before termination, deriving a
   * key is something to do in time. After it, the anchor is already written and
   * the only question is whether a passphrase reproduces it — which this page
   * cannot answer, because the hash sits inside an opaque commitment. The claim
   * bundle carries it in the clear, so the check happens at claim time and
   * reports precisely.
   */
  ended?: boolean;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Whether this browser has seen her derive one before. */
  const [known, setKnown] = useState<string | null>(null);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setKnown(remembered(coinPublicKey));
    setHash(null);
    setReopened(false);
  }, [coinPublicKey]);

  const mismatch = confirm.length > 0 && passphrase !== confirm;

  if (employerOf && !known && !hash) {
    return (
      <section className="callout">
        <h2>Claim keys are for employees</h2>
        <p className="note" style={{ marginTop: 0 }}>
          This wallet is the employer of <strong>{employerOf}</strong>, so it has
          no benefit to claim — a claim needs the wallet a period was filed
          <em> for</em>, and yours files them. Your employees each derive their
          own key here and send you the hash.
        </p>
      </section>
    );
  }

  async function derive() {
    setError(null);
    setHash(null);
    setBusy(true);
    try {
      const identity = await deriveClaimIdentity(passphrase, coinPublicKey);
      setHash(identity.claimKeyHash);
      remember(coinPublicKey, identity.claimKeyHash);
      setKnown(identity.claimKeyHash);
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
      {ended ? (
        <p className="note" style={{ marginTop: 0 }}>
          <strong>Use the passphrase you gave your employer.</strong> Your
          employment has ended, so the hash inside that statement is already
          fixed — deriving the same key again is exactly what the claim below
          needs. If you never chose one, no passphrase will match, and the claim
          will say so rather than failing obscurely.
        </p>
      ) : (
        /* Said before deriving, not only after. The consequence of leaving it
           until you need it is that you cannot do it at all. */
        <p className="problems" style={{ marginTop: 0 }}>
          Do this while you are still employed. Your employer writes the hash
          into the statement that ends your employment, and that statement can
          only be made once — so a claim key chosen afterwards is one no claim
          can use.
        </p>
      )}

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

  // Already done, on this browser, and not being redone: one green line rather
  // than a panel. It is the first thing on the page while it is outstanding and
  // should stop being the loudest thing the moment it is not.
  if (known && !hash && !reopened) {
    return (
      <section className="callout claim-key-done">
        {/* The employer case has to be handled here too, not only before a key
            exists. A wallet that has already derived one falls straight through
            to this panel — which is how it came to tell an employer to send
            themselves a hash. */}
        {employerOf ? (
          <p className="ok-line" style={{ margin: 0 }}>
            ✓ Claim key set up — for wherever <em>you</em> are an employee
          </p>
        ) : (
          <p className="ok-line" style={{ margin: 0 }}>
            ✓ Claim key set up — give your employer this hash before they end your
            employment
          </p>
        )}
        <CopyRow label="Claim key hash" value={known} />
        {employerOf ? (
          <p className="note" style={{ marginTop: 8 }}>
            This wallet is the employer of <strong>{employerOf}</strong>, so it
            has nothing to claim there. A key is still worth having if you are
            also on someone else's payroll on IncomeLayerZK — it is derived from
            your passphrase and your own wallet, not from any one employer, so
            the same hash works wherever you are an employee.
          </p>
        ) : (
          <p className="note" style={{ marginTop: 8 }}>
            Remembered by this browser, not by the chain — nothing anywhere
            records that you have one until your employer writes it into a
            termination. On another browser this will look unset; deriving it
            again from the same passphrase gives the same hash.
          </p>
        )}
        {/* Its own line. Inside the paragraph it landed between "same" and
            "hash", which read as a rendering fault rather than a control. */}
        {/* Worded without "your employer", so it is still true on a wallet that
            has none. The risk is the same either way: an anchor is write-once
            wherever it was written. */}
        <p className="note warn" style={{ marginTop: 8 }}>
          A <strong>different</strong> passphrase gives a different hash — and if
          an employer has already written the old one into a termination, that
          statement cannot be changed and the new key is useless.
        </p>
        <button type="button" className="ghost" onClick={() => setReopened(true)}>
          Derive again
        </button>
      </section>
    );
  }

  return (
    <section className={known || hash || ended ? "callout" : "callout claim-key-todo"}>
      <h2>
        {hash || known
          ? "Your claim key"
          : ended
            ? "Your claim key — needed for the claim below"
            : "Claim key — not set up yet"}
      </h2>
      {body}
    </section>
  );
}
