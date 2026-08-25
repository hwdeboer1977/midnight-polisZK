import { useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "./CopyRow";
import { FilePicker } from "./FilePicker";
import { parseBundle, submitClaim, type ClaimBundle, type ClaimResult } from "../lib/claim";
import { decodePayslip, type Payslip } from "../lib/payslip";
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
 * is derived from their passphrase. The PASSPHRASE is hers, and it is the only
 * input nobody else could supply.
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
  const [passphrase, setPassphrase] = useState("");
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

  async function claim() {
    if (!api || !account || !bundle || !payslip) return;
    setError(null);
    setStep("Starting…");
    try {
      const result = await submitClaim({
        api,
        networkId,
        bundle,
        payslip,
        passphrase,
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
        Two files and a passphrase. Neither file is uploaded anywhere: the proof
        is built here, and what reaches the chain discloses only the period and
        that a claim was made.
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
            loaded={bundle ? `${bundleName ?? "Loaded"} — period ${bundle.period}` : null}
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
            loaded={payslip ? `${payslipName ?? "Loaded"} — period ${payslip.period}` : null}
            disabled={busy}
            onFile={async (file) => readPayslip(await file.text(), file.name)}
          />
          <p className="note">
            For the final period. It carries the figures that open the
            commitment — the nonce inside it derives from your employer's
            passphrase, so there is no other route to it.
          </p>
        </li>

        <li>
          <div className="claim-input-head">
            <strong>Your claim passphrase</strong>
            <span className="muted">only you have it</span>
          </div>
          <input
            type="password"
            value={passphrase}
            disabled={busy}
            placeholder="Your claim passphrase"
            autoComplete="off"
            style={{ minWidth: 280 }}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <p className="note">
            The one you used under <Link to="/employee">Your claim key</Link>,
            derived with this same wallet connected. Nothing here holds it, and
            nothing can check it until the claim is built.
          </p>
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
        disabled={busy || !bundle || !payslip || !passphrase}
        onClick={() => void claim()}
      >
        {busy ? step ?? "Working…" : "Claim my benefit"}
      </button>

      {busy && step ? <p className="status">{step}</p> : null}
    </section>
  );
}
