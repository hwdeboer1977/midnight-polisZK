// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { periodName } from "../generated/roster";
import {
  endEmployment,
  surveyEmployment,
  type TerminationResult,
} from "../lib/endEmployment";
import { collectedFor, recordClaimKeyHash } from "../lib/collected";
import { readPublishedClaimKeys } from "../lib/publishedClaimKeys";
import { keyToHex } from "../lib/keys";
import { filenameSlug } from "../lib/payslip";
import { walletCanProve } from "../lib/submitPayroll";
import { useServiceJob } from "../lib/useServiceJob";
import { useElapsed, useUnloadGuard } from "../lib/useRunGuard";
import { RelayPanel, type RelayResult } from "./RelayPanel";
import { useWallet } from "../wallet/WalletContext";

/**
 * The employer's statement that someone's employment ended.
 *
 * The one fact a benefit claim needs that payroll does not already publish. A
 * period simply stops appearing when a worker leaves, and "stopped appearing"
 * is not a statement anyone made — it cannot be told apart from a month not yet
 * filed. So the employer says it, once, and cannot unsay it.
 *
 * Nothing here lets the employer collect anything. Claiming against this needs
 * the employee's own wallet key, which `payeeFor` binds and no employer holds.
 */
export function EndEmployment({
  contractAddress,
  instance,
  networkId,
  periods,
  roster,
  employee,
  onEnded,
}: {
  contractAddress: string;
  instance: string;
  networkId: string;
  /** Filed periods, newest first. */
  periods: number[];
  /**
   * The person this is about, when it was opened from their row.
   *
   * With it there is no employee to choose — the row already said who — so the
   * picker and the paste field disappear and the form is one question: which
   * month was their last. Without it the component keeps its standalone
   * behaviour, which is what the operator-style flow needed.
   */
  employee?: { fullName: string; coinPublicKey: string };
  /** Fired once the whole workflow has finished, so a list can re-read. */
  onEnded?: () => void;
  /**
   * The workbook loaded on this page, if one has been.
   *
   * With it, the employee is chosen from a list of names. Without it, the key
   * has to be pasted — the chain holds only a hash of it, so there is nowhere
   * else to read one from. Pasting is the fallback, not the design: this
   * writes an attestation that cannot be revised, and a mis-pasted key anchors
   * a termination against the wrong person.
   */
  roster?: { rows: { fullName: string; coinPublicKey: string }[] } | null;
}) {
  const { api } = useWallet();
  const [period, setPeriod] = useState<number | null>(periods[0] ?? null);
  const [payee, setPayee] = useState(employee?.coinPublicKey ?? "");
  const [claimKeyHash, setClaimKeyHash] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [survey, setSurvey] = useState<{
    slot: number;
    monthsWorked: number;
    matched: number[];
  } | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<TerminationResult | null>(null);

  /**
   * Publishing the claim tree, as part of ending employment rather than after it.
   *
   * The employer used to be walked through five separate acts: attest, download
   * the opening, go to another panel, upload it back, publish. Every one of
   * those is a real technical step and none of them is a decision — the opening
   * this component just produced is the only input the relay wants, and it is
   * already in memory, so the download-and-re-upload round trip existed purely
   * because two panels could not talk to each other.
   *
   * The download stays. It is the only copy of a file that cannot be
   * reconstructed, and a service that is down must not cost an employer the
   * opening as well as the publish.
   */
  const relay = useServiceJob<RelayResult>("/api/relay");
  const relayResult = relay.job?.status === "done" ? relay.job.result : null;
  const relayBundle = relayResult?.bundles?.[0] ?? null;
  const relaySkipped = relayResult?.skipped?.[0] ?? null;
  const finished = done !== null && relay.job?.status !== "running" && !relay.submitting;

  useEffect(() => {
    if (finished) onEnded?.();
  }, [finished, onEnded]);

  /**
   * Whether the wallet can prove, and whether it is being asked to.
   *
   * Read from the wallet rather than passed in. This used to take a
   * `delegateProving` prop, and its one caller passed a hardcoded `false` — so
   * ending employment always proved locally, against a proof server most
   * employers do not run. On a hosted page that is not a slow path, it is no
   * path at all: the fetch to 127.0.0.1:6300 fails and the attestation cannot
   * be made. Filing payroll and claiming both decide this for themselves, and
   * this now matches them, which also means a future caller cannot turn it off
   * by accident.
   *
   * Defaulted ON where the wallet supports it, as in `RosterUpload` and
   * `ClaimForm`: the wallet is already trusted with the employer's spending
   * keys, and it is the option that works without local infrastructure.
   */
  /**
   * The hash that is actually going to be sent.
   *
   * The field below displays `claimKeyHash || collectedFor(...)`, so a hash
   * collected earlier appears in it without ever reaching state. Everything
   * that ASKED about the hash asked the state instead: the button disabled
   * itself on an empty `claimKeyHash` while showing a full one, and `submit`
   * would have sent "" — an attestation anchored to a hash nobody holds, which
   * is write-once and cannot be corrected.
   *
   * Derived once and used by the field, the button and the submit, so the three
   * cannot disagree again.
   */
  /**
   * Hashes employees published to this service, for whoever the row is about.
   *
   * The third source, and the one that removes the paste. `collectedFor` is
   * this browser's own record and knows nothing an employer did on another
   * machine; the published table is what the employee sent, so it is available
   * wherever the employer signs in.
   */
  const [publishedHashes, setPublishedHashes] = useState<Record<string, string>>({});
  // The published table is keyed on the hex key; `payee` may be either form.
  const hexPayee = (() => {
    try {
      return payee ? keyToHex(payee) : "";
    } catch {
      return payee.toLowerCase();
    }
  })();
  useEffect(() => {
    let cancelled = false;
    // Scoped to this payroll, and here it matters most: whatever this form
    // pre-fills goes into a write-once attestation, and a hash published to a
    // different employer is one this employee cannot open a claim against.
    void readPublishedClaimKeys(networkId, contractAddress).then((rows) => {
      if (!cancelled) setPublishedHashes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId, contractAddress]);

  /**
   * The hash that is actually going to be sent, from three sources in order of
   * authority: typed, then this browser's record, then what the employee
   * published.
   *
   * Typed wins because the employer signs a write-once statement with it. The
   * published value is a suggestion — the same rule the collection panel
   * follows — so a service holding a stale row cannot quietly anchor one.
   */
  const effectiveClaimKeyHash =
    claimKeyHash ||
    collectedFor(contractAddress)[payee]?.claimKeyHash ||
    publishedHashes[hexPayee] ||
    "";
  const hashFromEmployee =
    !claimKeyHash &&
    !collectedFor(contractAddress)[payee]?.claimKeyHash &&
    Boolean(publishedHashes[hexPayee]);

  /**
   * Who this employer can pick from, by name.
   *
   * The workbook when one is loaded, and otherwise **what this browser was told
   * when a workbook was last loaded** — `recordRoster` writes a name against
   * each coin key, for exactly this reason. Until now the fallback was a bare
   * paste field, which is how an employer ends up hand-copying a 64-character
   * key into a write-once attestation because they happened to open the page
   * without the file.
   *
   * The local store can only undercount — a roster loaded on another machine is
   * not here — so the paste field stays, below rather than instead. Nothing is
   * trusted from it either: the key chosen is put through the same `surveyEmployment`
   * lookup as a pasted one, and the chain answers whether it names anybody.
   */
  const remembered = Object.values(collectedFor(contractAddress)).filter(
    (entry) => entry.fullName
  );
  const choices =
    roster && roster.rows.length > 0
      ? roster.rows.map((row) => ({
          coinPublicKey: row.coinPublicKey,
          fullName: row.fullName,
        }))
      : remembered.map((entry) => ({
          coinPublicKey: entry.coinPublicKey,
          fullName: entry.fullName ?? "",
        }));
  const fromWorkbook = Boolean(roster && roster.rows.length > 0);

  const canDelegate = api ? walletCanProve(api) : false;
  const [delegateProving, setDelegateProving] = useState(false);
  useEffect(() => {
    if (canDelegate) setDelegateProving(true);
  }, [canDelegate]);

  if (periods.length === 0) return null;

  const busy = step !== null;

  // Every stage of this proves for minutes: the attestation, then the relay.
  // The guard covers both, so it is on from the first signature to the last.
  const running = busy || relay.submitting || relay.job?.status === "running";
  useUnloadGuard(running);
  const elapsed = useElapsed(running);

  /**
   * Looks the employee up as soon as there is nothing left to ask.
   *
   * Opened from their row, the employee is already known and the period
   * defaults to the newest filed one — so "Look up" was a button whose inputs
   * were both already decided, standing between the employer and the only
   * question this form actually has. It stays for the standalone case, where a
   * key has to be pasted and the click marks the end of typing.
   */
  useEffect(() => {
    if (!employee || !period || survey || busy) return;
    void look();
    // `look` is stable enough for this: it reads the same three values named
    // here, and adding it would re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, period, survey, busy]);

  async function look() {
    if (!period || !payee) return;
    setError(null);
    setSurvey(null);
    setStep("Looking up that employee on chain…");
    try {
      setSurvey(await surveyEmployment({ networkId, contractAddress, payee, period }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStep(null);
    }
  }

  async function submit() {
    if (!api || !period || !survey) return;
    setError(null);
    setStep("Starting…");
    try {
      const result = await endEmployment({
        api,
        networkId,
        contractAddress,
        instance,
        period,
        slot: survey.slot,
        monthsWorked: survey.monthsWorked,
        claimKeyHash: effectiveClaimKeyHash,
        passphrase,
        provingMode: delegateProving && canDelegate ? "wallet" : "local",
        onProgress: setStep,
      });
      setDone({ ...result, matched: survey.matched });
      // The hash is demonstrably collected — it is inside an attestation that
      // is now on chain and write-once. Recording it here closes the gap that
      // made the setup line read "0/2 claim keys" for an employer who had
      // already used one: the collection panel's Save button was the only
      // thing that ever wrote to the store, so a hash pasted straight into
      // this form was used and forgotten. The counter then reported
      // outstanding work against people whose employment had already ended.
      recordClaimKeyHash(contractAddress, payee, effectiveClaimKeyHash);
      // Held no longer than the derivation needs it.
      setPassphrase("");
      // Straight on to the publish, with the opening this run produced. The
      // employer is not asked to do anything between the two: they are one
      // action as far as anyone outside this code is concerned.
      void relay.start({
        period: result.opening.finalPeriod,
        openings: [result.opening],
        publish: true,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStep(null);
    }
  }

  function download(result: TerminationResult) {
    const blob = new Blob([JSON.stringify(result.opening, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    // `termination-opening-…`, and the employee's name where there is one.
    //
    // This used to be `<instance>-<period>-slot-N.json`, which said neither what
    // the file was nor who it was about. `relay.ts` had already met the first
    // half of that problem from the other side — it prefixes the fund's claim
    // bundles precisely because the two names were one character apart — but the
    // opening itself was never given a matching prefix, so the pair stayed
    // confusable in the one folder where both land.
    //
    // The name comes from `choices`, so it survives a page opened without the
    // workbook — this browser remembers who was on it. Falling back to the slot
    // rather than omitting the segment keeps two openings from the same period
    // distinguishable when it does not.
    const fallback = `slot-${result.opening.slot + 1}`;
    const who =
      filenameSlug(
        choices.find(
          (choice) => choice.coinPublicKey.toLowerCase() === payee.toLowerCase()
        )?.fullName ?? ""
      ) || fallback;
    anchor.download =
      `termination-opening-${result.opening.instance}-` +
      `${result.opening.finalPeriod}-${who}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadBundle(bundle: NonNullable<typeof relayBundle>) {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `claim-bundle-${bundle.instance}-${bundle.period}-slot-${bundle.slot + 1}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    const relayBusy = relay.submitting || relay.job?.status === "running";
    const relayFailed =
      relay.job?.status === "failed" || relay.unavailable || Boolean(relaySkipped);
    return (
      <section className="callout" id="end-employment">
        <h2>
          {employee ? `${employee.fullName} — employment ended` : "Employment ended"}
        </h2>

        {/* Three technical acts, reported as one outcome. Each is a separate
            proof and a separate transaction, and an employer has no decision to
            make between them — so the progress is shown and the architecture is
            not. */}
        <ul className="flow-steps">
          <li className="ok-line">✓ Termination record created</li>
          <li className={relayBusy ? "running" : relayFailed ? "warn-inline" : "ok-line"}>
            {relayBusy ? "Preparing claim data…" : relayFailed ? "! Claim data not prepared" : "✓ Claim data prepared"}
          </li>
          <li
            className={
              relayBusy ? "running" : relayResult?.published ? "ok-line" : "warn-inline"
            }
          >
            {relayBusy
              ? `Publishing ${periodName(done.opening.finalPeriod)} claim root…`
              : relayResult?.published
                ? `✓ ${periodName(done.opening.finalPeriod)} claim root published`
                : `! ${periodName(done.opening.finalPeriod)} claim root not published`}
          </li>
        </ul>

        {/* Loud, because this is the only instruction that matters while a
            proof runs — and it was grey body text under a row of ticks. A
            closed tab does not lose a view; it abandons a transaction part way
            through a sequence. */}
        {relayBusy ? (
          <p className="run-warning">
            <span className="run-dot" aria-hidden="true" />
            <span>
              <strong>Still working — do not close this tab.</strong> One
              transaction and a few minutes of proving.
              {elapsed ? <span className="run-elapsed"> {elapsed}</span> : null}
            </span>
          </p>
        ) : null}

        {relayBundle ? (
          <>
            <p className="note">
              The claim bundle below is what{" "}
              {employee ? employee.fullName : "this person"} needs to claim. Hand
              it over — nothing here can rebuild it for them later.
            </p>
            <button type="button" className="primary" onClick={() => downloadBundle(relayBundle)}>
              Download claim bundle
            </button>{" "}
          </>
        ) : null}

        <button
          type="button"
          className={relayBundle ? "ghost" : "primary"}
          onClick={() => download(done)}
        >
          Download the opening
        </button>
        {employee ? null : (
          <>
            {" "}
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDone(null);
                setSurvey(null);
                setPayee("");
                setClaimKeyHash("");
                relay.reset();
              }}
            >
              End another
            </button>
          </>
        )}

        {relayFailed ? (
          <>
            <p className="status error">
              {relaySkipped
                ? `The relay would not publish this opening: ${relaySkipped.reason}`
                : relay.unavailable
                  ? "The service is not reachable, so the claim root was not published."
                  : relay.job?.status === "failed"
                    ? relay.job.error
                    : ""}
            </p>
            <p className="note">
              The termination itself is on chain and is not affected — it is
              write-once and it landed. Publishing is permissionless and can be
              redone by anyone at any time, so nothing is lost: download the
              opening above and publish it below once the cause is fixed.
            </p>
            <details className="details">
              <summary>Publish it manually</summary>
              <RelayPanel period={done.opening.finalPeriod} />
            </details>
          </>
        ) : null}

        <details className="details">
          <summary>Technical details</summary>
          <ul className="problems">
            <li>Attestation tx {done.txHash}</li>
            <li>
              {done.opening.monthsWorked} months on this payroll
              {done.matched.length > 0
                ? ` — ${done.matched.map(periodName).join(", ")}`
                : ""}
            </li>
            {relayResult?.txHash ? <li>Claim root tx {relayResult.txHash}</li> : null}
            {relayResult?.root ? <li>Root {relayResult.root}</li> : null}
          </ul>
          <p className="note">
            Three separate proofs and two transactions. The chain holds a hash of
            the termination statement and nothing else; the opening is what a
            claim is checked against, and it is not stored anywhere but the file
            you download. The claim root is a tree over everyone terminated in
            that month across every employer here — which is what keeps each
            claimant anonymous inside it, and why one person cannot build their
            own.
          </p>
        </details>
      </section>
    );
  }

  return (
    // Linked to directly from the employer overview, because "Run new payroll"
    // was the only route here and is a poor signpost for a termination.
    <section className="card" id="end-employment">
      <h2>End employment</h2>
      <p className="note" style={{ marginTop: 0 }}>
        One statement, signed by you, that an employee's last month was the one
        you name. It is what stops anyone choosing a better month later, and it
        is the only fact a benefit claim needs that payroll does not already
        publish. You cannot claim against it — that needs the employee's own
        wallet key.
      </p>

      <div className="actions" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select
          value={period ?? ""}
          disabled={busy}
          onChange={(event) => {
            setPeriod(Number(event.target.value));
            setSurvey(null);
          }}
        >
          {periods.map((value) => (
            <option key={value} value={value}>
              {periodName(value)}
            </option>
          ))}
        </select>
        {employee ? null : choices.length > 0 ? (
          <select
            // `payee` may hold a pasted key that is in no list — rendering that
            // as a selected option would be a lie, and rendering it as the empty
            // choice would suggest nobody is chosen while Look up is enabled.
            value={choices.some((c) => c.coinPublicKey === payee) ? payee : ""}
            disabled={busy}
            style={{ minWidth: 260 }}
            onChange={(event) => {
              setPayee(event.target.value);
              setSurvey(null);
            }}
          >
            <option value="">Choose an employee…</option>
            {choices.map((choice) => (
              <option key={choice.coinPublicKey} value={choice.coinPublicKey}>
                {choice.fullName || choice.coinPublicKey.slice(0, 12)}
              </option>
            ))}
          </select>
        ) : null}
        {/* Always available when nobody was named, not only when there is no
            list. A name is missing from the list whenever the roster was loaded
            on another machine, and that is precisely the case where an employer
            needs to proceed. */}
        {employee ? null : (
          <input
            value={payee}
            disabled={busy}
            placeholder={
              choices.length > 0 ? "…or paste a coin public key" : "Employee's coin public key"
            }
            style={{ minWidth: 320 }}
            onChange={(event) => {
              setPayee(event.target.value.trim());
              setSurvey(null);
            }}
          />
        )}
        {/* Only where it still asks something. With the employee named by the
            row, the lookup runs on its own — a button whose two inputs are both
            already decided is a step, not a choice. */}
        {employee ? null : (
          <button
            type="button"
            className="ghost"
            disabled={busy || !payee}
            onClick={() => void look()}
          >
            Look up
          </button>
        )}
      </div>
      {employee ? null : (
        <p className="note">
          {fromWorkbook
            ? "From the workbook you loaded above. Only you can turn a key into the hash the chain publishes, which is why the months below can be counted here and nowhere else."
            : choices.length > 0
              ? "From what this browser remembers of a workbook loaded earlier — names and public keys only, never a salary. Load the workbook for the current list, or paste a key for anyone missing from it."
              : "Load this contract's workbook and this becomes a list of names. Until then the key has to be pasted — the chain holds only a hash of it, so there is nowhere else to read one from."}
        </p>
      )}

      {survey ? (
        <>
          <p className="ok-line">
            ✓ Employee {survey.slot + 1} in {periodName(period!)} — {survey.monthsWorked}{" "}
            month{survey.monthsWorked === 1 ? "" : "s"} on this payroll
          </p>
          <p className="note" style={{ marginTop: 0 }}>
            {survey.matched.map(periodName).join(", ")}. Counted from the chain,
            not typed in — the attestation carries this number.
          </p>

          {hashFromEmployee ? (
            <p className="ok-line" style={{ marginTop: 0 }}>
              ✓ Claim-key hash supplied by the employee
            </p>
          ) : null}

          <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
            {/* Prefilled from what was collected for this employee, or from
                what they published — the hash is the same value either way, and
                retyping it is one more chance to anchor a termination against a
                key nobody holds. Editable regardless: this goes into a
                write-once statement, so the employer keeps the last word. */}
            <input
              value={effectiveClaimKeyHash}
              disabled={busy}
              placeholder="Employee's claim key hash"
              style={{ minWidth: 320 }}
              onChange={(event) => setClaimKeyHash(event.target.value.trim())}
            />
            <input
              type="password"
              value={passphrase}
              disabled={busy}
              placeholder="Payroll passphrase"
              autoComplete="off"
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <p className="note">
            The claim key hash comes from the employee, not from you — it is a
            hash, safe to send, and it is what lets them prove a claim is theirs
            without anyone being able to recognise them. Your passphrase derives
            this attestation's nonce so the opening can be rebuilt later.
          </p>

          <label className="prove-here">
            <input
              type="checkbox"
              checked={delegateProving && canDelegate}
              disabled={busy || !canDelegate}
              onChange={(event) => setDelegateProving(event.target.checked)}
            />{" "}
            Let the wallet generate the proof
            <span className="muted">
              {" "}
              {canDelegate ? (
                <>
                  — no proof server needed on this machine.{" "}
                  <strong>
                    Proving consumes this attestation's opening — their claim-key
                    hash, their final month, their months worked and the nonce your
                    passphrase derives — so this hands all four to the wallet.
                  </strong>{" "}
                  <span title="Unticked, proving runs against a proof server on this machine at 127.0.0.1:6300 and reaches nowhere else.">
                    Unticked, they stay on this machine.
                  </span>
                </>
              ) : (
                " This wallet cannot prove on its own, so a proof server on this machine is the only option."
              )}
            </span>
          </label>

          <button
            type="button"
            className="primary"
            disabled={busy || !effectiveClaimKeyHash || !passphrase || !api}
            onClick={() => void submit()}
          >
            {busy ? step : `End employment as of ${periodName(period!)}`}
          </button>
        </>
      ) : null}

      {error ? <p className="status error">{error}</p> : null}
      {busy && !survey ? <p className="muted">{step}</p> : null}
    </section>
  );
}
