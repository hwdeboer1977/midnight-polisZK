import "dotenv/config";
import * as fs from "fs";
import * as readline from "readline/promises";
import chalk from "chalk";
import { connect, readLedger, type Connection } from "./utils/contract.js";
import { currentInstance } from "./utils/deployments.js";
import { EnvironmentManager } from "./utils/environment.js";
import { hex, toPublicKey } from "./utils/keys.js";
import {
  deriveEmployerKey,
  deriveNonce,
  isSealed,
  openSealed,
  sealOpening,
} from "./utils/payroll-openings.js";
import { FULL_MONTH_WEEKS, parseRosterWorkbook, ROSTER_SIZE } from "./utils/roster.js";
import { DUTCH_V1, computeLine } from "./utils/tax-params.js";
// The one formatter, rather than a local copy: this file had its own, and it
// kept dividing by 100 long after the unit became 1e-6, which is exactly the
// drift a second implementation is free to have.
import { formatPeur } from "./utils/constructor-args.js";

const CONTRACT_NAME = "payroll";
const ROSTER = ROSTER_SIZE;

/**
 * A local CACHE of what was paid — no longer the only copy.
 *
 * It used to be load-bearing: the chain held commitments, this file held the
 * only nonces that could open them, and deleting it destroyed the ability to
 * prove anyone's salary. Now nonces are derived from the wallet secret and the
 * openings are also sealed on chain, so this file is a convenience. Menu option
 * 6 rebuilds it from the chain alone.
 *
 * One file per instance, since each employer has their own roster.
 */
const SECRETS_FILE = currentInstance()
  ? `payroll-secrets.${currentInstance()}.json`
  : "payroll-secrets.json";

interface Opening {
  index: number;
  salary: string;
  nonce: string;
  /**
   * Weeks worked, when the record is new enough to have it.
   *
   * The commitment binds it, but it is not derivable from the gross — unlike
   * tax, contribution and net, which the published rule set fixes. A record
   * written before withholding existed has neither, so verification falls back
   * to deriving the three and assuming a full month, and says so rather than
   * reporting a mismatch it cannot explain.
   */
  weeks?: number;
}

interface SecretRecord {
  contractAddress: string;
  updatedAt: string;
  /** YYYYMM -> the openings for that period. */
  runs: Record<string, { updatedAt: string; employees: Opening[] }>;
  /** Pre-period file, kept so its openings are not silently dropped. */
  employees?: Opening[];
}

function readSecrets(): SecretRecord | null {
  if (!fs.existsSync(SECRETS_FILE)) return null;
  const parsed = JSON.parse(fs.readFileSync(SECRETS_FILE, "utf8")) as SecretRecord;
  return { ...parsed, runs: parsed.runs ?? {} };
}

/**
 * Merges one period's openings into the file, leaving every other period alone.
 *
 * The whole point of keying commitments by period on chain is that a past month
 * stays provable. That holds only if the nonces survive too — a commitment
 * nobody can open is indistinguishable from no commitment at all. So this
 * merges rather than replaces, which the previous version did not.
 */
function writeSecrets(
  contractAddress: string,
  period: number,
  employees: Opening[]
): void {
  const now = new Date().toISOString();
  const existing = readSecrets();
  const record: SecretRecord = {
    contractAddress,
    updatedAt: now,
    ...(existing?.employees ? { employees: existing.employees } : {}),
    runs: { ...(existing?.runs ?? {}), [String(period)]: { updatedAt: now, employees } },
  };
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(record, null, 2) + "\n", {
    mode: 0o600,
  });
}

/**
 * Reads a secret without echoing it.
 *
 * readline has no built-in masked input, so the output writer is swapped for
 * one that drops everything but newlines while the answer is being typed. A
 * passphrase scrolling up someone's terminal — and into their shell's
 * scrollback — would undo the point of having one.
 */
async function askSecret(rl: readline.Interface, prompt: string): Promise<string> {
  const iface = rl as unknown as {
    _writeToOutput?: (chunk: string) => void;
    output?: NodeJS.WritableStream;
  };
  const original = iface._writeToOutput;
  let muted = false;

  iface._writeToOutput = (chunk: string) => {
    if (!muted) original?.call(iface, chunk);
    else if (chunk.includes("\n")) original?.call(iface, "\n");
  };

  // The prompt is written synchronously inside question(), so muting straight
  // after the call hides the answer without hiding the question.
  const pending = rl.question(prompt);
  muted = true;
  try {
    return (await pending).trim();
  } finally {
    muted = false;
    iface._writeToOutput = original;
  }
}

/**
 * Asks for the passphrase that opens this instance's commitments.
 *
 * Confirmed by retyping when there is nothing on chain to check it against.
 * Once a period has been filed, the passphrase is verified by actually opening
 * one of its sealed openings, which is a far better test than retyping.
 */
async function askPassphrase(
  rl: readline.Interface,
  contractAddress: string,
  confirm: boolean
): Promise<Buffer> {
  // The distinction between choosing one and recalling one is the whole
  // question at this prompt, and getting it wrong here cannot be undone.
  if (confirm) {
    console.log(
      chalk.yellow(
        "\nYou are CREATING this passphrase now. Nothing has been filed against\n" +
          "this contract yet, so there is no existing one to look up."
      )
    );
    console.log(
      chalk.gray(
        "Save it where the company will still have it in a year — a password\n" +
          "manager, not this machine alone.\n"
      )
    );
  } else {
    console.log(
      chalk.gray("\nThe passphrase chosen when this contract was first filed.\n")
    );
  }

  console.log(
    chalk.gray(
      "It derives every nonce and unlocks every sealed opening for this\n" +
        "contract, and the browser asks for the same one. There is no reset:\n" +
        "lose it and no commitment here can ever be reopened.\n"
    )
  );

  const passphrase = await askSecret(
    rl,
    confirm ? "Choose a payroll passphrase: " : "Payroll passphrase: "
  );
  if (passphrase.length < 8) {
    throw new Error("Use at least 8 characters");
  }
  if (confirm) {
    const again = await askSecret(rl, "Confirm passphrase: ");
    if (again !== passphrase) throw new Error("The two entries did not match");
  }

  console.log(chalk.gray("Deriving key (PBKDF2, deliberately slow)..."));
  return deriveEmployerKey(passphrase, contractAddress);
}

/** 202603 -> "March 2026". */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function periodName(period: bigint | number): string {
  const n = Number(period);
  const month = MONTHS[(n % 100) - 1];
  return month ? `${month} ${Math.floor(n / 100)}` : String(period);
}

/** Rejects anything that is not a plausible YYYYMM, matching the circuit. */
function parsePeriod(raw: string): number {
  const value = raw.trim();
  if (!/^\d{6}$/.test(value)) {
    throw new Error(`"${raw}" is not a YYYYMM period, e.g. 202603`);
  }
  const period = Number(value);
  const month = period % 100;
  if (month < 1 || month > 12) throw new Error(`"${raw}" has no month ${month}`);
  if (period < 200001 || period > 299912) throw new Error(`"${raw}" is out of range`);
  return period;
}

/** The current month, as the default nobody should have to type. */
function thisPeriod(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + now.getUTCMonth() + 1;
}


/**
 * Rebuilds the local secrets file from the chain alone.
 *
 * This is the whole point of sealing the openings on chain: an employer who has
 * lost everything but their wallet recovery phrase can reconstruct every salary
 * and nonce they ever filed. Nothing here reads the existing file, and nothing
 * here needs the roster spreadsheet.
 *
 * Each recovered opening is checked against the commitment it claims to open,
 * so a blob that decrypts to the wrong thing is reported rather than written
 * into the file as though it were sound.
 */
async function recoverOpenings(
  conn: Connection,
  rl: readline.Interface
): Promise<void> {
  const ledger = await readLedger(conn);
  if (!ledger) {
    console.log(chalk.red("\n❌ No contract state on chain.\n"));
    return;
  }

  // Nothing to confirm against here: a wrong passphrase simply fails to open
  // the blobs, which the loop below reports per period.
  const employerKey = await askPassphrase(rl, conn.contractAddress, false);

  const periods = Array.from(ledger.periods as Iterable<bigint>).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );

  if (periods.length === 0) {
    console.log(chalk.gray("\nNothing on chain to recover.\n"));
    return;
  }

  console.log(chalk.gray(`\nRecovering from ${conn.contractAddress}\n`));

  let recovered = 0;
  let failed = 0;

  for (const periodBig of periods) {
    const period = Number(periodBig);
    if (!ledger.sealedFor.member(periodBig)) {
      console.log(
        chalk.yellow(`⚠️  ${periodName(period)} has no sealed openings — filed before sealing.`)
      );
      failed += 1;
      continue;
    }

    const sealedByIndex = ledger.sealedFor.lookup(periodBig);
    const commitments = ledger.commitmentsFor.member(periodBig)
      ? ledger.commitmentsFor.lookup(periodBig)
      : null;

    const employees: Opening[] = [];
    let periodFailed = false;

    for (const [indexBig, blob] of sealedByIndex as Iterable<[bigint, Uint8Array]>) {
      const index = Number(indexBig);
      if (!isSealed(blob)) {
        console.log(chalk.yellow(`⚠️  ${periodName(period)} [${index}] is empty.`));
        periodFailed = true;
        continue;
      }
      try {
        const opened = openSealed(employerKey, blob);
        const { grossMinor, taxMinor, socialMinor, netMinor, weeks, nonce } = opened;

        // The commitment is the authority. A blob that decrypts cleanly but
        // does not reproduce the on-chain commitment is worse than one that
        // fails outright, because it would look like a valid opening.
        if (commitments?.member(indexBig)) {
          const expected = hex(commitments.lookup(indexBig));
          // Recomputed with the contract's own pure circuit, so this is the
          // identical hash the proof committed to — not a re-implementation.
          const actual = hex(
            conn.contractModule.pureCircuits.commitmentFor(
              grossMinor,
              taxMinor,
              socialMinor,
              netMinor,
              BigInt(weeks),
              BigInt(period),
              ledger.employer,
              ledger.paramsHashFor.lookup(BigInt(period)),
              nonce
            )
          );
          if (actual !== expected) {
            console.log(
              chalk.red(`❌ ${periodName(period)} [${index}] does not match its commitment.`)
            );
            periodFailed = true;
            continue;
          }
        }

        employees.push({
          index,
          salary: grossMinor.toString(),
          nonce: hex(nonce),
        });
      } catch {
        console.log(
          chalk.red(
            `❌ ${periodName(period)} [${index}] would not decrypt — ` +
              "wrong wallet for this contract?"
          )
        );
        periodFailed = true;
      }
    }

    if (employees.length > 0) {
      employees.sort((a, b) => a.index - b.index);
      writeSecrets(conn.contractAddress, period, employees);
      console.log(
        chalk.green(`✅ ${periodName(period)}: recovered ${employees.length} openings`) +
          chalk.gray(
            `  total ${formatPeur(
              employees.reduce((sum, e) => sum + BigInt(e.salary), 0n)
            )}`
          )
      );
      recovered += 1;
    }
    if (periodFailed) failed += 1;
  }

  console.log();
  console.log(
    chalk.cyan(`Recovered ${recovered} period(s) into ${SECRETS_FILE}.`) +
      (failed > 0 ? chalk.yellow(`  ${failed} period(s) had problems.`) : "")
  );
  console.log(
    chalk.gray(
      "Nothing local was needed: the openings came from chain and the key from\n" +
        "the wallet recovery phrase.\n"
    )
  );
}

type Role = "employer" | "platform-unassigned" | "platform-spent" | "outsider";

function roleOf(ledger: any, myPublicKey: string): Role {
  if (ledger.employerAssigned && hex(ledger.employer.bytes) === myPublicKey) {
    return "employer";
  }
  if (hex(ledger.platform.bytes) === myPublicKey) {
    return ledger.employerAssigned ? "platform-spent" : "platform-unassigned";
  }
  return "outsider";
}

function describeRole(role: Role): string {
  switch (role) {
    case "employer":
      return chalk.green("you are the employer of this instance");
    case "platform-unassigned":
      return chalk.yellow("you deployed this instance and can assign its employer (once)");
    case "platform-spent":
      return chalk.gray("you deployed this instance; its employer is already assigned");
    case "outsider":
      return chalk.gray("you have no rights on this instance");
  }
}

async function showStatus(conn: Connection): Promise<void> {
  const ledger = await readLedger(conn);
  if (!ledger) {
    console.log("📋 No state found\n");
    return;
  }

  console.log();
  console.log(chalk.cyan("Your key:       ") + conn.myPublicKey);
  console.log(chalk.cyan("Platform:       ") + hex(ledger.platform.bytes));
  console.log(
    chalk.cyan("Employer:       ") +
      (ledger.employerAssigned
        ? hex(ledger.employer.bytes)
        : chalk.yellow("not assigned yet"))
  );
  console.log(chalk.gray(`   → ${describeRole(roleOf(ledger, conn.myPublicKey))}`));
  console.log();
  const periods = Array.from(ledger.periods as Iterable<bigint>).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

  if (periods.length === 0) {
    console.log(chalk.gray("No payroll filed yet.\n"));
    return;
  }

  console.log(chalk.cyan("Periods filed:  ") + `${periods.length}`);
  console.log();

  // Newest first: the month being asked about is nearly always the last filed.
  for (const period of periods) {
    const total = ledger.totalPayrollFor.member(period)
      ? formatPeur(ledger.totalPayrollFor.lookup(period))
      : "—";
    const count = ledger.employeeCountFor.member(period)
      ? ledger.employeeCountFor.lookup(period)
      : 0n;
    console.log(
      chalk.white.bold(periodName(period)) +
        chalk.gray(`  (${period})`) +
        chalk.cyan("  total ") +
        total +
        chalk.gray(`  ·  ${count} employees`) +
        (period === ledger.latestPeriod ? chalk.green("  ← latest") : "")
    );
    if (ledger.commitmentsFor.member(period)) {
      for (const [index, commitment] of ledger.commitmentsFor.lookup(period)) {
        console.log(chalk.gray(`   [${index}] ${hex(commitment)}`));
      }
    }
    console.log();
  }

  console.log(
    chalk.gray(
      "No individual salary appears above — only a per-period aggregate and one\n" +
        "opaque commitment per employee. Past periods stay on chain, so a month\n" +
        "remains provable after later ones are filed.\n"
    )
  );
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(
    chalk.blue.bold(
      `🌙  midnight-polisZK CLI — ${CONTRACT_NAME}${currentInstance() ? `:${currentInstance()}` : ""}`
    )
  );
  console.log();

  const conn = await connect(CONTRACT_NAME);
  console.log(chalk.green("✅ Connected to contract"));
  console.log(chalk.gray(`   ${conn.contractAddress}`));
  console.log(chalk.gray(`   your key: ${conn.myPublicKey}`));
  console.log();

  try {
    let running = true;
    while (running) {
      console.log(chalk.cyan("--- Menu ---"));
      console.log("1. Show status");
      console.log("2. Assign employer            (platform)");
      console.log("3. Set payroll from roster.xlsx (employer)");
      console.log("4. Verify a commitment        (employer)");
      console.log("5. Transfer employer rights   (employer)");
      console.log("6. Recover openings from chain (employer)");
      console.log("7. Revoke employer            (platform)");
      console.log("8. Exit");

      const choice = await rl.question("\nYour choice: ");

      switch (choice.trim()) {
        case "1": {
          try {
            await showStatus(conn);
          } catch (error) {
            console.error(chalk.red("❌ Failed to read state:"), error);
          }
          break;
        }

        case "2": {
          console.log(
            chalk.gray(
              "\nThe employer runs this CLI and reads their key off the header,\n" +
                "then sends it here. The platform still cannot set payroll — but it\n" +
                "can take the seat back with option 7 and assign it again.\n"
            )
          );
          const answer = await rl.question("Employer coin public key (hex): ");
          let newEmployer;
          try {
            newEmployer = toPublicKey(answer);
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          try {
            console.log(chalk.gray("\nProving and submitting..."));
            const tx = await conn.deployed.callTx.assignEmployer(newEmployer);
            console.log(chalk.green("✅ Employer assigned!"));
            console.log(`Employer: ${hex(newEmployer.bytes)}`);
            console.log(`Tx hash: ${tx.public.txHash}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Failed to assign employer:"), error);
          }
          break;
        }

        case "3": {
          console.log(
            chalk.gray(
              "\nA roster spreadsheet with columns: Full name | Address | Monthly gross " +
                "salary | Coin public key | Encryption public key.\n" +
                "Generate a starting point with `npm run roster:template`.\n"
            )
          );
          const answer = await rl.question("Path to .xlsx [roster-template.xlsx]: ");
          const file = answer.trim() || "roster-template.xlsx";

          let salaries: bigint[];
          let payeeKeys: string[];
          let period: number;
          try {
            const roster = await parseRosterWorkbook(file);
            if (roster.problems.length > 0) {
              console.error(chalk.red(`\n❌ ${file} is not usable:`));
              for (const problem of roster.problems) {
                console.error(
                  chalk.red(
                    problem.row === 0
                      ? `   ${problem.message}`
                      : `   row ${problem.row}: ${problem.message}`
                  )
                );
              }
              console.log();
              break;
            }

            salaries = roster.rows.map((row) => row.salaryMinor);
            // Real employees' keys, from the roster. Derived ones would make
            // the employer the owner of every salary they just paid out.
            payeeKeys = roster.rows.map((row) => row.coinPublicKey);

            // The workbook carries the period, so the month filed is the month
            // the file was prepared for. The prompt confirms rather than asks:
            // silently trusting a spreadsheet cell to pick which month gets
            // overwritten is worth one keypress.
            try {
              const suggested = roster.period ?? thisPeriod();
              const source = roster.period ? file : "today";
              const typed = await rl.question(
                `Period [${suggested} — ${periodName(suggested)}, from ${source}]: `
              );
              period = typed.trim() ? parsePeriod(typed) : suggested;
            } catch (error) {
              console.error(
                chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
              );
              break;
            }

            // Names and addresses are printed for confirmation and then dropped:
            // they never enter a circuit, let alone the chain.
            console.log();
            console.log(chalk.cyan(`Read ${roster.rows.length} employees from ${file}:`));
            for (const row of roster.rows) {
              console.log(
                chalk.gray(
                  `   [${row.index}] ${row.fullName.padEnd(18)} ${formatPeur(row.salaryMinor).padStart(12)}`
                )
              );
            }
            console.log(
              chalk.yellow.bold(`   total: ${formatPeur(roster.totalMinor)}`) +
                chalk.gray("  ← the only figure that becomes public")
            );
            console.log();

            const already = readSecrets()?.runs?.[String(period)];
            if (already) {
              console.log(
                chalk.yellow(
                  `⚠️  ${periodName(period)} is already filed. Submitting replaces it\n` +
                    `   on chain and in ${SECRETS_FILE}; other periods are untouched.\n`
                )
              );
            }

            const confirm = await rl.question(
              `Submit this payroll for ${periodName(period)}? [y/N]: `
            );
            if (confirm.trim().toLowerCase() !== "y") {
              console.log(chalk.gray("Cancelled.\n"));
              break;
            }
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          // Derived, not random. One nonce per employee per period, so two
          // people on the same salary do not produce the same commitment — and
          // every one of them is recomputable from the wallet secret alone, so
          // there is no longer a file whose loss is unrecoverable.
          // Confirmed by retyping only when the contract holds nothing to check
          // against; after that a wrong passphrase is caught below by failing to
          // reproduce an existing commitment.
          let employerKey: Buffer;
          try {
            const ledger = await readLedger(conn);
            const filed =
              ledger && Array.from(ledger.periods as Iterable<bigint>).length > 0;
            employerKey = await askPassphrase(rl, conn.contractAddress, !filed);
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }
          const nonces = salaries.map((_, index) =>
            deriveNonce(employerKey, period, index)
          );
          const lines = salaries.map((grossMinor) => {
            const c = computeLine(grossMinor, DUTCH_V1);
            return {
              grossMinor,
              taxMinor: c.taxMinor,
              socialMinor: c.contribMinor,
              netMinor: c.netMinor,
              weeks: FULL_MONTH_WEEKS,
            };
          });
          const sealedOpenings = lines.map((line, index) =>
            sealOpening(employerKey, line, nonces[index]!)
          );

          try {
            console.log(
              chalk.gray("\nProving and submitting (this takes a few minutes)...")
            );
            // BigInt, not the plain number: `period` is a Uint<32> in the
            // circuit and the generated binding types it as bigint. A JS number
            // is rejected at the runtime type check rather than coerced.
            // Who each slot is payable to, hashed with the contract's own pure
            // circuit so it matches what `payEmployee` will check.
            const instanceBytes = Uint8Array.from(
              Buffer.from(conn.contractAddress.replace(/^0x/, ""), "hex")
            );
            const payees = payeeKeys.map((key) =>
              conn.contractModule.pureCircuits.payeeHash(
                { bytes: Uint8Array.from(Buffer.from(key, "hex")) },
                BigInt(period),
                instanceBytes
              )
            );

            const tx = await conn.deployed.callTx.setPayroll(
              BigInt(period),
              salaries,
              lines.map((l) => BigInt(l.weeks)),
              lines.map((l) => l.taxMinor),
              lines.map((l) => l.socialMinor),
              nonces,
              sealedOpenings,
              payees,
              toCircuitParams(DUTCH_V1)
            );

            writeSecrets(
              conn.contractAddress,
              period,
              salaries.map((salary, index) => ({
                index,
                salary: salary.toString(),
                nonce: hex(nonces[index]!),
                weeks: lines[index]?.weeks ?? 4,
              }))
            );

            const total = salaries.reduce((a, b) => a + b, 0n);
            console.log(chalk.green("✅ Payroll set!"));
            console.log(`Employees: ${salaries.length}`);
            console.log(`Total (now public): ${total}`);
            console.log(
              chalk.gray("Individual salaries stayed off chain; saved locally to ") +
                chalk.gray.bold(SECRETS_FILE)
            );
            console.log(`Tx hash: ${tx.public.txHash}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Failed to set payroll:"), error);
          }
          break;
        }

        case "4": {
          const secrets = readSecrets();
          if (!secrets) {
            console.log(chalk.red(`❌ No ${SECRETS_FILE} — set the payroll first.\n`));
            break;
          }

          const filed = Object.keys(secrets.runs ?? {}).sort().reverse();
          if (filed.length === 0) {
            console.log(
              chalk.red(`❌ ${SECRETS_FILE} holds no period runs — nothing to open.\n`)
            );
            break;
          }
          console.log(
            chalk.gray(
              `\nPeriods on file: ${filed.map((f) => `${f} (${periodName(Number(f))})`).join(", ")}\n`
            )
          );

          let period: number;
          try {
            const typed = await rl.question(`Period as YYYYMM [${filed[0]}]: `);
            period = typed.trim() ? parsePeriod(typed) : Number(filed[0]);
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          const run = secrets.runs?.[String(period)];
          if (!run) {
            console.log(chalk.red(`❌ No local record for ${periodName(period)}\n`));
            break;
          }

          const raw = await rl.question(`Employee index (0-${ROSTER - 1}): `);
          const index = Number(raw.trim());
          const record = run.employees.find((e) => e.index === index);
          if (!record) {
            console.log(chalk.red(`❌ No local record for index ${raw.trim()}\n`));
            break;
          }

          try {
            const ledger = await readLedger(conn);
            const forPeriod =
              ledger && ledger.commitmentsFor.member(BigInt(period))
                ? ledger.commitmentsFor.lookup(BigInt(period))
                : null;
            if (!forPeriod || !forPeriod.member(BigInt(index))) {
              console.log(
                chalk.red(
                  `❌ No on-chain commitment at index ${index} for ${periodName(period)}\n`
                )
              );
              break;
            }

            // The commitment binds the whole line, so opening it needs more
            // than the gross the record stores. Tax, contribution and net are
            // recomputed from the published rule set — the same arithmetic the
            // circuit pins — and weeks comes from the record when it has one.
            const grossMinor = BigInt(record.salary);
            const line = computeLine(grossMinor, DUTCH_V1);
            const assumedWeeks = record.weeks === undefined;
            const weeksUsed = record.weeks ?? 4;

            // Recomputed with the contract's own pure circuit, so this is the
            // identical hash the proof committed to — not a re-implementation.
            const expected = conn.contractModule.pureCircuits.commitmentFor(
              grossMinor,
              line.taxMinor,
              line.contribMinor,
              line.netMinor,
              BigInt(weeksUsed),
              BigInt(period),
              ledger.employer,
              ledger.paramsHashFor.lookup(BigInt(period)),
              Uint8Array.from(Buffer.from(record.nonce, "hex"))
            );
            const onChain = forPeriod.lookup(BigInt(index));
            const matches = hex(expected) === hex(onChain);

            console.log();
            console.log(`Period:          ${periodName(period)}`);
            console.log(`Salary (local):  ${formatPeur(grossMinor)} pEUR`);
            console.log(
              chalk.gray(
                `Weeks:           ${weeksUsed}` +
                  (assumedWeeks ? " (assumed — this record predates the field)" : "")
              )
            );
            console.log(chalk.gray(`On chain:        ${hex(onChain)}`));
            console.log(chalk.gray(`Recomputed:      ${hex(expected)}`));
            console.log(
              matches
                ? chalk.green.bold("✅ Commitment matches — this salary is what was committed.\n")
                : chalk.red.bold(
                    "❌ Mismatch — the local record does not open this commitment.\n" +
                      (assumedWeeks
                        ? "   The weeks worked were assumed. If this period was filed with\n" +
                          "   anything other than a full month, that alone explains it.\n"
                        : "")
                  )
            );
          } catch (error) {
            console.error(chalk.red("❌ Verification failed:"), error);
          }
          break;
        }

        case "5": {
          console.log(
            chalk.gray(
              "\nHands this instance to another key. Only the current employer\n" +
                "can do this — the platform cannot take ownership back.\n"
            )
          );
          const answer = await rl.question("New employer coin public key (hex): ");
          let newEmployer;
          try {
            newEmployer = toPublicKey(answer);
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          try {
            console.log(chalk.gray("\nProving and submitting..."));
            const tx = await conn.deployed.callTx.transferEmployer(newEmployer);
            console.log(chalk.green("✅ Employer rights transferred!"));
            console.log(`New employer: ${hex(newEmployer.bytes)}`);
            console.log(`Tx hash: ${tx.public.txHash}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Failed to transfer:"), error);
          }
          break;
        }

        case "6": {
          try {
            await recoverOpenings(conn, rl);
          } catch (error) {
            console.error(chalk.red("❌ Recovery failed:"), error);
          }
          break;
        }

        case "7": {
          console.log(
            chalk.yellow(
              "\nThis vacates the employer seat. Payroll history, the pools and\n" +
                "every past commitment stay exactly as they are — what stops is\n" +
                "the employer's ability to write anything new. Assign again with\n" +
                "option 2 to restore them, or to hand the instance to someone else.\n"
            )
          );
          // The base contract has no INSTANCE, and an empty expected string
          // would make a bare Enter the confirmation. A word to type keeps the
          // gesture deliberate in both cases.
          const expected = currentInstance() ?? "revoke";
          const confirm = await rl.question(`Type "${expected}" to confirm: `);
          if (confirm.trim() !== expected) {
            // Matched against the instance rather than a plain y/n because this
            // is the one platform action that takes something away from a
            // customer, and the operator running it against the wrong INSTANCE
            // is the realistic way it goes wrong.
            console.error(
              chalk.red(
                `❌ Expected "${expected}" — nothing was revoked.\n`
              )
            );
            break;
          }

          try {
            console.log(chalk.gray("\nProving and submitting..."));
            const tx = await conn.deployed.callTx.revokeEmployer();
            console.log(chalk.green("✅ Employer revoked."));
            console.log(`Tx hash: ${tx.public.txHash}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Failed to revoke employer:"), error);
          }
          break;
        }

        case "8":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log(chalk.red("❌ Invalid choice. Please enter 1-8.\n"));
      }
    }
  } finally {
    await conn.wallet.facade.stop();
    rl.close();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error);
  process.exit(1);
});

/** The shared rule set in the shape the generated binding expects. */
function toCircuitParams(p: typeof DUTCH_V1) {
  return {
    version: BigInt(p.version),
    validFrom: BigInt(p.validFrom),
    threshold1: p.threshold1,
    threshold2: p.threshold2,
    rate1: BigInt(p.rate1),
    rate2: BigInt(p.rate2),
    rate3: BigInt(p.rate3),
    maxContribBase: p.maxContribBase,
    contribRate: BigInt(p.contribRate),
  };
}
