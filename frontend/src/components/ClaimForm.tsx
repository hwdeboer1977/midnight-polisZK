// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "./CopyRow";
import { FilePicker } from "./FilePicker";
import { submitClaim, type ClaimBundle, type ClaimResult } from "../lib/claim";
import { decodePayslip, type Payslip } from "../lib/payslip";
import { periodName } from "../generated/roster";
import { explainError } from "../lib/explainError";
import { formatPeur } from "../lib/format";
import { walletCanProve } from "../lib/submitPayroll";
import { useWallet } from "../wallet/WalletContext";
import { useAttestations } from "../lib/useAttestations";
import { assembleClaim } from "../lib/assembleClaim";

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
 * ⚠️ There is no claim key any more. It was a third file, and the one thing a
 * claimant could not reproduce — sealed to nothing her wallet could open, and
 * anchored by an employer who had to collect its hash before a write-once
 * statement. `claim` binds to `ownPublicKey()` on its own, so only she can
 * claim either way; what the key bought was an unlinkable nullifier, and that
 * is the property traded away.
 *
 * Every check the circuit makes is made here first, against the same pure
 * circuits, so a wrong file says which file is wrong instead of costing two
 * minutes of proving and then saying "assertion failed".
 */
export function ClaimForm() {
  const { api, account, networkId } = useWallet();
  // The terminated periods this wallet has, from the same scan the eligibility
  // panel uses. One claim per termination, so the first is the one to assemble.
  const { rows } = useAttestations();
  const ended = rows.filter((row) => row.ended);
  const endedKey = ended.map((row) => `${row.contractAddress}:${row.period}`).join(",");

  const [bundle, setBundle] = useState<ClaimBundle | null>(null);
  const [assembling, setAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [payslipName, setPayslipName] = useState<string | null>(null);
  /** The loaded key's anchor, kept so the bundle can be checked against it. */
  const [delegateProving, setDelegateProving] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimResult | null>(null);

  const busy = step !== null;

  /**
   * Whether this wallet can prove for itself.
   *
   * Feature-detected, never assumed: 1AM implements `getProvingProvider` and
   * proves in-tab, Lace does not and needs a proof server on the claimant's own
   * machine. The same check the employer flows make.
   */
  const canDelegate = api ? walletCanProve(api) : false;

  // Preferred when available, matching the employer flows. Unticked, `claim`
  // proves against 127.0.0.1:6300 — which for someone who has just lost their
  // job means installing Docker and downloading proving parameters before they
  // can collect a benefit. That is a wall, not a preference.
  useEffect(() => {
    if (canDelegate) setDelegateProving(true);
  }, [canDelegate]);

  /**
   * The bundle, assembled here rather than uploaded.
   *
   * ⚠️ This used to be a file the employer built at termination and sent. That
   * put them in the claim path, and the file went stale on its own — a bundle
   * names a fund coin, and any earlier claimant spending it invalidates the
   * bundle, so one handed over in September was likely worthless by November.
   *
   * Nothing is asked of anybody now: the leaf is reconstructed from chain and
   * this wallet, the path is built from the period's public digests, and only
   * the fund coin comes from the service — the one field a browser cannot
   * derive, and one that says nothing about who is asking for it.
   */
  useEffect(() => {
    const row = ended[0];
    if (!account || !row) return;
    let cancelled = false;
    setAssembling(true);
    setAssembleError(null);
    void assembleClaim({
      networkId,
      contractAddress: row.contractAddress,
      coinPublicKey: account.coinPublicKey,
      finalPeriod: row.period,
    })
      .then((assembled) => {
        if (cancelled) return;
        setBundle(assembled.bundle);
        setAssembleError(assembled.warning);
      })
      .catch((cause) => {
        if (!cancelled) {
          setBundle(null);
          setAssembleError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setAssembling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account, networkId, endedKey]);

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
        coinPublicKey: account.coinPublicKey,
        provingMode: delegateProving && canDelegate ? "wallet" : "local",
        // ⚠️ A zero-based INDEX, not a period. `claim` asserts
        // `window < durationMonths`, which a YYYYMM value could never satisfy.
        // The pilot claims the first window; a monthly scheme steps this
        // forward, one nullifier per index.
        window: 0,
        onProgress: setStep,
      });
      setDone(result);
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
    // The primary action once eligibility is settled, so it takes the tint the
    // rest of the app reserves for a workflow. It was white, level with the
    // explanatory cards around it.
    <section className="card claim-workflow">
      <h2 className="section-title accent">Make a claim</h2>
      {/* Two lines, then the steps. The paragraph this replaces was accurate
          and was a briefing: where the membership proof comes from is a thing
          to read once, and it is still one disclosure away below. */}
      <p className="note" style={{ marginTop: 0 }}>
        Use your final payslip to generate the private proof your claim needs.
        The payslip never leaves your device.
      </p>

      {/* Still employed is the ordinary case, not a failure — but the steps
          below cannot run without a termination attestation, and a workflow
          that silently refuses to complete reads as broken. The steps stay
          visible: what a claim involves is worth seeing before you need it. */}
      {ended.length === 0 ? (
        <p className="claim-state">
          <span aria-hidden="true">ⓘ</span>
          <span>
            <strong>You are currently employed.</strong> These steps become
            available if your employment ends and your employer publishes the
            attestation — until then there is nothing to claim against.
          </span>
        </p>
      ) : null}
      {/* What used to be the first of three inputs, now a status line: the
          bundle assembles itself, so there is nothing to fetch and nothing to
          keep. Shown rather than hidden because a claimant who sees only a
          payslip picker should know the other half happened. */}
      {assembling ? (
        <p className="status">Building your claim from the chain…</p>
      ) : bundle ? (
        <p className="ok-line">
          ✓ Claim assembled for {periodName(bundle.leaf.finalPeriod)} — no file
          needed
        </p>
      ) : null}
      {assembleError ? <p className="problems">{assembleError}</p> : null}

      <ol className="claim-inputs">

        <li>
          <div className="claim-input-head">
            <strong>Select final payslip</strong>
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
          <p className="note keep-private">
            <span aria-hidden="true">🔒</span> Keep it to yourself. This is the
            one with your actual salary in it.
          </p>
        </li>


      {/* Where the proof is generated.
          
          It matters more here than anywhere else in the app. Unticked, proving
          runs against a proof server on the claimant's own machine — so a
          person who has just lost their job has to install Docker and download
          proving parameters before they can collect a benefit. Ticked, a wallet
          that can prove does it in-tab and they need nothing.
          
          The disclosure is stated rather than glossed: proving consumes the
          claim key and the final month's figures, so delegating hands both to
          the wallet. That is a real choice, and the wallet is a party she has
          already trusted with her spending keys — but it is not the same as
          nothing leaving the page, and the copy does not pretend it is. */}
        <li>
          <div className="claim-input-head">
            <strong>Generate private proof</strong>
            <span className="muted">on this device, or in your wallet</span>
          </div>
      <label className="prove-here">
        <input
          type="checkbox"
          checked={delegateProving && canDelegate}
          disabled={busy || !canDelegate}
          onChange={(event) => setDelegateProving(event.target.checked)}
        />{" "}
        Generate the proof privately in my wallet
        <span className="muted">
          {" "}
          {canDelegate ? (
            <>
              — no salary data is sent to a proving server.{" "}
              <strong>
                Your final month's figures are passed to your wallet for local
                proof generation.
              </strong>{" "}
              <span title="Unticked, proving runs against a proof server on this machine at 127.0.0.1:6300 and reaches nowhere else.">
                Unticked, they stay on this page.
              </span>
            </>
          ) : (
            <>
              — this wallet cannot prove for itself, so proving runs against a
              proof server on this machine. Nothing leaves the page, but one has
              to be running before you can claim.
            </>
          )}
        </span>
          </label>
          {/* The slowest action in the app, and the one where someone is most
              anxious. Without a number here a wait that is working looks like a
              wait that has hung. */}
          <p className="note">Proving takes about a minute — keep this tab open.</p>
        </li>

        <li>
          <div className="claim-input-head">
            <strong>Claim benefit</strong>
            <span className="muted">one transaction, from your wallet</span>
          </div>
          <button
            type="button"
            className="primary"
            disabled={busy || !bundle || !payslip}
            onClick={() => void claim()}
          >
            {busy ? step ?? "Working…" : "Claim my benefit"}
          </button>
          {/* Why it is disabled, beside it.
              
              With no termination attestation there is no `ended` row, so the
              effect that assembles a claim returns before it sets a status —
              which left this button inert and silent, with the reason four
              sections up in the eligibility panel. A disabled control that
              cannot say why is the same bug the pre-flight checks exist to
              stop elsewhere in the app. */}
          {!busy && ended.length > 0 && (!bundle || !payslip) ? (
            <p className="note" style={{ margin: "8px 0 0" }}>
              {!bundle
                ? "Waiting for your claim to be assembled from the chain."
                : "Choose your final payslip in step 1."}
            </p>
          ) : null}
        </li>
      </ol>

      {bundle && payslip ? (
        <p className="note" style={{ marginTop: 0 }}>
          Claiming against <strong>{bundle.leaf.finalPeriod}</strong>, employee
          slot {bundle.slot + 1}, {bundle.leaf.monthsWorked} month
          {bundle.leaf.monthsWorked === 1 ? "" : "s"} attested.
        </p>
      ) : null}

      {/* Explained rather than echoed. A bare "Rate limited" in a red box under
          a claim form reads as the claim being refused, when it is the indexer
          throttling a connection and nothing was attempted. */}
      {error
        ? (() => {
            const { text, retryable } = explainError(error);
            return (
              <p className={retryable ? "note keep-private" : "problems"}>
                {retryable ? <span aria-hidden="true">⏳</span> : null}
                <span>{text}</span>
              </p>
            );
          })()
        : null}

      {busy && step ? <p className="status">{step}</p> : null}
    </section>
  );
}
