import { useState } from "react";
import { CopyRow } from "./CopyRow";
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
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimResult | null>(null);

  const busy = step !== null;

  async function readBundle(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      setBundle(parseBundle(await file.text()));
    } catch (cause) {
      setBundle(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function readPayslip(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      setPayslip(decodePayslip(await file.text()));
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

      <div className="actions" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label className="button secondary" style={{ cursor: "pointer" }}>
          {bundle ? `Bundle ✓ ${bundle.period}` : "Claim bundle (.json)"}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(event) => void readBundle(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="button secondary" style={{ cursor: "pointer" }}>
          {payslip ? `Payslip ✓ ${payslip.period}` : "Your payslip (.json)"}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(event) => void readPayslip(event.target.files?.[0] ?? null)}
          />
        </label>
        <input
          type="password"
          value={passphrase}
          disabled={busy}
          placeholder="Your claim passphrase"
          autoComplete="off"
          style={{ minWidth: 240 }}
          onChange={(event) => setPassphrase(event.target.value)}
        />
      </div>

      <p className="note">
        The bundle comes from the fund's relay — it holds the path proving your
        termination is in that month's tree, alongside everyone else's. The
        payslip comes from your employer; it carries the figures that open the
        month you are claiming on. The passphrase is the one you used on the{" "}
        <strong>Employee</strong> page, and it must be derived with this same
        wallet connected.
      </p>

      {bundle && payslip ? (
        <p className="note" style={{ marginTop: 0 }}>
          Claiming against <strong>{bundle.leaf.finalPeriod}</strong>, employee
          slot {bundle.slot + 1}, {bundle.leaf.monthsWorked} month
          {bundle.leaf.monthsWorked === 1 ? "" : "s"} attested.
        </p>
      ) : null}

      {step ? <p className="note">{step}</p> : null}
      {error ? <p className="problems">{error}</p> : null}

      <button
        type="button"
        className="primary"
        disabled={busy || !bundle || !payslip || !passphrase}
        onClick={() => void claim()}
      >
        {busy ? "Working…" : "Claim my benefit"}
      </button>
    </section>
  );
}
