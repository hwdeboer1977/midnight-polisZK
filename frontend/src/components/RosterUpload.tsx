import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DUTCH_V1, computeLine } from "../generated/tax-params";
import { platformActions } from "../lib/origin";
import type { ParsedRoster } from "../generated/roster";
import { submitPayroll, walletCanProve, type SubmitResult } from "../lib/submitPayroll";
import {
  fundAndPayPeriod,
  fundAndPayViaService,
  fundWithholding,
  periodStatus,
  type RunResult,
} from "../lib/payPayroll";
import { loadDeployments } from "../lib/deployments";
import { recordRoster } from "../lib/collected";
import { FilePicker } from "./FilePicker";
import { MonthSteps } from "./MonthSteps";
import { PayslipRecovery } from "./PayslipRecovery";
import { Payslips } from "./Payslips";
import { useWallet } from "../wallet/WalletContext";

// The xlsx parser drags in ~950 kB of spreadsheet library. Loading it only when
// a file is actually chosen keeps it out of the initial bundle entirely.
const loadParser = () => import("../generated/roster");

const ROSTER_COLUMNS = [
  "Full name",
  "Address",
  "Monthly gross salary",
  "Weeks worked",
  "Coin public key",
  "Encryption public key",
] as const;
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
  /**
   * Whether the platform wallet is also this instance's employer.
   *
   * False means the local service cannot fund or pay here: it signs with the
   * platform key, and `fundEmployee`/`payPeriod` assert `ownPublicKey() ==
   * employer`. Letting someone press the button anyway spends minutes of
   * proving to arrive at `failed assert: only the employer may pay`.
   */
  operatorIsEmployer: boolean;
}

export function RosterUpload({
  target,
  onSubmitted,
  onRoster,
  monthState,
  openPeriod,
}: {
  /** Absent when the connected key is not an employer — then there is nothing to submit to. */
  target?: SubmitTarget;
  onSubmitted?: () => void;
  /**
   * The parsed workbook, handed up as soon as it is read.
   *
   * Ending someone's employment needs their coin public key, and the chain only
   * holds a hash of it — so the workbook is the only place on this page that
   * knows who the employees are. Reporting it lets the termination form offer a
   * list of names instead of a paste field.
   */
  onRoster?: (roster: ParsedRoster | null) => void;
  /**
   * What the chain says about the loaded month, from the page above.
   *
   * Local signals only know what happened in this session — after a reload a
   * filed month would look unfiled. Chain state is the truth where it exists.
   */
  monthState?: { filed: boolean; paid: boolean; withheld: boolean };
  /**
   * The month the card is open on, when no workbook is loaded.
   *
   * Withholding needs a period and nothing else from the sheet, so without this
   * the one step the card exists to surface had no way to name its month — and
   * therefore no button.
   */
  openPeriod?: number | null;
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
  const [withheld, setWithheld] = useState<
    { taxMinor: bigint; socialMinor: bigint; alreadyDone: boolean } | null
  >(null);
  const [payResult, setPayResult] = useState<RunResult | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  /** Name of a filed-but-unpaid period, so the card can say why a file is needed. */
  const [outstanding, setOutstanding] = useState<string | null>(null);
  const [filedPeriods, setFiledPeriods] = useState<number[]>([]);
  /** Explicit opt-in to replacing a month that is already on chain. */
  const [allowRefile, setAllowRefile] = useState(false);
  /** Opt in to proving in the page instead of handing the run to the service. */
  const [proveHere, setProveHere] = useState(false);
  // The service route is unavailable unless the operator is the employer, so
  // the choice collapses to one option and the checkbox stops being a choice.
  //
  // It is also unavailable on a hosted build: `/api/*` is a dev-server proxy to
  // a local process holding the platform key, and there is no such process
  // behind a deployed origin. Detected by origin rather than probed, because
  // the answer never changes for a given deployment.
  const serviceUsable = (target?.operatorIsEmployer ?? false) && platformActions;
  // Not every wallet can prove: 1AM can (in-tab WASM), Lace cannot and needs
  // the local proof server. Offering a toggle that cannot work is worse than
  // not offering it.
  const canDelegate = api ? walletCanProve(api) : false;
  const useBrowser = proveHere || !serviceUsable;
  /** Let the wallet generate the proofs instead of the local proof server. */
  // On by default wherever the wallet can prove. A hosted build has no local
  // proof server to fall back to, so defaulting off meant the first thing a
  // visitor did was fail against 127.0.0.1:6300. 1AM proves in-tab, so the
  // salaries stay on this machine either way — the difference is speed, not
  // exposure — and the box is still there to turn it off.
  const [delegateProving, setDelegateProving] = useState(false);
  useEffect(() => {
    if (canDelegate) setDelegateProving(true);
  }, [canDelegate]);
  const [roster, setRoster] = useState<ParsedRoster | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * The blank workbook, built in the page.
   *
   * It used to be reachable only by running `npm run roster:template`, printed
   * as instructions on an employer-facing screen. The builder is the same code
   * the CLI uses, so the file an employer downloads here and the one a
   * developer generates are the same workbook.
   */
  async function downloadTemplate() {
    const { buildRosterTemplate } = await loadParser();
    const workbook = await buildRosterTemplate();
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "roster-template.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setRoster(null);
    onRoster?.(null);
    setSubmitted(null);
    setSubmitError(null);
    setFileName(file.name);

    try {
      const [{ parseRosterWorkbook }, buffer] = await Promise.all([
        loadParser(),
        file.arrayBuffer(),
      ]);
      const parsed = await parseRosterWorkbook(buffer);
      setRoster(parsed);
      onRoster?.(parsed);
      // Remembered so pages rebuilt from chain — which only holds hashes — can
      // show who these people are.
      if (target) recordRoster(target.contractAddress, parsed.rows);
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

  // Summed per employee, never a rate reapplied to the gross total: floor
  // division does not distribute and the brackets are progressive, so taxing
  // the sum is a different figure — and not the one the circuit will publish.
  const totals = (roster?.rows ?? []).reduce(
    (acc, row) => {
      const line = computeLine(row.salaryMinor, DUTCH_V1);
      return {
        tax: acc.tax + line.taxMinor,
        social: acc.social + line.contribMinor,
        net: acc.net + line.netMinor,
      };
    },
    { tax: 0n, social: 0n, net: 0n }
  );
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
      if (useBrowser) {
        // Everything stays in the page: salaries, passphrase and proving. This
        // is the shape the product wants, and it works: coin-carrying circuits
        // prove here now.
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
            weeks: roster.rows.map((row) => row.weeks),
            payees: roster.rows.map((row) => ({
              coinPublicKey: row.coinPublicKey,
              encryptionPublicKey: row.encryptionPublicKey,
            })),
            provingMode: delegateProving ? "wallet" : "local",
            onProgress: setPayStep,
          })
        );
      } else {
        setPayResult(
          await fundAndPayViaService({
            instance: target.name.replace(/^payroll:/, ""),
            networkId,
            contractAddress: target.contractAddress,
            period: roster.period,
            salaries: roster.rows.map((row) => row.salaryMinor),
            weeks: roster.rows.map((row) => row.weeks),
            payees: roster.rows.map((row) => ({
              coinPublicKey: row.coinPublicKey,
              encryptionPublicKey: row.encryptionPublicKey,
            })),
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

  /**
   * Moves this period's withheld tax and contribution into the contract.
   *
   * Separate from paying, because it is a different obligation to a different
   * party — and until it runs, the public page reports the withholding as
   * assessed and not collected, which is the honest reading of a contract whose
   * pools are empty.
   */
  async function onWithhold() {
    // Deliberately not gated on a loaded roster. The amounts come from
    // `totalTaxFor` and `totalSocialFor` on chain, so a month filed weeks ago
    // can be withheld without finding the workbook again — which is the whole
    // point of publishing those totals.
    const period = roster?.period ?? openPeriod ?? null;
    if (period === null || !target || !api) return;

    setPayError(null);
    setPayStep("Starting…");
    try {
      const deployments = await loadDeployments();
      const peur = Object.values(deployments).find(
        (d) => d.contractName === "peur" && d.networkId === networkId
      );
      if (!peur?.tokenId) {
        throw new Error(`No pEUR token id for ${networkId} — run \`npm run frontend:config\`.`);
      }
      const result = await fundWithholding({
        api,
        networkId,
        contractAddress: target.contractAddress,
        passphrase,
        tokenId: peur.tokenId,
        period,
        provingMode: delegateProving ? "wallet" : "local",
        onProgress: setPayStep,
      });
      setWithheld(result);
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
        provingMode: delegateProving ? "wallet" : "local",
        passphrase,
        period: roster.period,
        salaries: roster.rows.map((row) => row.salaryMinor),
        weeks: roster.rows.map((row) => row.weeks),
        payees: roster.rows.map((row) => row.coinPublicKey),
        names: roster.rows.map((row) => row.fullName),
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

  // Step one's control, and everything that used to be a panel around it. The
  // prose is folded into a disclosure rather than cut: it answers questions an
  // employer has once, and it was sitting between them and the file chooser
  // every month.
  const chooseFile = (
    <>
      {target && outstanding ? (
        <p className="note first-time">
          <strong>{outstanding} is filed but not fully paid.</strong> Load the same
          workbook again to fund and pay it — the chain stores commitments, not
          salaries, so the amounts have to come from the file that produced them.
        </p>
      ) : null}

      <FilePicker
        label={busy ? "Reading…" : "Choose this period's .xlsx"}
        loaded={
          fileName
            ? roster?.period
              ? `Roster for ${periodName(roster.period)}`
              : "Roster workbook"
            : null
        }
        filename={fileName}
        accept=".xlsx"
        disabled={busy}
        onFile={onFile}
      />{" "}
      <button type="button" className="ghost" onClick={() => void downloadTemplate()}>
        Download a blank template
      </button>

      <details className="why">
        <summary>What goes in the workbook</summary>
        <p className="note">
          A payroll period is one month's figures for the people already on your{" "}
          <Link to="/employer/roster">roster</Link>. Year and Month above the table,
          then columns: {ROSTER_COLUMNS.join(" · ")}. The period it is for is read
          from the sheet. Parsed in your browser — the file is never uploaded
          anywhere.
        </p>
        <p className="note">
          The same workbook carries the employee keys and this month's salaries, so
          filing a period is also what keeps your roster current. Only the amounts
          belong to the period — the people carry across months.
        </p>
      </details>

      {error ? <p className="status error">Could not read {fileName}: {error}</p> : null}
    </>
  );

  // ── the month, as steps that carry their own controls ──────────────────
  //
  // This used to be a panel headed "Run new payroll" sitting under a separate
  // status strip, which meant the page described filing twice in two different
  // structures — and the strip's first step had no button, because the file
  // chooser was in the panel. One structure now: the steps are the form.

  const filed = monthState?.filed ?? alreadyFiled;
  const paid = monthState?.paid ?? payResult !== null;
  const withheldDone = monthState?.withheld ?? withheld !== null;
  const ready = Boolean(roster && usable);

  const previewBlock = roster ? (
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

      {usable ? (
        <>
          <table className="roster">
            <thead>
              <tr>
                <th>#</th>
                <th>Full name</th>
                <th>Pays to</th>
                <th className="num">Gross</th>
                <th className="num derived">Tax</th>
                <th className="num derived">Social</th>
                <th className="num derived">Net</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row) => {
                // Shown, not entered. The employer supplies gross; these are
                // what the published rule set produces from it, computed here
                // with the same arithmetic the circuit will redo and refuse to
                // disagree with.
                const line = computeLine(row.salaryMinor, DUTCH_V1);
                return (
                  <tr key={row.index}>
                    <td className="muted">{row.index}</td>
                    <td>{row.fullName}</td>
                    <td className="mono" title={row.coinPublicKey}>
                      {row.coinPublicKey
                        ? `${row.coinPublicKey.slice(0, 8)}…${row.coinPublicKey.slice(-6)}`
                        : "—"}
                    </td>
                    <td className="num">{formatPeur(row.salaryMinor)}</td>
                    <td className="num muted">{formatPeur(line.taxMinor)}</td>
                    <td className="num muted">{formatPeur(line.contribMinor)}</td>
                    <td className="num">{formatPeur(line.netMinor)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  Totals <span className="muted">— the only figures that become public</span>
                </td>
                <td className="num total">{formatPeur(roster.totalMinor)}</td>
                <td className="num total">{formatPeur(totals.tax)}</td>
                <td className="num total">{formatPeur(totals.social)}</td>
                <td className="num total">{formatPeur(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
          <details className="why">
            <summary>Why are tax and net already filled in?</summary>
            <p className="note">
              <strong>Gross is from your workbook. Tax, social and net are not.</strong>{" "}
              They are computed here from the published rule set so you can see what a
              period will cost before you file it — but they are not what makes them
              true. The circuit rebuilds the same figures from each gross salary and
              refuses any it did not produce, so a wrong number here fails to file
              rather than filing wrongly.
            </p>
            <p className="note">
              Only the totals and one commitment per employee are published. The names
              and addresses stay here, and each coin public key is published as a hash,
              so the chain shows a slot has a payee without showing who.
            </p>
          </details>
        </>
      ) : null}
    </>
  ) : null;

  const passphraseBlock = (
    <div className="passphrase">
      {needsConfirmation ? (
        <p className="note first-time">
          <strong>You are creating this passphrase now.</strong> Nothing has been filed
          against this contract yet, so there is no existing one to look up — choose it
          here and save it somewhere you will still have it in a year.
        </p>
      ) : null}

      <label>
        {needsConfirmation ? "Choose a payroll passphrase" : "Payroll passphrase"}
        <input
          type="password"
          autoComplete="off"
          value={passphrase}
          disabled={submitting}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder={
            needsConfirmation ? "at least 8 characters" : "the one you chose when you first filed"
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
        It derives every nonce and unlocks every sealed opening for this contract, and
        the CLI asks for the same one. Never sent anywhere, never stored.{" "}
        {needsConfirmation ? (
          <strong>
            There is no reset: lose it and no commitment on this contract can ever be
            reopened.
          </strong>
        ) : (
          "It is checked against an opening already on chain before anything is sent, so a wrong one is refused rather than filed."
        )}
      </p>
    </div>
  );

  const provingChoice = (
    <label className="prove-here">
      <input
        type="checkbox"
        checked={delegateProving && canDelegate}
        disabled={submitting || payStep !== null || !canDelegate}
        onChange={(e) => setDelegateProving(e.target.checked)}
      />{" "}
      Let the wallet generate the proofs
      <span className="muted">
        {" "}
        — instead of the proof server on this machine.{" "}
        <strong>
          Proving consumes the salaries, so this hands them to the wallet, and where it
          proves is its choice.
        </strong>{" "}
        {/* The port was in the sentence. An employer does not configure a proof
            server, and an address in body copy reads as something they are
            expected to act on — same category as the EXPLORERS note. It stays
            reachable on hover. */}
        <span title="Unticked, proving runs against the proof server on this machine at 127.0.0.1:6300 and reaches nowhere else.">
          Unticked, they stay on this machine.
        </span>
        {canDelegate
          ? " This wallet proves in the tab, so the salaries stay here either way."
          : " This wallet cannot prove on its own, so the local proof server is the only option."}
      </span>
    </label>
  );

  const fileAction = !target ? (
    <p className="note">
      Connect the employer key for a payroll contract to file. This key does not control
      one, so there is nothing to file against.
    </p>
  ) : (
    <>
      {passphraseBlock}
      {alreadyFiled ? (
        <div className="refile">
          <label>
            <input
              type="checkbox"
              checked={allowRefile}
              disabled={submitting || payStep !== null}
              onChange={(e) => setAllowRefile(e.target.checked)}
            />{" "}
            Re-file {roster?.period ? periodName(roster.period) : "this month"} — replaces
            its commitments and marks every employee unpaid
          </label>
          <p className="note">
            Re-filing is for correcting a month. Any payment already made against the old
            commitments would no longer match.
          </p>
        </div>
      ) : null}
      {provingChoice}
      <button className="primary" onClick={() => void onSubmit()} disabled={!canSubmit}>
        {submitting
          ? "Submitting…"
          : alreadyFiled
            ? `Re-file ${roster?.period ? periodName(roster.period) : "this period"}`
            : `File ${roster?.period ? periodName(roster.period) : "this period"}`}
      </button>
      {step ? <p className="status">{step}</p> : null}
      {submitError ? <p className="status error">Could not submit: {submitError}</p> : null}
      {submitted ? (
        <p className="ok-line">
          ✓ Filed {periodName(submitted.period)} — {formatPeur(submitted.totalMinor)} pEUR
        </p>
      ) : null}
    </>
  );

  const payAction = (
    <>
      <button
        className="primary"
        onClick={() => void onFundAndPay()}
        disabled={
          !usable || roster?.period === null || !api || !passphraseReady || submitting || payStep !== null
        }
      >
        {payStep !== null ? "Funding and paying…" : "Fund and pay this period"}
      </button>
      <details className="why">
        <summary>What the circuit will and will not allow</summary>
        <p className="note">
          The circuit refuses any amount that does not open that employee's commitment,
          so nobody — including you — can pay a figure other than the one filed. Safe to
          re-run: funded and paid slots are skipped.
        </p>
        <p className="note">
          Unticking <strong>Let the wallet generate the proofs</strong> above hands the
          run to a local service instead, which signs with the platform wallet rather
          than yours. Your passphrase is <strong>not</strong> sent — only this month's
          derived material, which pays this month and nothing else.
        </p>
      </details>
      {payStep ? <p className="status">{payStep}</p> : null}
      {payError ? <p className="status error">Could not fund/pay: {payError}</p> : null}
      {payResult ? (
        <p className="ok-line">
          ✓ Funded {payResult.funded}, paid {payResult.paid} employee
          {payResult.paid === 1 ? "" : "s"}
          {payResult.seconds !== undefined ? ` — ${payResult.seconds}s` : ""}
        </p>
      ) : null}
    </>
  );

  const withholdAction = (
    <>
      {/* Its own passphrase entry when no workbook is open: the file step
          collapses once a month is filed, and it was the only place asking for
          one — leaving the live step with a button it could never enable. */}
      {ready ? null : passphraseBlock}
      <button
        className="primary"
        onClick={() => void onWithhold()}
        disabled={
          (roster?.period ?? openPeriod ?? null) === null ||
          !api ||
          !passphraseReady ||
          submitting ||
          payStep !== null
        }
      >
        {payStep !== null ? "Working…" : "Move withholding into the contract"}
      </button>
      <p className="note">
        Two coins carrying the published totals; the circuit refuses any other figure.
        Sending them onward to the treasuries runs from the CLI, which holds their
        encryption keys.
      </p>
      {withheld ? (
        <p className="ok-line">
          {withheld.alreadyDone
            ? "✓ Already moved for this period"
            : `✓ €${formatPeur(withheld.taxMinor)} tax and €${formatPeur(withheld.socialMinor)} contribution now held by the contract`}
        </p>
      ) : null}
    </>
  );

  return (
    <MonthSteps
      steps={[
        {
          title: "Load this month's figures",
          detail: "Same workbook as last month — change only what changed.",
          cost: "no transaction",
          // Filing proves a workbook was loaded, even if not in this session.
          // Leaving this open beside a ticked "File the period" said the month
          // was both done and not started, which is the one thing a stepper
          // exists to prevent.
          state: ready || filed ? "done" : "now",
          result: ready ? (
            <>
              {`${roster!.rows.length} employees · €${formatPeur(roster!.totalMinor)} gross${roster!.period ? ` · ${periodName(roster!.period)}` : ""}`}
              <PayeePreview rows={roster!.rows} />
            </>
          ) : filed ? (
            "Already filed from a workbook — load it again to fund, pay or correct"
          ) : null,
          action: chooseFile,
          // Named for what pressing it is FOR, not for the worst thing the step
          // could do. With a month filed and unpaid, this disclosure is the only
          // route to steps three through five — funding needs the salaries, and
          // they live in the workbook, never on chain. Calling that "Correct
          // this" read as an offer to amend a filing nobody wanted to amend, and
          // the note that says otherwise is hidden behind it.
          redoLabel: outstanding && !ready ? "Load this month's workbook" : undefined,
        },
        {
          title: "File the period",
          detail:
            "Publishes the totals and one sealed commitment per employee. Salaries stay on this machine.",
          cost: "1 transaction · about 30 seconds",
          state: filed ? "done" : ready ? "now" : "todo",
          action: ready ? fileAction : null,
        },
        {
          title: "Fund and pay everyone",
          detail: "Each employee receives their net as a shielded transfer.",
          cost: roster
            ? `${roster.rows.length + 1} transactions · one per employee to fund, then one to pay`
            : "one transaction per employee, then one to pay",
          state: paid ? "done" : filed && ready ? "now" : "todo",
          action: ready && filed ? payAction : null,
        },
        {
          title: "Move withholding into the contract",
          detail:
            "Tax and contributions leave your wallet for the contract's pools. Until this runs they are assessed, not collected.",
          cost: "1 transaction",
          state: withheldDone ? "done" : paid ? "now" : "todo",
          // `paid`, matching the state above, rather than `filed`. Gated on
          // filing, this step rendered a live-looking button while it was still
          // "todo" — the only step in the strip offering an action it was not
          // yet the turn of, which is exactly the ambiguity a stepper exists to
          // remove. `withheldDone` is kept in the condition so a finished step
          // still has something behind "Correct this".
          action: paid || withheldDone ? withholdAction : null,
        },
        {
          title: "Send payslips",
          detail: "One file per person. This is the only way they learn what they were paid.",
          cost: "no transaction",
          // Never "done": nothing records that a file reached a person.
          state: paid ? "now" : "todo",
          // Straight after filing they are already in hand; otherwise they are
          // rebuilt from the sealed openings. Showing them only when the filing
          // happened in this session left the step with no control at all after
          // a reload — for the one thing an employee cannot get any other way.
          action: submitted ? (
            <Payslips slips={submitted.payslips} />
          ) : filed && target ? (
            <PayslipRecovery
              contractAddress={target.contractAddress}
              networkId={networkId}
              periods={openPeriod ? [openPeriod] : []}
              names={roster?.rows.map((row) => row.fullName)}
              // Only once it is a passphrase and not a half-typed one, and only
              // while a workbook is open — the same condition step four uses to
              // drop its own passphrase block. Reload and this is empty, so the
              // field returns rather than the step becoming unusable.
              sessionPassphrase={ready && passphraseReady ? passphrase : undefined}
              bare
            />
          ) : null,
        },
      ]}
    />
  );
}

/**
 * Which wallet each row will actually be paid at.
 *
 * Step one collapses to a summary the moment a workbook loads, and until now
 * that summary was headcount, gross and period — everything except the one
 * thing a workbook can be wrong about in a way nothing downstream will catch.
 * A stale file names stale keys; the chain then funds and pays them exactly as
 * asked, the contract marks every slot settled, and the money is in wallets
 * nobody involved still holds. That is not recoverable: a shielded coin belongs
 * to whoever holds the secret key behind its coin public key, and re-filing the
 * period mints a second payment rather than retrieving the first.
 *
 * So the keys are shown BEFORE the button that commits them, at the only moment
 * where reading them costs nothing. Truncated because nobody verifies 64 hex
 * characters by eye — the ends are what differ between two wallets a person
 * actually has, and the full value is in the title for a copy-and-compare.
 */
function PayeePreview({ rows }: { rows: ParsedRoster["rows"] }) {
  return (
    <ul className="payee-preview">
      {rows.map((row) => (
        <li key={row.index}>
          <span className="payee-name">{row.fullName}</span>
          <span className="payee-gross">€{formatPeur(row.salaryMinor)}</span>
          <code className="payee-key" title={row.coinPublicKey}>
            {row.coinPublicKey.slice(0, 8)}…{row.coinPublicKey.slice(-8)}
          </code>
        </li>
      ))}
    </ul>
  );
}
