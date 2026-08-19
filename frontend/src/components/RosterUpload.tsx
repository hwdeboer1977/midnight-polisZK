import { useEffect, useState } from "react";
import type { ParsedRoster } from "../generated/roster";
import { submitPayroll, type SubmitResult } from "../lib/submitPayroll";
import {
  fundAndPayPeriod,
  fundAndPayViaService,
  periodStatus,
  type RunResult,
} from "../lib/payPayroll";
import { loadDeployments } from "../lib/deployments";
import { useWallet } from "../wallet/WalletContext";

// The xlsx parser drags in ~950 kB of spreadsheet library. Loading it only when
// a file is actually chosen keeps it out of the initial bundle entirely.
const loadParser = () => import("../generated/roster");

const ROSTER_COLUMNS = ["Full name", "Address", "Monthly gross salary"] as const;
// Mirrors ROSTER_SIZE in the generated roster module, which mirrors the
// contract. Three copies of one number is two too many; the generated module is
// the one to trust if they ever disagree.
const ROSTER_SIZE = 2;

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
  const [payStep, setPayStep] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<RunResult | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  /** Name of a filed-but-unpaid period, so the card can say why a file is needed. */
  const [outstanding, setOutstanding] = useState<string | null>(null);
  const [filedPeriods, setFiledPeriods] = useState<number[]>([]);
  /** Explicit opt-in to replacing a month that is already on chain. */
  const [allowRefile, setAllowRefile] = useState(false);
  /** Opt in to proving in the page instead of handing the run to the service. */
  const [proveHere, setProveHere] = useState(false);
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

  // One read of the contract, not two. Both answers come from the same state,
  // and the public indexer rate-limits a page that asks twice on every mount.
  //
  // `firstFiling` decides whether to ask for the passphrase twice: confirmation
  // is only useful before anything is on chain, since afterwards a wrong
  // passphrase is caught by failing to open an existing opening — a real check
  // rather than a retype.
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const address = target.contractAddress;

    void (async () => {
      try {
        const status = await periodStatus(networkId, address);
        if (cancelled) return;
        setFirstFiling(!status.hasSealed);
        setOutstanding(status.unpaid === null ? null : periodName(status.unpaid));
        setFiledPeriods(status.filed);
      } catch {
        // A failed read must not make the card claim a period is settled, nor
        // skip the confirmation field. Both fall back to the cautious answer.
        if (cancelled) return;
        setFirstFiling(true);
        setOutstanding(null);
        setFiledPeriods([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [target?.contractAddress, networkId, submitted, payResult]);

  const usable = roster !== null && roster.problems.length === 0;
  const needsConfirmation = firstFiling !== false;
  const passphraseReady =
    passphrase.length >= 8 && (!needsConfirmation || confirmation === passphrase);
  const submitting = step !== null;
  // Filing a month that is already on chain replaces its commitments with fresh
  // nonces and resets its payment flags — so a month that was paid would read
  // as unpaid, against commitments the old openings no longer match. It is a
  // legitimate operation (a correction) but never an accident, hence the
  // explicit opt-in rather than a button that happens to still be enabled.
  const alreadyFiled =
    roster?.period !== null &&
    roster?.period !== undefined &&
    filedPeriods.includes(roster.period);

  const canSubmit =
    usable &&
    roster.period !== null &&
    target !== undefined &&
    api !== null &&
    passphraseReady &&
    (!alreadyFiled || allowRefile) &&
    !submitting;

  /**
   * Funds and pays the period this roster describes.
   *
   * Needs the roster, not just the chain: the contract holds commitments, so
   * the salaries have to come from the file that produced them.
   */
  async function onFundAndPay() {
    if (!roster || roster.period === null || !target || !api) return;

    setPayError(null);
    setPayResult(null);
    setPayStep("Starting…");
    try {
      if (proveHere) {
        // Everything stays in the page: salaries, passphrase and proving. This
        // is the shape the product wants; it is opt-in because coin-carrying
        // circuits have historically been rejected by the proof server here.
        const deployments = await loadDeployments();
        const peur = Object.values(deployments).find(
          (d) => d.contractName === "peur" && d.networkId === networkId
        );
        if (!peur?.tokenId) {
          throw new Error(
            `No pEUR token id for ${networkId} — run \`npm run frontend:config\`.`
          );
        }
        setPayResult(
          await fundAndPayPeriod({
            api,
            networkId,
            contractAddress: target.contractAddress,
            passphrase,
            tokenId: peur.tokenId,
            period: roster.period,
            salaries: roster.rows.map((row) => row.salaryMinor),
            onProgress: setPayStep,
          })
        );
      } else {
        setPayResult(
          await fundAndPayViaService({
            instance: target.name.replace(/^payroll:/, ""),
            contractAddress: target.contractAddress,
            period: roster.period,
            salaries: roster.rows.map((row) => row.salaryMinor),
            passphrase,
            onProgress: setPayStep,
          })
        );
      }
      onSubmitted?.();
    } catch (cause) {
      setPayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPayStep(null);
    }
  }

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

      {target && outstanding ? (
        <p className="note first-time">
          <strong>{outstanding} is filed but not fully paid.</strong> Upload the same
          roster again to fund and pay it — the chain stores commitments, not salaries,
          so the amounts have to come from the file that produced them.
        </p>
      ) : null}

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

                  {alreadyFiled ? (
                    <div className="refile">
                      <label>
                        <input
                          type="checkbox"
                          checked={allowRefile}
                          disabled={submitting || payStep !== null}
                          onChange={(e) => setAllowRefile(e.target.checked)}
                        />{" "}
                        Re-file {roster.period ? periodName(roster.period) : "this month"} —
                        replaces its commitments and marks every employee unpaid
                      </label>
                      <p className="note">
                        Already on chain. To pay it, use <strong>Fund and pay</strong>{" "}
                        below; re-filing is for correcting a month, and any payment
                        already made against the old commitments would no longer match.
                      </p>
                    </div>
                  ) : null}

                  <button
                    className="primary"
                    onClick={() => void onSubmit()}
                    disabled={!canSubmit}
                  >
                    {submitting
                      ? "Submitting…"
                      : alreadyFiled
                        ? `Re-file ${roster.period ? periodName(roster.period) : "this period"}`
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

              {/* Funding and paying reuse the same passphrase and the same
                  roster, so they live here rather than on the contract card —
                  the chain holds commitments, not salaries. */}
              <button
                className="primary secondary-action"
                onClick={() => void onFundAndPay()}
                disabled={
                  !usable ||
                  roster.period === null ||
                  !api ||
                  !passphraseReady ||
                  submitting ||
                  payStep !== null
                }
              >
                {payStep !== null ? "Funding and paying…" : "Fund and pay this period"}
              </button>
              <p className="note">
                Moves pEUR into the contract, one coin per employee carrying exactly the
                committed salary, then pays each one out. The circuit refuses any amount
                that does not open that employee's commitment, so nobody — including you
                — can pay a figure other than the one filed. Twenty proofs for ten
                employees, so expect this to take a while. Safe to re-run: funded and
                paid slots are skipped.
              </p>
              <label className="prove-here">
                <input
                  type="checkbox"
                  checked={proveHere}
                  disabled={payStep !== null}
                  onChange={(e) => setProveHere(e.target.checked)}
                />{" "}
                Prove in this browser instead of the local service
                <span className="muted">
                  {" "}
                  — nothing leaves the page, but coin-carrying circuits have been
                  rejected by the proof server here. Experimental.
                </span>
              </label>

              <p className="note">
                <strong>Runs in the local payroll service</strong> (
                <code>npm run demo:server</code>), not in this page — coin-carrying
                circuits cannot yet be proven through the wallet connector. So this needs
                the service running, it signs with the platform wallet rather than yours,
                and this period's amounts are sent to <code>127.0.0.1</code>. Your
                passphrase is <strong>not</strong> sent — the nonces and the employees'
                public keys are derived here first, so the service can pay this month and
                nothing else.
              </p>

              {step ? <p className="status">{step}</p> : null}
              {payStep ? <p className="status">{payStep}</p> : null}

              {payError ? (
                <p className="status error">Could not fund/pay: {payError}</p>
              ) : null}

              {payResult ? (
                <div className="problems">
                  <strong>
                    Funded {payResult.funded}, paid {payResult.paid} employee
                    {payResult.paid === 1 ? "" : "s"}
                  </strong>
                </div>
              ) : null}

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
