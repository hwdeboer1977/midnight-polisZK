import "dotenv/config";
import * as fs from "fs";
import { randomBytes } from "crypto";
import * as readline from "readline/promises";
import chalk from "chalk";
import { connect, readLedger, type Connection } from "./utils/contract.js";
import { currentInstance } from "./utils/deployments.js";
import { hex, toPublicKey } from "./utils/keys.js";
import { parseRosterWorkbook, ROSTER_SIZE } from "./utils/roster.js";

const CONTRACT_NAME = "payroll";
const ROSTER = ROSTER_SIZE;

/**
 * The employer's copy of what was paid. The chain only stores commitments, so
 * without the salaries and their nonces a commitment can never be reopened —
 * losing this file means losing the ability to prove anyone's salary. One file
 * per instance, since each employer has their own roster.
 */
/** 420000n -> "4,200.00". Minor units are cents, as the contract counts them. */
function formatMinor(value: bigint): string {
  const whole = (value / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${whole}.${(value % 100n).toString().padStart(2, "0")}`;
}

const SECRETS_FILE = currentInstance()
  ? `payroll-secrets.${currentInstance()}.json`
  : "payroll-secrets.json";

interface SecretRecord {
  contractAddress: string;
  updatedAt: string;
  employees: { index: number; salary: string; nonce: string }[];
}

function readSecrets(): SecretRecord | null {
  if (!fs.existsSync(SECRETS_FILE)) return null;
  return JSON.parse(fs.readFileSync(SECRETS_FILE, "utf8")) as SecretRecord;
}

function writeSecrets(record: SecretRecord): void {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(record, null, 2) + "\n", {
    mode: 0o600,
  });
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
  console.log(chalk.cyan("Employee count: ") + `${ledger.employeeCount}`);
  console.log(chalk.cyan("Total payroll:  ") + `${ledger.totalPayroll}`);
  console.log(chalk.cyan("Commitments:    ") + `${ledger.commitments.size()}`);
  for (const [index, commitment] of ledger.commitments) {
    console.log(chalk.gray(`   [${index}] ${hex(commitment)}`));
  }
  console.log(
    chalk.gray(
      "\nNo individual salary appears above — only the aggregate and one\n" +
        "opaque commitment per employee.\n"
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
      console.log("2. Assign employer            (platform, once)");
      console.log("3. Set payroll from roster.xlsx (employer)");
      console.log("4. Verify a commitment        (employer)");
      console.log("5. Transfer employer rights   (employer)");
      console.log("6. Exit");

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
                "then sends it here. Assigning is permanent: after this the\n" +
                "platform cannot reassign, revoke, or set payroll.\n"
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
              "\nA roster spreadsheet with columns: Full name | Address | Monthly gross salary.\n" +
                "Generate a starting point with `npm run roster:template`.\n"
            )
          );
          const answer = await rl.question("Path to .xlsx [roster-template.xlsx]: ");
          const file = answer.trim() || "roster-template.xlsx";

          let salaries: bigint[];
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

            // Names and addresses are printed for confirmation and then dropped:
            // they never enter a circuit, let alone the chain.
            console.log();
            console.log(chalk.cyan(`Read ${roster.rows.length} employees from ${file}:`));
            for (const row of roster.rows) {
              console.log(
                chalk.gray(
                  `   [${row.index}] ${row.fullName.padEnd(18)} ${formatMinor(row.salaryMinor).padStart(12)}`
                )
              );
            }
            console.log(
              chalk.yellow.bold(`   total: ${formatMinor(roster.totalMinor)}`) +
                chalk.gray("  ← the only figure that becomes public")
            );
            console.log();

            const confirm = await rl.question("Submit this payroll? [y/N]: ");
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

          // One nonce per employee, so two people on the same salary do not
          // produce the same commitment.
          const nonces = salaries.map(() => new Uint8Array(randomBytes(32)));

          try {
            console.log(
              chalk.gray("\nProving and submitting (this takes a few minutes)...")
            );
            const tx = await conn.deployed.callTx.setPayroll(salaries, nonces);

            writeSecrets({
              contractAddress: conn.contractAddress,
              updatedAt: new Date().toISOString(),
              employees: salaries.map((salary, index) => ({
                index,
                salary: salary.toString(),
                nonce: hex(nonces[index]!),
              })),
            });

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

          const raw = await rl.question(`Employee index (0-${ROSTER - 1}): `);
          const index = Number(raw.trim());
          const record = secrets.employees.find((e) => e.index === index);
          if (!record) {
            console.log(chalk.red(`❌ No local record for index ${raw.trim()}\n`));
            break;
          }

          try {
            const ledger = await readLedger(conn);
            if (!ledger || !ledger.commitments.member(BigInt(index))) {
              console.log(chalk.red(`❌ No on-chain commitment at index ${index}\n`));
              break;
            }

            // Recomputed with the contract's own pure circuit, so this is the
            // identical hash the proof committed to — not a re-implementation.
            const expected = conn.contractModule.pureCircuits.commitmentFor(
              BigInt(record.salary),
              Uint8Array.from(Buffer.from(record.nonce, "hex"))
            );
            const onChain = ledger.commitments.lookup(BigInt(index));
            const matches = hex(expected) === hex(onChain);

            console.log();
            console.log(`Salary (local):  ${record.salary}`);
            console.log(chalk.gray(`On chain:        ${hex(onChain)}`));
            console.log(chalk.gray(`Recomputed:      ${hex(expected)}`));
            console.log(
              matches
                ? chalk.green.bold("✅ Commitment matches — this salary is what was committed.\n")
                : chalk.red.bold("❌ Mismatch — the local record does not open this commitment.\n")
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

        case "6":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log(chalk.red("❌ Invalid choice. Please enter 1-6.\n"));
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
