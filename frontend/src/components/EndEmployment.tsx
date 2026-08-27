import { useEffect, useState } from "react";
import { periodName } from "../generated/roster";
import {
  endEmployment,
  surveyEmployment,
  type TerminationResult,
} from "../lib/endEmployment";
import { collectedFor } from "../lib/collected";
import { filenameSlug } from "../lib/payslip";
import { walletCanProve } from "../lib/submitPayroll";
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
}: {
  contractAddress: string;
  instance: string;
  networkId: string;
  /** Filed periods, newest first. */
  periods: number[];
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
  const [payee, setPayee] = useState("");
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
  const effectiveClaimKeyHash =
    claimKeyHash || collectedFor(contractAddress)[payee]?.claimKeyHash || "";

  const canDelegate = api ? walletCanProve(api) : false;
  const [delegateProving, setDelegateProving] = useState(false);
  useEffect(() => {
    if (canDelegate) setDelegateProving(true);
  }, [canDelegate]);

  if (periods.length === 0) return null;

  const busy = step !== null;

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
      // Held no longer than the derivation needs it.
      setPassphrase("");
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
    // The name needs the roster, so it is only there when a workbook is loaded.
    // Falling back to the slot rather than omitting the segment keeps two
    // openings from the same period distinguishable either way.
    const fallback = `slot-${result.opening.slot + 1}`;
    const who =
      filenameSlug(
        roster?.rows.find(
          (row) => row.coinPublicKey.toLowerCase() === payee.toLowerCase()
        )?.fullName ?? ""
      ) || fallback;
    anchor.download =
      `termination-opening-${result.opening.instance}-` +
      `${result.opening.finalPeriod}-${who}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <section className="callout" id="end-employment">
        <h2>Employment ended — {periodName(done.opening.finalPeriod)}</h2>
        <p className="ok-line" style={{ marginTop: 0 }}>
          ✓ Attested on chain, and it cannot be revised
        </p>
        <ul className="problems">
          <li>tx {done.txHash}</li>
          <li>
            {done.opening.monthsWorked} months on this payroll
            {done.matched.length > 0
              ? ` — ${done.matched.map(periodName).join(", ")}`
              : ""}
          </li>
        </ul>
        <p className="note">
          The chain now holds a hash of this statement and nothing else. The
          opening below is what a claim is checked against, and it has to reach
          the fund's relay — download it and hand it over. It is not stored here,
          and it cannot be recovered from the page once you leave.
        </p>
        <button type="button" className="primary" onClick={() => download(done)}>
          Download the opening
        </button>{" "}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setDone(null);
            setSurvey(null);
            setPayee("");
            setClaimKeyHash("");
          }}
        >
          End another
        </button>
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
        {roster && roster.rows.length > 0 ? (
          <select
            value={payee}
            disabled={busy}
            style={{ minWidth: 260 }}
            onChange={(event) => {
              setPayee(event.target.value);
              setSurvey(null);
            }}
          >
            <option value="">Choose an employee…</option>
            {roster.rows.map((row) => (
              <option key={row.coinPublicKey} value={row.coinPublicKey}>
                {row.fullName || row.coinPublicKey.slice(0, 12)}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={payee}
            disabled={busy}
            placeholder="Employee's coin public key"
            style={{ minWidth: 320 }}
            onChange={(event) => {
              setPayee(event.target.value.trim());
              setSurvey(null);
            }}
          />
        )}
        <button type="button" className="ghost" disabled={busy || !payee} onClick={() => void look()}>
          Look up
        </button>
      </div>
      <p className="note">
        {roster && roster.rows.length > 0
          ? "From the workbook you loaded above. Only you can turn a key into the hash the chain publishes, which is why the months below can be counted here and nowhere else."
          : "Load this contract's workbook above and this becomes a list of names. Until then the key has to be pasted — the chain holds only a hash of it, so there is nowhere else to read one from."}
      </p>

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

          <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
            {/* Prefilled from what was collected for this employee, if
                anything was — the hash is the same value either way, and
                retyping it is one more chance to anchor a termination against a
                key nobody holds. */}
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
