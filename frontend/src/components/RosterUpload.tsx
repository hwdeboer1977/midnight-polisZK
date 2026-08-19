import { useEffect, useState } from "react";
import type { ParsedRoster } from "../generated/roster";
import { hasBeenFiled, submitPayroll, type SubmitResult } from "../lib/submitPayroll";
import { useWallet } from "../wallet/WalletContext";

// The xlsx parser drags in ~950 kB of spreadsheet library. Loading it only when
// a file is actually chosen keeps it out of the initial bundle entirely.
const loadParser = () => import("../generated/roster");

const ROSTER_COLUMNS = ["Full name", "Address", "Monthly gross salary"] as const;
const ROSTER_SIZE = 10;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** 202603 -> "March 2026". */
function periodName(period: number): string {
  const month = MONTHS[(period % 100) - 1];
  return month ? `${month} ${Math.floor(period / 100)}` : String(period);
}
import { formatPeur } from "../lib/format";

/**
 * The employer's roster never leaves this machine. The file is parsed in the
 * browser, and only the salaries — as private circuit inputs — ever reach a
 * transaction. Names and addresses are shown here for confirmation and then
 * forgotten.
 */
export interface SubmitTarget {
  /** Display name of the instance the payroll will be filed against. */
  name: string;
  contractAddress: string;
}

export function RosterUpload({
  target,
  onSubmitted,
}: {
  /** Absent when the connected key is not an employer — then there is nothing to submit to. */
  target?: SubmitTarget;
  onSubmitted?: () => void;
} = {}) {
  const { api, networkId } = useWallet();
  const [step, setStep] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  /** Null until the chain has been asked whether this contract has been filed before. */
  const [firstFiling, setFirstFiling] = useState<boolean | null>(null);
  const [roster, setRoster] = useState<ParsedRoster | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setRoster(null);
    setSubmitted(null);
    setSubmitError(null);
    setFileName(file.name);

    try {
      const [{ parseRosterWorkbook }, buffer] = await Promise.all([
        loadParser(),
        file.arrayBuffer(),
      ]);
      setRoster(await parseRosterWorkbook(buffer));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    // Confirmation is only useful before anything is on chain; afterwards a
    // wrong passphrase is caught by failing to open an existing opening, which
    // is a real check rather than a retype.
    void hasBeenFiled(networkId, target.contractAddress)
      .then((filed) => !cancelled && setFirstFiling(!filed))
      .catch(() => !cancelled && setFirstFiling(true));
    return () => {
      cancelled = true;
    };
  }, [target?.contractAddress, networkId]);

  const usable = roster !== null && roster.problems.length === 0;
  const needsConfirmation = firstFiling !== false;
  const passphraseReady =
    passphrase.length >= 8 && (!needsConfirmation || confirmation === passphrase);
  const submitting = step !== null;
  const canSubmit =
    usable &&
    roster.period !== null &&
    target !== undefined &&
    api !== null &&
    passphraseReady &&
    !submitting;

  async function onSubmit() {
    if (!roster || roster.period === null || !target || !api) return;

    setSubmitError(null);
    setSubmitted(null);
    setStep("Starting…");
    try {
      const result = await submitPayroll({
        api,
        networkId,
        contractAddress: target.contractAddress,
        passphrase,
        period: roster.period,
        salaries: roster.rows.map((row) => row.salaryMinor),
        onProgress: setStep,
      });
      setSubmitted(result);
      // Held no longer than it takes to derive one key.
      setPassphrase("");
      setConfirmation("");
      onSubmitted?.();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStep(null);
    }
  }

  return (
    <section className="card">
      <h2>Upload roster</h2>

      <label className="upload">
        <input type="file" accept=".xlsx" onChange={(e) => void onFile(e)} />
        <span>{busy ? "Reading…" : "Choose an .xlsx file"}</span>
      </label>
      <p className="note">
        Year and Month above the table, then columns: {ROSTER_COLUMNS.join(" · ")}.
        Generate a starting point with <code>npm run roster:template</code>. Parsed in
        your browser — the file is never uploaded anywhere.
      </p>

      {error ? <p className="status error">Could not read {fileName}: {error}</p> : null}

      {roster ? (
        <>
          {roster.problems.length > 0 ? (
            <div className="problems">
              <strong>{fileName} is not usable yet:</strong>
              <ul>
                {roster.problems.map((problem, i) => (
                  <li key={i}>
                    {problem.row === 0 ? problem.message : `row ${problem.row}: ${problem.message}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {roster.period ? (
            <p className="status">
              Payroll period: <strong>{periodName(roster.period)}</strong>{" "}
              <span className="muted">({roster.period})</span>
            </p>
          ) : null}

          <table className="roster">
            <thead>
              <tr>
                <th>#</th>
                <th>Full name</th>
                <th>Address</th>
                <th className="num">Monthly gross</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row) => (
                <tr key={row.index}>
                  <td className="muted">{row.index}</td>
                  <td>{row.fullName}</td>
                  <td className="muted">{row.address}</td>
                  <td className="num">{formatPeur(row.salaryMinor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  Total <span className="muted">— the only figure that becomes public</span>
                </td>
                <td className="num total">{formatPeur(roster.totalMinor)}</td>
              </tr>
            </tfoot>
          </table>

                    {usable ? (
            <>
              <p className="note">
                Ready: {ROSTER_SIZE} employees
                {roster.period ? ` for ${periodName(roster.period)}` : ""}. Only the total
                and one commitment per employee will be published; the names and addresses
                above stay here.
              </p>

              {target ? (
                <>
                  <div className="passphrase">
                    {needsConfirmation ? (
                      <p className="note first-time">
                        <strong>You are creating this passphrase now.</strong> Nothing has
                        been filed against this contract yet, so there is no existing one
                        to look up — choose it here and save it somewhere you will still
                        have it in a year. A password manager, under the company's
                        records, not on this machine alone.
                      </p>
                    ) : null}

                    <label>
                      {needsConfirmation
                        ? "Choose a payroll passphrase"
                        : "Payroll passphrase"}
                      <input
                        type="password"
                        autoComplete="off"
                        value={passphrase}
                        disabled={submitting}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={
                          needsConfirmation
                            ? "at least 8 characters"
                            : "the one you chose when you first filed"
                        }
                      />
                    </label>
                    {needsConfirmation ? (
                      <label>
                        Confirm passphrase
                        <input
                          type="password"
                          autoComplete="off"
                          value={confirmation}
                          disabled={submitting}
                          onChange={(e) => setConfirmation(e.target.value)}
                          placeholder="type it again"
                        />
                      </label>
                    ) : null}
                    <p className="note">
                      It derives every nonce and unlocks every sealed opening for this
                      contract, and the CLI asks for the same one. It is never sent
                      anywhere and never stored — only a one-way fingerprint, to catch a
                      typo.{" "}
                      {needsConfirmation ? (
                        <strong>
                          There is no reset: lose it and no commitment on this contract
                          can ever be reopened.
                        </strong>
                      ) : (
                        "It is checked against an opening already on chain before anything is sent, so a wrong one is refused rather than filed."
                      )}
                    </p>
                  </div>

                  <button
                    className="primary"
                    onClick={() => void onSubmit()}
                    disabled={!canSubmit}
                  >
                    {submitting
                      ? "Submitting…"
                      : `Submit payroll for ${roster.period ? periodName(roster.period) : "this period"}`}
                  </button>
                  <p className="note">
                    Files against <strong>{target.name}</strong>. Your wallet will ask you
                    once, to authorise the transaction. Proving runs on your own machine
                    and takes a few minutes — the salaries are never sent anywhere.
                  </p>
                </>
              ) : (
                <p className="note">
                  Connect the employer key for a payroll contract to submit. This key does
                  not control one, so there is nothing to file against.
                </p>
              )}

              {step ? <p className="status">{step}</p> : null}

              {submitError ? (
                <p className="status error">Could not submit: {submitError}</p>
              ) : null}

              {submitted ? (
                <div className="problems">
                  <strong>
                    Filed {periodName(submitted.period)} — {formatPeur(submitted.totalMinor)} pEUR
                  </strong>
                  <ul>
                    <li>tx {submitted.txHash}</li>
                    {submitted.blockHeight !== null ? (
                      <li>block {submitted.blockHeight}</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
