// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

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
  remitWithholding,
  periodStatus,
  type RunResult,
} from "../lib/payPayroll";
import { loadDeployments } from "../lib/deployments";
import { recordRoster } from "../lib/collected";
import { FilePicker } from "./FilePicker";
import { MonthSteps } from "./MonthSteps";
import { sealRoster, putSealedRoster } from "../lib/sealedRoster";
import { useElapsed, useUnloadGuard } from "../lib/useRunGuard";
import { explainError } from "../lib/explainError";
import {
  runMonth,
  MONTH_STAGES,
  type MonthProgress,
  type MonthStage,
} from "../lib/runMonth";
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
  /**
   * The whole month as one run, when the employer takes that route.
   *
   * Held separately from `step` and `payStep` so the individual controls keep
   * behaving exactly as they did: a failed run leaves the month in a real
   * intermediate state, and recovering means using the step that failed.
   */
  const [monthRun, setMonthRun] = useState<MonthProgress | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  /**
   * Whether the three chain steps show their own controls.
   *
   * Off by default, and that is the whole point of the orchestrated run: with
   * both routes rendered at once the page showed two passphrase fields and two
   * buttons for the same month, which is worse than the three-step flow it was
   * meant to simplify. The steps below stay as a RECORD — what has happened and
   * what has not — and become operable on request.
   *
   * Turned on automatically when a run fails, because that is exactly the
   * moment somebody needs to perform one stage by hand.
   */
  const [manual, setManual] = useState(false);

  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  /** Null until the chain has been asked whether this contract has been filed before. */
  /**
   * Whether anything has been filed against this contract yet.
   *
   * Three states, and keeping them apart is the point: `true` first filing,
   * `false` returning employer, `null` NOT KNOWN YET. It used to have two —
   * `needsConfirmation` was `firstFiling !== false`, so "still loading" and "a
   * failed read" both meant "first filing". A returning employer was then asked
   * to invent a passphrase for a contract that already had one, and every
   * button stayed disabled behind a confirmation field they had no reason to
   * fill. A slow indexer was indistinguishable from a new contract.
   */
  const [firstFiling, setFirstFiling] = useState<boolean | null>(null);
  /** Set when the read failed, so the card can say so rather than guess. */
  const [statusError, setStatusError] = useState<string | null>(null);
  /**
   * The period whose withholding is collected but not sent on, from chain.
   *
   * Held separately from the month being displayed because it is not the same
   * question. The stepper follows the calendar; this follows the money.
   */
  const [unremitted, setUnremitted] = useState<number | null>(null);
  const [payStep, setPayStep] = useState<string | null>(null);
  const [remitted, setRemitted] = useState<
    { taxMinor: bigint; socialMinor: bigint } | null
  >(null);
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
        setStatusError(null);
        setUnremitted(status.unremitted);
        setFirstFiling(!status.hasSealed);
        setOutstanding(status.unpaid === null ? null : periodName(status.unpaid));
        setFiledPeriods(status.filed);
      } catch (cause) {
        // A failed read must not make the card claim a period is settled — and
        // must not claim this is a first filing either. Both were once called
        // "the cautious answer"; the second is not cautious, it is a guess that
        // locks a returning employer out of their own contract. Unknown stays
        // unknown, and the card says why.
        if (cancelled) return;
        setFirstFiling(null);
        setUnremitted(null);
        setStatusError(cause instanceof Error ? cause.message : String(cause));
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
  const needsConfirmation = firstFiling === true;
  /** The contract has not answered yet, so nothing that needs the answer runs. */
  const statusUnknown = firstFiling === null;
  const passphraseReady =
    passphrase.length >= 8 &&
    !statusUnknown &&
    (!needsConfirmation || confirmation === passphrase);
  const submitting = step !== null;

  // The orchestrated run is three signatures and two chain waits, so the tab
  // has to survive all of it. Guarded for the individual steps too: each one
  // proves for minutes on its own.
  useUnloadGuard(monthRun !== null || step !== null || payStep !== null);
  const monthElapsed = useElapsed(monthRun !== null);
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
    // Same reporting as `onRemit` below, and for the same reason: this returned
    // silently on a reloaded page, which reads as a dead button.
    if (period === null) {
      setPayError(
        "No period to withhold for. Load this month's figures above first."
      );
      return;
    }
    if (!target) {
      setPayError("No payroll contract is selected for this wallet.");
      return;
    }
    if (!api) {
      setPayError("Connect a wallet first — this transaction is signed by the employer.");
      return;
    }

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

  /**
   * Sends this period's pools on to the two treasuries.
   *
   * Two transactions, because the money is owed to two destinations and each is
   * a separate coin encrypted to a separate key. Run in sequence rather than in
   * parallel: they spend different coins but share a wallet, and two proofs
   * balanced at once against one wallet is how `170 InvalidDustSpendProof`
   * arrives.
   *
   * Both destinations were frozen in the contract's constructor, so nothing
   * here chooses where anything goes.
   */
  async function onRemit() {
    // Logged on entry so a click proves it fired. A handler that returns early
    // and a handler that is never called look identical from the outside, and
    // telling them apart by inspection cost hours.
    console.log("[remit] clicked", {
      rosterPeriod: roster?.period ?? null,
      openPeriod: openPeriod ?? null,
      filedPeriods,
      hasTarget: Boolean(target),
      hasApi: Boolean(api),
      passphraseLength: passphrase.length,
      payStep,
    });

    // Falls back to the newest FILED period, because remitting needs a period
    // and a passphrase and nothing else — no workbook, no salaries. Requiring
    // one meant this returned silently on a page that had not loaded a roster
    // this session, which is every page after a reload: the button was enabled,
    // the click fired, and nothing happened or was said.
    // The unremitted period first: that is the one with money in the contract,
    // and it is usually NOT the month on screen.
    const period =
      unremitted ??
      roster?.period ??
      openPeriod ??
      (filedPeriods.length > 0 ? Math.max(...filedPeriods) : null);

    // Reported, never returned silently. A click that does nothing and explains
    // nothing is indistinguishable from a broken button, and cost an evening.
    if (period === null) {
      setPayError(
        "No filed period to remit. Load this month's figures above, or wait for " +
          "the contract to be read — nothing on chain says which month to send."
      );
      return;
    }
    if (!target) {
      setPayError("No payroll contract is selected for this wallet.");
      return;
    }
    if (!api) {
      setPayError("Connect a wallet first — this transaction is signed by the employer.");
      return;
    }

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

      const common = {
        api,
        networkId,
        contractAddress: target.contractAddress,
        passphrase,
        tokenId: peur.tokenId,
        period,
        provingMode: delegateProving ? ("wallet" as const) : ("local" as const),
        onProgress: setPayStep,
      };
      const tax = await remitWithholding({ ...common, what: "tax" });
      const social = await remitWithholding({ ...common, what: "social" });
      setRemitted({ taxMinor: tax.sentMinor, socialMinor: social.sentMinor });
      onSubmitted?.();
    } catch (cause) {
      setPayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPayStep(null);
    }
  }

  /**
   * File, pay and remit, in one act.
   *
   * The three stay separately callable below — see `runMonth`'s header for why
   * an orchestration that is the only route in strands anyone it fails. This
   * resumes from whatever the chain already shows, so pressing it again after a
   * failure repeats nothing that landed.
   */
  async function onRunMonth() {
    if (!roster || roster.period === null || !target || !api) return;

    setMonthError(null);
    setSubmitError(null);
    setPayError(null);
    // Where the chain says this month already is. Reading it here rather than
    // trusting page state: the month may have been advanced in another tab, or
    // by an earlier run whose failure was in reporting rather than in chain.
    const from: MonthStage = filed ? (paid && withheldDone ? "remit" : "pay") : "file";
    setMonthRun({ stage: from, index: MONTH_STAGES.indexOf(from) + 1, detail: "Starting…" });
    try {
      const result = await runMonth({
        api,
        networkId,
        contractAddress: target.contractAddress,
        passphrase,
        period: roster.period,
        salaries: roster.rows.map((row) => row.salaryMinor),
        weeks: roster.rows.map((row) => row.weeks),
        payees: roster.rows.map((row) => ({
          coinPublicKey: row.coinPublicKey,
          encryptionPublicKey: row.encryptionPublicKey,
        })),
        names: roster.rows.map((row) => row.fullName),
        provingMode: delegateProving ? "wallet" : "local",
        from,
        onProgress: setMonthRun,
      });
      if (result.filed) setSubmitted(result.filed);
      if (result.paid) setPayResult(result.paid);
      if (result.remitted) setRemitted(result.remitted);
      // Only once the whole month is through. Clearing it between stages would
      // strand the run — every stage derives the same key from it.
      setPassphrase("");
      setConfirmation("");
      onSubmitted?.();
    } catch (cause) {
      setMonthError(cause instanceof Error ? cause.message : String(cause));
      // A half-finished month is recovered one stage at a time, so open the
      // controls rather than making someone find the link that reveals them.
      setManual(true);
    } finally {
      setMonthRun(null);
    }
  }

  /**
   * Stores this workbook's people, sealed, so another browser can name them.
   *
   * Best effort on purpose: a service without a database is a normal
   * deployment, and the workbook remains the source of truth either way. A
   * failure here must not look like a failed filing, so it is logged and not
   * surfaced — the filing it follows has already succeeded.
   */
  async function sealAndStoreRoster() {
    if (!roster || !target || !passphrase) return;
    try {
      const sealed = await sealRoster(
        passphrase,
        target.contractAddress,
        roster.rows.map((row) => ({
          fullName: row.fullName,
          coinPublicKey: row.coinPublicKey,
          encryptionPublicKey: row.encryptionPublicKey,
        }))
      );
      const failure = await putSealedRoster(networkId, target.contractAddress, sealed);
      if (failure) console.warn(`[roster] not stored: ${failure}`);
    } catch (cause) {
      console.warn(`[roster] could not be sealed: ${String(cause)}`);
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
      // Seal the roster while the passphrase is still in hand. Names and public
      // keys only — never salaries — so this browser stops being the only place
      // that can turn a payee hash back into a person. The service holds
      // ciphertext it cannot read; see `sealedRoster.ts`.
      void sealAndStoreRoster();
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
          <Link to="/employer/employees">roster</Link>. Year and Month above the table,
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

  /**
   * Whether this month's pools have left the payroll contract.
   *
   * `remitted` alone only knows about THIS session, so a reload turned a
   * finished step back into an outstanding one — the step said "now" against a
   * period whose money left the contract days ago. `unremitted` is the chain's
   * answer and survives a reload: it names the earliest period still holding a
   * pool, so a contract with withholding on it and nothing unremitted has
   * remitted everything.
   *
   * Guarded on `statusUnknown` because `unremitted` is null before the read
   * lands and null again if it fails, and neither is "nothing outstanding". A
   * failed read leaves the step where it was rather than ticking it, which is
   * the direction that cannot mislead: it may ask for work already done, and
   * the circuit refuses a second remittance anyway.
   */
  const remitDone =
    remitted !== null || (!statusUnknown && unremitted === null && withheldDone);

  /**
   * The month on screen, which is what every step below is about.
   *
   * This used to be followed by a read of the benefit fund and the tax vault —
   * `contributedFor` and `receivedFor` for this period — feeding a sixth step
   * that showed whether the withholding had reached them. That step is gone:
   * the hop is the platform's, performed from the operator area, and a step in
   * the employer's month that the employer cannot perform reads as work they
   * are failing to do. The readout moved with the control, onto `FundDeposit`.
   */
  const shownPeriod = roster?.period ?? openPeriod ?? null;

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
      {statusUnknown ? (
        <p className="note">
          {statusError
            ? `This contract could not be read, so it is not known whether it has been filed against before — and a passphrase entered now might be the wrong question. Reload once the indexer answers. (${statusError})`
            : "Checking whether this contract has been filed against before…"}
        </p>
      ) : null}

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
      {/* Unconditional, and it has to be.

          Filing clears the passphrase the moment it succeeds, so this step
          always needs its own. The two conditions tried before both failed, in
          opposite directions:

            `ready ? null : ...`          — assumed an open workbook meant a
                                            known passphrase. Load the workbook
                                            against a filed month and the field
                                            vanished with nothing typed, leaving
                                            a button that could never enable.

            `passphraseReady ? null : ...` — worse, because it looked correct.
                                            `passphraseReady` is `length >= 8`,
                                            so the input UNMOUNTED ON THE EIGHTH
                                            KEYSTROKE and silently dropped the
                                            rest. "Kwekebos235!" was stored as
                                            "Kwekebos": long enough to enable
                                            the button, wrong enough to fail
                                            every commitment.

          A control whose visibility depends on its own contents will eat those
          contents. The field stays mounted for the whole step; `passphraseReady`
          gates the BUTTON, which is the thing that should react to it. */}
      {passphraseBlock}
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

  const remitAction = (
    <>
      {passphraseBlock}
      <button
        className="primary"
        onClick={() => void onRemit()}
        disabled={
          (roster?.period ?? openPeriod ?? null) === null ||
          !api ||
          !passphraseReady ||
          submitting ||
          payStep !== null
        }
      >
        {payStep !== null ? "Working…" : "Send withholding to the treasuries"}
      </button>
      <p className="note">
        Two transactions, one per treasury. Both destinations were frozen when
        this contract was deployed and cannot be redirected — this step performs
        the transfer or it does not happen, and nobody here chooses where.
      </p>
      {/* Rendered here, not only on the step above. `onRemit` sets `payError`
          and this control never showed it, so a failure inside the try looked
          exactly like a dead button: the handler ran, threw, reset itself, and
          said nothing. */}
      {payError ? <p className="status error">{payError}</p> : null}
      {payStep ? <p className="muted">{payStep}</p> : null}

      {remitted ? (
        <p className="ok-line">
          ✓ €{formatPeur(remitted.taxMinor)} tax and €{formatPeur(remitted.socialMinor)}{" "}
          contribution sent on
        </p>
      ) : null}
    </>
  );

  const withholdAction = (
    <>
      {/* Its own passphrase entry, always — same reasoning as step three above.
          Filing clears it, the file step collapses once a month is filed, and
          any condition written over the passphrase's own length unmounts the
          input while it is being typed. `passphraseReady` gates the button. */}
      {passphraseBlock}
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
        Two coins carrying the published totals; the circuit refuses any other
        figure. Sending them onward to the treasuries is the next step.
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
    <>
      {/* One operation, three ticks. Shown above the steps rather than inside
          one of them: while it runs it IS the page, and the step list below is
          the record of where it got to. */}
      {monthRun ? (
        <div className="month-run">
          <div className="month-run-head">
            Running payroll — {monthRun.index} of {MONTH_STAGES.length}
          </div>
          <ol className="month-run-steps">
            {MONTH_STAGES.map((stage, i) => (
              <li
                key={stage}
                className={
                  i < monthRun.index - 1 ? "done" : i === monthRun.index - 1 ? "now" : "todo"
                }
              >
                <span className="month-run-mark">
                  {i < monthRun.index - 1 ? "✓" : i === monthRun.index - 1 ? "●" : "○"}
                </span>
                {stage === "file"
                  ? "Payroll filed"
                  : stage === "pay"
                    ? "Employees paid"
                    : "Tax & contributions remitted"}
              </li>
            ))}
          </ol>
          {/* The inner step, verbatim. Proving takes minutes and a generic
              "working…" is what makes someone close the tab. */}
          <p className="month-run-detail">{monthRun.detail}</p>
          <p className="run-warning">
            <span className="run-dot" aria-hidden="true" />
            <span>
              <strong>Still working — do not close this tab.</strong> Each stage
              is signed separately and has to be visible on chain before the next
              can start; closing now abandons the month part way through.
              {monthElapsed ? (
                <span className="run-elapsed"> {monthElapsed}</span>
              ) : null}
            </span>
          </p>
        </div>
      ) : null}

      {monthError ? (
        <p className="status error" style={{ marginBottom: 12 }}>
          {explainError(monthError).text}
        </p>
      ) : null}

      {/* The whole month, offered as one action when one is possible: a
          workbook is open, a passphrase is entered, and the month is not
          already done. The steps below stay exactly as they were — this is a
          shortcut through them, not a replacement for them. */}
      {/* `withheldDone` is NOT the end of the month.
      
          It means the tax and contributions have been moved INTO the contract,
          which `fundPeriod` does in the same transaction that pays everyone —
          so it goes true at stage two and made this condition hide the offer
          exactly when stage three was the thing left to do. Remitting is what
          empties the pools onward, and `remitDone` is the flag for it. */}
      {!monthRun && ready && !(filed && paid && withheldDone && remitDone) ? (
        <div className="month-run-offer">
          {passphraseBlock}
          <button
            className="primary"
            disabled={!api || !passphraseReady || submitting || payStep !== null}
            onClick={() => void onRunMonth()}
          >
            {filed
              ? paid && withheldDone
                ? "Remit tax & contributions"
                : "Pay and remit " + (roster?.period ? periodName(roster.period) : "this month")
              : "Run payroll for " +
                (roster?.period ? periodName(roster.period) : "this month")}
          </button>
          <p className="note" style={{ margin: 0 }}>
            File, pay and remit in one go — {MONTH_STAGES.length} wallet
            signatures, a few minutes each. The steps below show where the month
            has got to.{" "}
            {manual ? (
              <button type="button" className="linklike" onClick={() => setManual(false)}>
                Hide the individual controls
              </button>
            ) : (
              <button type="button" className="linklike" onClick={() => setManual(true)}>
                Run them one at a time instead
              </button>
            )}
          </p>
        </div>
      ) : null}

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
          action: manual && ready ? fileAction : null,
        },
        {
          // One step where there were two, because the contract now does it in
          // one circuit. `fundPeriod` receives every employee's net AND the tax
          // and contributions together, so there is no longer a moment when the
          // employees are covered and the withholding is still in the employer's
          // wallet. Splitting it across two rows would describe a gap that can
          // no longer occur.
          title: "Fund and pay everyone",
          detail:
            "Each employee receives their net as a shielded transfer. The tax and " +
            "contributions leave your wallet in the same transaction — they cannot " +
            "be funded separately or skipped.",
          // Two transactions whatever the headcount: one to fund the whole
          // period, one to pay it out. Funding used to be one per employee.
          // Paying stays separate because spending a coin needs its position in
          // the ledger's tree, which does not exist until it has been committed.
          cost: "2 transactions · one to fund the period, then one to pay",
          state: paid && withheldDone ? "done" : filed && ready ? "now" : "todo",
          action: manual && ready && filed ? payAction : null,
        },
        // Only when the two came apart.
        //
        // Normally funding and withholding are one circuit and this never
        // appears. It appears when a period was funded the old way — an
        // interrupted run, or one that fell back to per-slot funding because
        // some slots were already covered — since the batched circuit refuses a
        // partly-funded period and `fundWithholding` is then the only way to
        // finish. Showing it unconditionally would advertise a gap that no
        // longer exists on a normal run.
        ...(paid && !withheldDone
          ? [
              {
                title: "Move withholding into the contract",
                detail:
                  "This period was funded without its withholding, so the tax and " +
                  "contributions still need to follow. Until this runs they are " +
                  "assessed, not collected.",
                cost: "1 transaction",
                state: "now" as const,
                action: manual ? withholdAction : null,
              },
            ]
          : []),
        {
          title: unremitted
            ? `Send ${periodName(unremitted)}'s withholding to the treasuries`
            : "Send withholding to the treasuries",
          detail: unremitted
            ? `${periodName(unremitted)} still has its tax and contribution sitting in the contract. Collected, but not moved on — and the benefit fund is fed from the contributions, so nothing can be claimed against it yet.`
            : "The pools leave the contract for the tax and social treasuries. Until this runs the money is collected but has not moved on — and the benefit fund is fed from the contributions, so nothing can be claimed against it yet.",
          cost: "2 transactions",
          // Driven by `unremitted` rather than by the month on screen. A pool
          // does not move on when the calendar does: September's withholding was
          // unreachable the moment October became the current month, because
          // this step only ever rendered for the month being worked on.
          state: unremitted ? "now" : remitDone ? "done" : withheldDone ? "now" : "todo",
          // Named as a HOP rather than as an ending. The pools are out of the
          // payroll contract at this point and in two keypairs, which is
          // finished as far as THIS employer is concerned and not finished as
          // far as the money is concerned: the platform still has to move it
          // into the benefit fund and the tax vault. That used to be the step
          // below and is now the operator's, so this is where the employer's
          // month ends — hence "are with the treasury wallets" rather than a
          // word that would claim more.
          result: remitted ? (
            <>
              €{formatPeur(remitted.taxMinor)} tax and €
              {formatPeur(remitted.socialMinor)} contribution are with the treasury
              wallets
            </>
          ) : remitDone ? (
            "Sent — the pools are with the treasury wallets"
          ) : null,
          action:
            manual && (unremitted || withheldDone || remitted) ? remitAction : null,
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
              // while a workbook is open. Safe to switch on `passphraseReady`
              // HERE, unlike in steps three and four: this hides an input whose
              // own state is separate, so typing into it can never unmount it.
              // Reload and this is empty, so the field returns rather than the
              // step becoming unusable.
              sessionPassphrase={ready && passphraseReady ? passphrase : undefined}
              bare
            />
          ) : null,
        },
      ]}
    />
    </>
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
