// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "./CopyRow";
import { useWallet } from "../wallet/WalletContext";
import {
  publishClaimKeyHash,
  readMyClaimKeyHash,
} from "../lib/publishedClaimKeys";
import {
  claimKeyFilename,
  createClaimIdentity,
  downloadClaimKeyFile,
  type ClaimIdentity,
} from "../lib/claimKey";

/**
 * The employee's claim key: created here, downloaded, and never sent anywhere.
 *
 * This is the piece that has to happen BEFORE she is dismissed, which is worth
 * being blunt about on the page: her employer writes `hash(claimKey)` into the
 * termination attestation, and that attestation is write-once. An employee who
 * turns up afterwards with a freshly created key has an anchor she cannot open,
 * and no correction is possible short of re-filing the period.
 *
 * That failure got EASIER to walk into when the passphrase became a random key.
 * Choosing a new passphrase was at least a deliberate act; pressing a button
 * that mints 32 fresh bytes is not. So once a key exists, creating another is
 * behind a disclosure rather than a button — and once an employer has attested
 * a final period, the disclosure says plainly that it is almost certainly the
 * wrong move.
 *
 * The key is held in React state only, for as long as this panel is open, so
 * she can download it again if it went to the wrong folder. It is never put in
 * localStorage: that would survive the session, be readable by anything with a
 * foothold on the origin, and quietly make the browser a second place the
 * secret lives. Only the HASH is remembered, and that is public.
 */

/**
 * Where a previously created hash is remembered.
 *
 * Only the hash — it is public, it is what the employer publishes, and it gives
 * nobody a way to claim. The KEY is never stored here.
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
    // A browser refusing storage costs the reminder, not the key — the file is
    // downloaded either way, and the employer still holds the hash.
  }
}

export function ClaimKey({
  coinPublicKey,
  bare,
  employerOf,
  registered = true,
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
   * Whether any filed period names this wallet.
   *
   * A benefit key is only meaningful once one does: `endEmployment` cannot
   * attest a termination for a slot no period has filed, so an unregistered
   * wallet has nothing that could ever be claimed against. Offering an
   * irreplaceable file to someone with no employment devalues the one prompt
   * that has to be taken seriously later.
   *
   * Waiting is safe rather than a gamble on ordering: registration is a
   * precondition of termination in the contract, so the write-once deadline
   * cannot arrive first.
   */
  registered?: boolean;
  /**
   * Whether an employer has already attested a final period for this wallet.
   *
   * It changes what this panel means entirely. Before termination, creating a
   * key is something to do in time. After it, the anchor is already written and
   * the only question is whether the file she has reproduces it — which this
   * page cannot answer, because the hash sits inside an opaque commitment. The
   * claim bundle carries it in the clear, so the check happens at claim time
   * and reports precisely.
   */
  ended?: boolean;
}) {
  const [identity, setIdentity] = useState<ClaimIdentity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sending the hash to the employer, without the employee being the courier.
   *
   * The step this removes was failing in practice and failing unrecoverably:
   * the employer anchors this value in a write-once statement, so an employee
   * who never got round to sending it cannot be helped afterwards.
   *
   * Only the hash goes, and it is neither secret nor a capability — see
   * `publishedClaimKeys.ts`. The manual path stays right beside it, because a
   * deployment with no database is a normal deployment.
   */
  const { networkId } = useWallet();
  const [publishing, setPublishing] = useState(false);
  const [publishedHash, setPublishedHash] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // What the service already holds for this wallet, so a mismatch with the file
  // in hand is visible NOW rather than at claim time — which is after the
  // termination statement has fixed it and is too late to matter.
  useEffect(() => {
    let cancelled = false;
    void readMyClaimKeyHash(networkId, coinPublicKey).then((row) => {
      if (!cancelled) setPublishedHash(row?.claimKeyHash ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId, coinPublicKey]);

  async function send(hash: string) {
    setPublishing(true);
    setPublishError(null);
    const failure = await publishClaimKeyHash(networkId, coinPublicKey, hash);
    if (failure) setPublishError(failure);
    else setPublishedHash(hash.toLowerCase());
    setPublishing(false);
  }
  const [saved, setSaved] = useState(false);
  /** Whether this browser has seen her create one before. */
  const [known, setKnown] = useState<string | null>(null);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setKnown(remembered(coinPublicKey));
    setIdentity(null);
    setSaved(false);
    setReopened(false);
  }, [coinPublicKey]);

  if (!registered && !known && !identity && !employerOf) {
    return (
      <section className="callout">
        <h2>Not on a payroll yet</h2>
        <p className="note" style={{ marginTop: 0 }}>
          No filed period names this wallet, so there is nothing a benefit could
          be claimed against and nothing for a key to unlock. Send your employer
          the two payroll keys from <Link to="/employee">Salary</Link>; once they
          have filed your first period, come back and download your benefit key.
        </p>
        <p className="note">
          Nothing is lost by waiting. Your employer cannot end an employment that
          was never filed, so the deadline this file has to beat cannot arrive
          before you are on a payroll.
        </p>
      </section>
    );
  }

  if (employerOf && !known && !identity) {
    return (
      <section className="callout">
        <h2>Benefit keys are for employees</h2>
        <p className="note" style={{ marginTop: 0 }}>
          This wallet is the employer of <strong>{employerOf}</strong>, so it has
          no benefit to claim — a claim needs the wallet a period was filed
          <em> for</em>, and yours files them. Your employees each download
          their own key file here and send you the hash.
        </p>
      </section>
    );
  }

  async function download(current: ClaimIdentity) {
    await downloadClaimKeyFile(current, coinPublicKey);
    setSaved(true);
  }

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const created = await createClaimIdentity();
      setIdentity(created);
      remember(coinPublicKey, created.claimKeyHash);
      setKnown(created.claimKeyHash);
      // Downloaded immediately rather than behind a second press. The key
      // exists only in this tab's memory, and a panel that showed the hash and
      // waited would let her navigate away from the only copy.
      await download(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      {/* An instruction, not a concept.
          
          This paragraph used to open on nullifiers and unlinkability, which
          made someone learn what a claim key IS before they could act on it.
          The cryptography has not changed and has not gone away — it is one
          disclosure down, for whoever wants it. What is left here is the only
          sentence that changes what anybody does. */}
      {/* Both outputs, named before the button rather than after it.
      
          This said "One file to keep" and stopped there — which is true of half
          of what the press produces. The other half is a hash that has to reach
          an employer, and it is the half with a DEADLINE: once the termination
          statement is written the hash is fixed, so an employee who did not
          know they had something to send is the one who finds out too late.
          The amber warning below already referred to "the hash" as though it
          had been introduced. Now it has. */}
      <p className="note" style={{ marginTop: 0 }}>
        This creates <strong>two things</strong>:
      </p>
      <ul className="key-preview">
        <li>
          <span aria-hidden="true">🔒</span>
          <span>
            <strong>A file you keep.</strong> Store it wherever you keep your
            wallet's recovery phrase. You will not need it again unless you ever
            claim an unemployment benefit — at which point it is the one thing
            nobody can reissue for you.
          </span>
        </li>
        <li>
          <span aria-hidden="true">↗</span>
          <span>
            <strong>A hash you send to your employer.</strong> Public and safe to
            share; it cannot be used to claim anything.
          </span>
        </li>
      </ul>
      <p className="note">
        The file is not your wallet and does not replace your recovery phrase. If
        you lose the phrase, it cannot bring anything back.
      </p>
      {ended ? (
        <p className="note" style={{ marginTop: 0 }}>
          <strong>Use the file you already have.</strong> Your employment has
          ended, so the hash inside that statement is already fixed — the claim
          below needs the key that produces it. Creating a new one here cannot
          help: it would produce a different hash, and the statement cannot be
          changed.
        </p>
      ) : (
        /* Said before creating, not only after. The consequence of leaving it
           until you need it is that you cannot do it at all. */
        <p className="problems" style={{ marginTop: 0 }}>
          Do this while you are still employed. Your employer writes the hash
          into the statement that ends your employment, and that statement can
          only be made once — so a key file made afterwards is one no claim can
          use.
        </p>
      )}

      <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => void create()}
        >
          {busy ? "Preparing…" : "Create my benefit key"}
        </button>
      </div>

      {error ? <p className="problems">{error}</p> : null}

      {identity ? (
        <>
          <p className="ok-line" style={{ marginTop: 14 }}>
            ✓ Benefit key created
          </p>

          {/* Two outputs, two destinations, and the split is the point.
          
              One press produces a file that must never travel and a hash that
              must. They are both hex-looking artefacts of the same operation,
              and the page used to present them as a run of paragraphs — leaving
              an employee to work out which was which from the prose. Now the
              layout says it: one panel keeps, one panel sends. */}
          <div className="key-outputs">
            <div className="key-output keep">
              <h4>
                <span aria-hidden="true">🔒</span> Keep private
              </h4>
              <code className="key-file">{claimKeyFilename(coinPublicKey)}</code>
              <p>
                Contains your claim key. Needed later to prove a claim is yours.
              </p>
              {saved ? (
                <button type="button" className="ghost" onClick={() => void download(identity)}>
                  Download again
                </button>
              ) : null}
            </div>

            <div className="key-output share">
              <h4>
                <span aria-hidden="true">↗</span> Share with your employer
              </h4>
              <CopyRow label="Claim-key hash" value={identity.claimKeyHash} />
              <p>Public hash only. Safe to send — it cannot be used to claim.</p>
              {/* One press instead of an out-of-band message. The copy row above
                  stays: a service without a database is a normal deployment, and
                  the employer's field takes a pasted hash either way. */}
              {publishedHash === identity.claimKeyHash.toLowerCase() ? (
                <p className="ok-line" style={{ marginTop: 8 }}>
                  ✓ Sent — your employer can pick it up
                </p>
              ) : (
                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: 8 }}
                  disabled={publishing}
                  onClick={() => void send(identity.claimKeyHash)}
                >
                  {publishing ? "Sending…" : "Send to my employer"}
                </button>
              )}
              {publishError ? (
                <p className="note" style={{ marginTop: 6 }}>
                  {publishError} Copy it above and send it yourself.
                </p>
              ) : null}
              {/* The check that keeps this from being a way to strand someone:
                  what the service holds, against what is in the file just
                  created. Wrong here is fixable; wrong after the termination is
                  not. */}
              {publishedHash && publishedHash !== identity.claimKeyHash.toLowerCase() ? (
                <p className="problems" style={{ marginTop: 8 }}>
                  <strong>This is not the hash on file for you.</strong> Your
                  employer would pick up an older one, and a termination anchored
                  to it could never be claimed with this key. Press{" "}
                  <strong>Send to my employer</strong> to replace it.
                </p>
              ) : null}
            </div>
          </div>

          {/* Precise about WHICH risk, because the obvious framing is wrong for
              this contract. Losing confidentiality does not let anyone take the
              benefit — `claim` binds to `ownPublicKey()` independently — it lets
              them link the claim history. Saying "secret because someone could
              claim with it" would be a false reason for a true instruction. */}
          <p className="problems" style={{ marginTop: 14 }}>
            <strong>That file is the only copy.</strong> It is not stored on this
            page, not on the chain, and nowhere anyone could send it to you
            again. Back it up somewhere you will still have in a year — a
            password manager, or a second device. Lose it and the anchor your
            employer publishes becomes one you cannot open.
          </p>

          <details className="details">
            <summary>Why are there two?</summary>
            <p className="note">
              The file holds a claim key: thirty-two random bytes. The hash is
              what those bytes hash to. Your employer writes the <em>hash</em>
              into the statement that ends your employment, and a claim proves
              you know the <em>bytes</em> behind it — which is how a claim can be
              yours without naming you.
            </p>
            <p className="note">
              They need the hash <strong>before</strong> that statement is made.
              It is write-once, so a hash sent afterwards is one no claim can
              use.
            </p>
            <p className="note">
              <strong>What a leaked key actually costs.</strong> Not your
              benefit: claiming also requires your wallet, and the contract
              checks that separately, so nobody can redirect or take a payment
              with the key alone. What it costs is privacy — the key is what
              makes each claim unlinkable, so anyone who learns it can work out
              which months you claimed. That is the thing this file protects,
              and it is why it is worth keeping properly rather than merely
              keeping.
            </p>
          </details>
        </>
      ) : null}

      <details className="details" style={{ marginTop: 12 }}>
        <summary>Why random bytes rather than a password?</summary>
        <p className="note">
          Thirty-two random bytes, and the hash of them. They are unrelated to
          your wallet keys on purpose — precisely so that nobody who has ever
          paid you can recognise a benefit claim as yours.
        </p>
        <p className="note">
          It was a password until we looked at what protects it. The hash your
          employer publishes travels in your claim bundle in the clear, and it
          was salted with your coin public key — which every employer you have
          ever had holds. Anyone with both could guess passwords offline until
          one matched. They could not take your money, because a claim also
          needs your wallet, but they could tell which claims were yours, which
          is the one thing this key exists to hide.
        </p>
        <p className="note">
          Random bytes cannot be guessed at any budget, so the file removes that
          entirely. It does mean a file to look after — but you already keep
          your payslips to claim at all, and a file can be backed up where a
          remembered password cannot.
        </p>
        <p className="note">
          The obvious alternative, locking it to your wallet so there is nothing
          to keep, is not available: no Midnight wallet can decrypt data for a
          web page, so anything encrypted to your wallet could never be opened
          again — including by you.
        </p>
      </details>
    </>
  );

  if (bare) return body;

  // Already done, on this browser, and not being redone: one green line rather
  // than a panel. It is the first thing on the page while it is outstanding and
  // should stop being the loudest thing the moment it is not.
  if (known && !identity && !reopened) {
    return (
      // Compact: a confirmation, not a panel. What matters here is one
      // line and one hash.
      <section className="callout claim-key-done compact-ok">
        {/* The employer case has to be handled here too, not only before a key
            exists. A wallet that has already created one falls straight through
            to this panel — which is how it came to tell an employer to send
            themselves a hash. */}
        {/* Three states, not two. The instruction — "send this before they end
            your employment" — is worse than useless once a termination has been
            attested: it tells someone to meet a deadline that has passed, on a
            page that has just told them it has. After termination this panel is
            a record, so it reads as one. */}
        {employerOf ? (
          <p className="ok-line" style={{ margin: 0 }}>
            ✓ Benefit key downloaded — for wherever <em>you</em> are an employee
          </p>
        ) : ended ? (
          <p className="ok-line" style={{ margin: 0 }}>
            ✓ Benefit key downloaded — this is the hash your employer anchored
          </p>
        ) : (
          <p className="ok-line" style={{ margin: 0 }}>
            ✓ Benefit key downloaded — give your employer this hash before they
            end your employment
          </p>
        )}
        <CopyRow label="Benefit key hash" value={known} />

        {/* Sending needs the HASH, not the key — and the hash is remembered
            here, which is the whole reason this panel can show it. The button
            was only in the just-created block, so anyone who had already
            downloaded their key on a previous visit could not use it without
            making a second key: a destructive answer to a problem that was
            purely a missing control. */}
        {employerOf || ended ? null : publishedHash === known.toLowerCase() ? (
          <p className="ok-line" style={{ marginTop: 8 }}>
            ✓ Sent — your employer can pick it up
          </p>
        ) : (
          <>
            <button
              type="button"
              className="primary"
              style={{ marginTop: 8 }}
              disabled={publishing}
              onClick={() => void send(known)}
            >
              {publishing ? "Sending…" : "Send to my employer"}
            </button>
            {publishedHash ? (
              <p className="problems" style={{ marginTop: 8 }}>
                <strong>A different hash is on file for you.</strong> Your
                employer would pick that one up, and a termination anchored to it
                could not be claimed with the key you hold. Sending replaces it.
              </p>
            ) : null}
          </>
        )}
        {publishError ? (
          <p className="note" style={{ marginTop: 6 }}>
            {publishError} Copy the hash above and send it yourself.
          </p>
        ) : null}

        {employerOf ? (
          <p className="note" style={{ marginTop: 8 }}>
            This wallet is the employer of <strong>{employerOf}</strong>, so it
            has nothing to claim there. A key is still worth having if you are
            also on someone else's payroll on IncomeLayerZK — it belongs to your
            wallet, not to any one employer, so the same hash works wherever you
            are an employee.
          </p>
        ) : ended ? (
          <p className="note" style={{ marginTop: 8 }}>
            Your claim needs the file this hash came from —{" "}
            <code>{claimKeyFilename(coinPublicKey)}</code>. The hash here is
            remembered by this browser only; what a claim actually checks is the
            key inside that file, against the statement your employer has
            already filed.
          </p>
        ) : (
          <p className="note" style={{ marginTop: 8 }}>
            Remembered by this browser, not by the chain — nothing anywhere
            records that you have one until your employer writes it into a
            termination. On another browser this will look unset; that does not
            mean it is gone, only that the reminder is not there. What matters is
            that you still have <code>{claimKeyFilename(coinPublicKey)}</code>.
          </p>
        )}

        {/* Behind a disclosure, not a button.
            
            Creating a new key is now one click and no thought, where choosing a
            new passphrase was at least deliberate. The hash above may already
            be inside a write-once attestation, and replacing it would be
            unrecoverable — so the control that does it should take a decision
            to reach, and should say what it costs before it is reached. */}
        <details className="details" style={{ marginTop: 12 }}>
          <summary>I have lost my benefit key file</summary>
          {ended ? (
            <p className="problems" style={{ marginTop: 8 }}>
              <strong>A new key will not help you.</strong> Your employment has
              already ended, which means the hash above is already written into
              a statement that cannot be changed. A new key produces a different
              hash and no claim can use it. If you have any backup of the file —
              another device, a password manager, an old download — that is the
              only route to a claim. Ask your former employer only if you are
              sure they have not yet filed the termination.
            </p>
          ) : (
            <p className="note warn" style={{ marginTop: 8 }}>
              A new key produces a <strong>different</strong> hash. That is fine
              only while your employer has not yet ended your employment: you
              must send them the new hash, and they must not have filed the
              termination with the old one. If they have, the new key is
              useless and cannot be made to work.
            </p>
          )}
          <button type="button" className="ghost" onClick={() => setReopened(true)}>
            Make a new one anyway
          </button>
        </details>
      </section>
    );
  }

  return (
    <section className={known || identity || ended ? "callout" : "callout claim-key-todo"}>
      <h2>
        {/* "file" was in every version of this heading, which quietly framed
            the whole operation as being about one artefact. The key is the
            thing; the file is where half of it goes. */}
        {identity || known
          ? "Your benefit key"
          : ended
            ? "Your benefit key — needed for the claim below"
            : "Your benefit key — not created yet"}
      </h2>
      {body}
    </section>
  );
}
