import { useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "./CopyRow";
import { FilePicker } from "./FilePicker";
import { parseBundle, submitClaim, type ClaimBundle, type ClaimResult } from "../lib/claim";
import { deriveLegacyClaimKey, parseClaimKeyFile } from "../lib/claimKey";
import { decodePayslip, type Payslip } from "../lib/payslip";
import { periodName } from "../generated/roster";
import { formatPeur } from "../lib/format";
import { useWallet } from "../wallet/WalletContext";

/**
 * Where a claimant actually claims.
 *
 * Three inputs, and the split between them is the architecture rather than a
 * form design. The BUNDLE comes from the relay, because a path through a tree
 * over everyone terminated that month is exactly what she cannot build alone —
 * and being unable to build it is what keeps her anonymous inside it. The
 * PAYSLIP comes from her employer, because the nonce that opens the commitment
 * is derived from their payroll key. The CLAIM KEY is hers, and it is the only
 * input nobody else could supply.
 *
 * Said as "payroll key" rather than "passphrase" on the page itself. It is the
 * employer's passphrase underneath — `deriveEmployerKey` — but this flow no
 * longer has a passphrase of the claimant's own, and the word was the only one
 * left in it. A claimant reading "passphrase" here looks for hers, does not
 * find one, and concludes something is missing.
 *
 * The claim key is a file now rather than a remembered passphrase — see
 * `lib/claimKey.ts` for why. The passphrase route survives here and only here,
 * because anchors are write-once: anyone whose employer already published a
 * passphrase-derived hash must still be able to claim, and no amount of
 * tidying can migrate them. It is behind a disclosure, so the current scheme is
 * the visible one and the legacy path is reachable rather than advertised.
 *
 * The key is checked against the bundle the moment BOTH are loaded, rather than
 * at submit. `leaf.claimKeyHash` travels in the bundle in the clear, so the
 * comparison costs nothing and turns the most likely failure in the flow —
 * wrong key, unrecoverable anchor — into something she learns while she still
 * has both files open.
 *
 * Every check the circuit makes is made here first, against the same pure
 * circuits, so a wrong file says which file is wrong instead of costing two
 * minutes of proving and then saying "assertion failed".
 */
export function ClaimForm() {
  const { api, account, networkId } = useWallet();

  const [bundle, setBundle] = useState<ClaimBundle | null>(null);
  const [bundleName, setBundleName] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [payslipName, setPayslipName] = useState<string | null>(null);
  const [claimKey, setClaimKey] = useState<Uint8Array | null>(null);
  const [claimKeyName, setClaimKeyName] = useState<string | null>(null);
  /** The loaded key's anchor, kept so the bundle can be checked against it. */
  const [claimKeyHashHex, setClaimKeyHashHex] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimResult | null>(null);

  const busy = step !== null;

  function readBundle(text: string, name: string) {
    setError(null);
    setBundleName(name);
    try {
      setBundle(parseBundle(text));
    } catch (cause) {
      setBundle(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function readPayslip(text: string, name: string) {
    setError(null);
    setPayslipName(name);
    try {
      setPayslip(decodePayslip(text));
    } catch (cause) {
      setPayslip(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function readClaimKey(text: string, name: string) {
    setError(null);
    setClaimKeyName(name);
    try {
      const identity = await parseClaimKeyFile(text);
      setClaimKey(identity.claimKey);
      setClaimKeyHashHex(identity.claimKeyHash.toLowerCase());
    } catch (cause) {
      setClaimKey(null);
      setClaimKeyHashHex(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  /**
   * Whether the loaded key opens the anchor in the loaded bundle.
   *
   * null while either is missing, or while the legacy passphrase is in use —
   * that one costs 600,000 PBKDF2 iterations to check, so it is left to the
   * submit path rather than run on every keystroke.
   *
   * `leaf.claimKeyHash` travels in the bundle in the clear, so for a file this
   * is a string comparison rather than a proof — and it is exactly the check
   * the circuit will make later.
   */
  const keyMatches =
    claimKeyHashHex === null || bundle === null
      ? null
      : claimKeyHashHex === bundle.leaf.claimKeyHash.toLowerCase();

  /** Whichever route she came by, resolved to the 32 bytes a claim needs. */
  async function resolveClaimKey(): Promise<Uint8Array> {
    if (claimKey) return claimKey;
    if (!account) throw new Error("No wallet connected.");
    setStep("Deriving your claim key…");
    // The legacy route. Salted with her coin public key, exactly as it was when
    // the anchor was written — deriving it under a different wallet gives a
    // different key, which is why this cannot be done without one connected.
    return deriveLegacyClaimKey(passphrase, account.coinPublicKey);
  }

  async function claim() {
    if (!api || !account || !bundle || !payslip) return;
    setError(null);
    setStep("Starting…");
    try {
      const key = await resolveClaimKey();
      const result = await submitClaim({
        api,
        networkId,
        bundle,
        payslip,
        claimKey: key,
        coinPublicKey: account.coinPublicKey,
        // The window a benefit is claimed for. Defaulting to the final period
        // keeps the pilot's one claim unambiguous; a real scheme pays monthly
        // and would step this forward, one nullifier per month.
        window: bundle.leaf.finalPeriod,
        onProgress: setStep,
      });
      setDone(result);
      // Not kept a moment longer than the derivation needed it.
      setPassphrase("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStep(null);
    }
  }

  if (done) {
    return (
      <section className="callout">
        <h2>Benefit paid — €{formatPeur(done.benefitMinor)}</h2>
        <p className="ok-line" style={{ marginTop: 0 }}>
          ✓ Claimed, and the window is now spent
        </p>
        {/* Shown as a payslip would show it. A benefit is taxable income, and a
            net figure with no breakdown is the thing people misread. */}
        <div className="row">
          <div className="k">Benefit</div>
          <div className="v">€{formatPeur(done.grossBenefitMinor)}</div>
        </div>
        <div className="row">
          <div className="k">Tax withheld</div>
          <div className="v">−€{formatPeur(done.taxMinor)}</div>
        </div>
        <div className="row">
          <div className="k">Contribution withheld</div>
          <div className="v">−€{formatPeur(done.socialMinor)}</div>
        </div>
        <div className="row">
          <div className="k">Paid to you</div>
          <div className="v">€{formatPeur(done.benefitMinor)}</div>
        </div>
        <p className="note">
          Withheld under the same tax rules your final month was filed under —
          the circuit checks that, so the benefit cannot be taxed under a
          schedule nobody published. The withheld part stays with the fund until
          it is remitted to the treasuries.
        </p>
        <CopyRow label="Transaction" value={done.txHash} />
        <p className="note">
          The coin is in your wallet and its value was never published. What the
          chain recorded is that a claim happened, and one nullifier nobody can
          link to you — not the amount, not your employer, not which month of
          salary it was derived from.
        </p>
        <p className="note">
          Claiming window {done.window} again is refused on chain: the nullifier
          is already in the fund's spent set, and it is the image of a secret, so
          the set says nothing about whose it is.
        </p>
      </section>
    );
  }

  if (!api || !account) {
    return (
      <section className="card pending">
        <h2>Connect your wallet to claim</h2>
        <p className="note" style={{ marginTop: 0 }}>
          A claim must be signed by the wallet your employer filed as payee. The
          circuit rebuilds that binding from the signing key, so nobody — not
          this page, not the fund, not an agency acting for you — can claim on
          your behalf.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Make a claim</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Three files, all of them yours already. None is uploaded anywhere: the
        proof is built here, and what reaches the chain discloses only the period
        and that a claim was made.
      </p>

      {/* Numbered, because the three inputs come from three different places and
          that is the part people get stuck on — not the form. Each row says who
          gives it to you. */}
      <ol className="claim-inputs">
        <li>
          <div className="claim-input-head">
            <strong>Claim bundle</strong>
            <span className="muted">from the fund's relay</span>
          </div>
          <FilePicker
            label="Choose the bundle…"
            loaded={bundle ? `Claim bundle for ${periodName(bundle.leaf.finalPeriod)}` : null}
            filename={bundleName}
            disabled={busy}
            onFile={async (file) => readBundle(await file.text(), file.name)}
          />
          <p className="note">
            Holds the path proving your termination is in that month's tree,
            alongside everyone else's — which is what keeps you anonymous inside
            it, and why you cannot build it yourself.
          </p>
        </li>

        <li>
          <div className="claim-input-head">
            <strong>Your payslip</strong>
            <span className="muted">from your employer</span>
          </div>
          <FilePicker
            label="Choose your payslip…"
            loaded={payslip ? `Payslip for ${periodName(payslip.period)}` : null}
            filename={payslipName}
            disabled={busy}
            onFile={async (file) => readPayslip(await file.text(), file.name)}
          />
          <p className="note">
            For the final period. It carries the figures that open the
            commitment — the nonce inside it comes from your employer's payroll
            key, so there is no other route to it.
          </p>
        </li>

        <li>
          <div className="claim-input-head">
            <strong>Your claim key</strong>
            <span className="muted">only you have it</span>
          </div>
          <FilePicker
            label="Choose your claim key…"
            loaded={claimKey ? "Claim key" : null}
            filename={claimKeyName}
            disabled={busy || legacy}
            onFile={async (file) => readClaimKey(await file.text(), file.name)}
          />
          <p className="note">
            The file you downloaded when you first connected, named something
            like <code>incomelayer-benefit-key-1a2b3c4d.json</code>. It is not
            uploaded anywhere — the proof is built here.
          </p>

          {/* Answered as soon as both files are open, because this is the
              failure that cannot be repaired afterwards. A claimant who learns
              at submit that her key is the wrong one has already been told the
              anchor is write-once; telling her while she is still looking at
              her downloads folder is the only useful moment. */}
          {keyMatches === true ? (
            <p className="ok-line">
              ✓ This is the key your employer anchored
            </p>
          ) : null}
          {keyMatches === false ? (
            <p className="problems">
              This is not the claim key your employer anchored for that
              termination. It must be the file you had <strong>before</strong>{" "}
              your employment ended — the anchor was written once and cannot be
              repointed, so a key created afterwards can never match. If you
              have another copy, try that one.
            </p>
          ) : null}

          {/* Reachable, not advertised. Anchors are write-once, so anyone whose
              employer published a passphrase-derived hash can only ever claim
              this way — removing it would strand them, and showing it first
              would teach the scheme we have just replaced. */}
          <details
            className="details"
            style={{ marginTop: 8 }}
            onToggle={(event) => setLegacy((event.target as HTMLDetailsElement).open)}
          >
            <summary>I set mine up with a passphrase, before there were files</summary>
            <p className="note">
              Claim keys used to be derived from a passphrase rather than kept in
              a file. If your employer anchored yours that way, that passphrase
              is still the only thing that opens it — the statement ending your
              employment cannot be changed to point at a new key.
            </p>
            <input
              type="password"
              value={passphrase}
              disabled={busy}
              placeholder="Your old claim passphrase"
              autoComplete="off"
              style={{ minWidth: 280 }}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <p className="note">
              Derived with this same wallet connected, as it was originally.
              Nothing here holds it, and it cannot be checked until the claim is
              built — unlike a file, which is checked the moment you load it.
            </p>
          </details>
        </li>
      </ol>

      {bundle && payslip ? (
        <p className="note" style={{ marginTop: 0 }}>
          Claiming against <strong>{bundle.leaf.finalPeriod}</strong>, employee
          slot {bundle.slot + 1}, {bundle.leaf.monthsWorked} month
          {bundle.leaf.monthsWorked === 1 ? "" : "s"} attested.
        </p>
      ) : null}

      {error ? <p className="problems">{error}</p> : null}

      {/* The slowest action in the app, and the one where someone is most
          anxious. Without a number here a wait that is working looks like a
          wait that has hung. */}
      <p className="note" style={{ marginTop: 16 }}>
        Proving takes about a minute — keep this tab open. Nothing is sent
        anywhere while it runs.
      </p>

      <button
        type="button"
        className="primary"
        disabled={busy || !bundle || !payslip || (!claimKey && !passphrase) || keyMatches === false}
        onClick={() => void claim()}
      >
        {busy ? step ?? "Working…" : "Claim my benefit"}
      </button>

      {busy && step ? <p className="status">{step}</p> : null}
    </section>
  );
}
