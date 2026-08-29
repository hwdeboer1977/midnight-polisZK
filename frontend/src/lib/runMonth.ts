import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract, type PayrollLedger } from "./contracts";
import { loadDeployments } from "./deployments";
import { fundAndPayPeriod, remitWithholding, type RunResult } from "./payPayroll";
import { submitPayroll, type ProvingMode, type SubmitResult } from "./submitPayroll";

/**
 * A month's payroll as one act: file, pay, remit.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * These are three business processes to the system and one job to the person
 * doing it. An employer running payroll does not decide, between steps, whether
 * to also pay the people or also remit the withholding — those were never
 * choices, and presenting them as three buttons made an employer learn the
 * contract's internal seams to complete a task they think of as "run payroll".
 * The seams are real; making somebody navigate them is not.
 *
 * ── Why the waits are mandatory, not cosmetic ──────────────────────────────
 *
 * Each hop needs the previous one VISIBLE ON CHAIN, not merely submitted. This
 * is a property of the contract and the ledger, so no amount of UI work removes
 * it:
 *
 *   · **File → Pay.** `fundAndPayPeriod` reads `commitmentsFor` for the period
 *     and checks each opening against it. A filing that has been submitted but
 *     not indexed reads as a period that was never filed, and the run aborts.
 *
 *   · **Fund → Pay.** Already handled inside `fundAndPayPeriod`, and named
 *     there: paying spends the coins funding just created, and a coin cannot be
 *     spent until its commitment has a position in the Zswap tree. That
 *     position does not exist until the funding transaction is indexed.
 *
 *   · **Pay → Remit.** `remitWithholding` spends the contract's tax and social
 *     POOLS, which `fundPeriod` fills in the same transaction that funds the
 *     employees. Remitting against an unindexed pool finds no coin to spend.
 *
 * So the sequence is forced by the ledger. What this changes is who has to know
 * that: the employer sees one operation with three ticks, and the waiting is
 * reported rather than delegated to them.
 *
 * ── What it deliberately does not do ───────────────────────────────────────
 *
 * It does not swallow the individual steps. Every one of the three remains
 * callable on its own, because a run that fails halfway leaves a month in a
 * real intermediate state — filed and unpaid, or paid and unremitted — and
 * recovering from that means performing exactly the step that failed. An
 * orchestration that is the only route in is an orchestration that strands
 * anyone it fails.
 *
 * `from` exists for that: a month already filed resumes at `pay`, and one
 * already paid resumes at `remit`, so re-running after a failure repeats
 * nothing that has already landed.
 */
export type MonthStage = "file" | "pay" | "remit";

export const MONTH_STAGES: MonthStage[] = ["file", "pay", "remit"];

export interface MonthProgress {
  /** Which of the three is running. */
  stage: MonthStage;
  /** 1-based, for "2 of 3". */
  index: number;
  /**
   * What that stage is doing right now — the inner `onProgress` text.
   *
   * Passed through rather than replaced with a generic label: proving takes
   * minutes and "Deriving your key (PBKDF2, deliberately slow)…" is the
   * difference between a wait somebody understands and one they interrupt.
   */
  detail: string;
}

export interface MonthResult {
  filed?: SubmitResult;
  paid?: RunResult;
  remitted?: { taxMinor: bigint; socialMinor: bigint };
}

/** How long to wait for a transaction to become visible before giving up. */
const INDEX_TIMEOUT_MS = 180_000;
const POLL_MS = 3_000;

async function readLedger(
  networkId: string,
  contractAddress: string
): Promise<PayrollLedger | null> {
  const contract = await loadContract("payroll");
  const state = await fetchContractState(networkId, contractAddress);
  if (!state) return null;
  return decodePayrollLedger(contract, state.data);
}

/**
 * Polls the contract until `done` holds.
 *
 * Reads the chain rather than trusting the transaction receipt. A submitted
 * transaction is a promise about the future; what the next step needs is a
 * ledger that already contains the result, and only the ledger can say so.
 *
 * Times out rather than spinning forever — an indexer that has stopped is a
 * different problem from a slow block, and a progress line that never changes
 * teaches an employer to reload the page mid-run.
 */
async function waitForChain(
  networkId: string,
  contractAddress: string,
  done: (ledger: PayrollLedger) => boolean,
  report: (detail: string) => void,
  what: string
): Promise<void> {
  const deadline = Date.now() + INDEX_TIMEOUT_MS;
  for (;;) {
    const ledger = await readLedger(networkId, contractAddress);
    if (ledger && done(ledger)) return;
    if (Date.now() > deadline) {
      throw new Error(
        `${what} did not appear on chain within ${Math.round(INDEX_TIMEOUT_MS / 1000)}s. ` +
          "The transaction may still land — check the step's own control before running it again, " +
          "because repeating a step that succeeded is not always harmless."
      );
    }
    report(`Waiting for ${what} to be visible on chain…`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/** Every slot in the period marked paid, and the withholding funded. */
function periodSettled(ledger: PayrollLedger, period: number): boolean {
  const key = BigInt(period);
  const count = ledger.employeeCountFor.member(key)
    ? Number(ledger.employeeCountFor.lookup(key))
    : 0;
  if (count === 0 || !ledger.paidFor.member(key)) return false;
  const flags = ledger.paidFor.lookup(key);
  for (let i = 0; i < count; i += 1) {
    if (!flags.member(BigInt(i)) || !flags.lookup(BigInt(i))) return false;
  }
  return ledger.withheldFor.member(key) && ledger.withheldFor.lookup(key);
}

export async function runMonth(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  passphrase: string;
  period: number;
  salaries: bigint[];
  weeks: number[];
  payees: { coinPublicKey: string; encryptionPublicKey: string }[];
  names: string[];
  provingMode?: ProvingMode;
  /** Where to start. Skipping what has already landed is what makes a retry safe. */
  from?: MonthStage;
  onProgress: (progress: MonthProgress) => void;
}): Promise<MonthResult> {
  const {
    api,
    networkId,
    contractAddress,
    passphrase,
    period,
    salaries,
    weeks,
    payees,
    names,
    provingMode = "local",
    from = "file",
    onProgress,
  } = options;

  const startAt = MONTH_STAGES.indexOf(from);
  const result: MonthResult = {};
  const report = (stage: MonthStage) => (detail: string) =>
    onProgress({ stage, index: MONTH_STAGES.indexOf(stage) + 1, detail });

  // The token id is needed by two of the three stages, and a missing one should
  // stop the run before the first signature rather than between the second and
  // the third.
  const deployments = await loadDeployments();
  const peur = Object.values(deployments).find(
    (d) => d.contractName === "peur" && d.networkId === networkId
  );
  if (!peur?.tokenId) {
    throw new Error(`No pEUR token id for ${networkId} — run \`npm run frontend:config\`.`);
  }

  if (startAt <= 0) {
    const say = report("file");
    say("Starting…");
    result.filed = await submitPayroll({
      api,
      networkId,
      contractAddress,
      provingMode,
      passphrase,
      period,
      salaries,
      weeks,
      payees: payees.map((p) => p.coinPublicKey),
      names,
      onProgress: say,
    });
    await waitForChain(
      networkId,
      contractAddress,
      (ledger) => ledger.commitmentsFor.member(BigInt(period)),
      say,
      "the filing"
    );
  }

  if (startAt <= 1) {
    const say = report("pay");
    say("Starting…");
    result.paid = await fundAndPayPeriod({
      api,
      networkId,
      contractAddress,
      passphrase,
      tokenId: peur.tokenId,
      period,
      salaries,
      weeks,
      payees,
      provingMode,
      onProgress: say,
    });
    await waitForChain(
      networkId,
      contractAddress,
      (ledger) => periodSettled(ledger, period),
      say,
      "the payments"
    );
  }

  if (startAt <= 2) {
    const say = report("remit");
    say("Starting…");
    const common = {
      api,
      networkId,
      contractAddress,
      passphrase,
      tokenId: peur.tokenId,
      period,
      provingMode,
      onProgress: say,
    };
    // Two transactions, one per treasury, and sequential for the same reason
    // the stages are: both spend from the contract, and the second has to see
    // what the first left behind.
    const tax = await remitWithholding({ ...common, what: "tax" });
    const social = await remitWithholding({ ...common, what: "social" });
    result.remitted = { taxMinor: tax.sentMinor, socialMinor: social.sentMinor };
  }

  return result;
}
