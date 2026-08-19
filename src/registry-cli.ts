import "dotenv/config";
import * as readline from "readline/promises";
import chalk from "chalk";
import { EnvironmentManager } from "./utils/environment.js";
import { listDeployments } from "./utils/deployments.js";
import {
  closeRegistry,
  databaseUrl,
  listRegistrations,
  recordRegistration,
  registrationTermMonths,
  setStatus,
  type Registration,
} from "./utils/registry.js";

/**
 * The platform's view of who is registered.
 *
 * Nothing here can change a payroll contract. Assignment is permanent on chain,
 * so ending a registration ends the service arrangement and leaves the employer
 * in full control of their contract — which is the honest behaviour, and worth
 * seeing stated where an operator might expect a kill switch.
 */
function show(rows: Registration[]): void {
  if (rows.length === 0) {
    console.log(chalk.gray("\n(no registrations recorded)\n"));
    return;
  }

  console.log();
  for (const row of rows) {
    const live = row.effectiveStatus === "active";
    const expired = row.status === "active" && !live;

    console.log(
      chalk.white.bold(row.companyName) + chalk.gray(`  (${row.instance})`)
    );
    console.log(
      chalk.cyan("   status:     ") +
        (live ? chalk.green("active") : chalk.red("inactive")) +
        (expired ? chalk.yellow("  — term elapsed") : "")
    );
    console.log(chalk.cyan("   network:    ") + row.networkId);
    console.log(chalk.cyan("   payroll:    ") + row.contractAddress);
    console.log(
      chalk.cyan("   registered: ") + row.registeredAt.toISOString().slice(0, 10)
    );
    console.log(
      chalk.cyan("   term:       ") +
        `${row.termMonths} months, until ${row.expiresAt.toISOString().slice(0, 10)}`
    );
    console.log();
  }
}

/**
 * Rebuilds rows for contracts that were onboarded while the database was down.
 *
 * Only the fields the deployment record actually knows are restored — the
 * company's display name is not among them, so the instance slug stands in
 * rather than inventing one.
 */
async function backfill(networkId: string): Promise<void> {
  const missing = listDeployments().filter(
    ([, record]) =>
      record.networkId === networkId &&
      record.contractName === "payroll" &&
      record.instance
  );

  if (missing.length === 0) {
    console.log(chalk.gray("\nNothing to backfill.\n"));
    return;
  }

  const existing = new Set((await listRegistrations(networkId)).map((r) => r.instance));
  let added = 0;

  for (const [, record] of missing) {
    if (existing.has(record.instance!)) continue;
    await recordRegistration({
      companyName: record.instance!,
      instance: record.instance!,
      networkId: record.networkId,
      contractAddress: record.contractAddress,
      // Not in the deployment record; the chain is the place to read it.
      employerKey: "",
    });
    console.log(chalk.green(`   + ${record.instance}`));
    added += 1;
  }

  console.log(
    added === 0
      ? chalk.gray("\nAll deployed instances are already recorded.\n")
      : chalk.green(`\nAdded ${added} registration(s).\n`)
  );
}

async function main() {
  const network = EnvironmentManager.getNetworkConfig();

  console.log();
  console.log(chalk.blue.bold("🌙  midnight-polisZK — registrations"));
  console.log(chalk.gray(`   ${databaseUrl().replace(/\/\/[^@]*@/, "//***@")}`));
  console.log(chalk.gray(`   network: ${network.networkId}`));
  console.log(chalk.gray(`   default term: ${registrationTermMonths()} months`));
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    let running = true;
    while (running) {
      console.log(chalk.cyan("--- Menu ---"));
      console.log(`1. List registrations on ${network.networkId}`);
      console.log("2. List every network");
      console.log("3. Deactivate a registration");
      console.log("4. Reactivate a registration");
      console.log("5. Backfill from deployment.json");
      console.log("6. Exit");

      const choice = (await rl.question("\nYour choice: ")).trim();

      try {
        switch (choice) {
          case "1":
            show(await listRegistrations(network.networkId));
            break;
          case "2":
            show(await listRegistrations());
            break;
          case "3":
          case "4": {
            const status = choice === "3" ? "inactive" : "active";
            const instance = (await rl.question("Instance (company slug): ")).trim();
            const updated = await setStatus(network.networkId, instance, status);
            if (!updated) {
              console.log(
                chalk.red(`\n❌ No registration "${instance}" on ${network.networkId}\n`)
              );
              break;
            }
            console.log(chalk.green(`\n✅ ${updated.companyName} is now ${status}`));
            if (status === "inactive") {
              console.log(
                chalk.gray(
                  "   Their payroll contract is unchanged — assignment is permanent\n" +
                    "   on chain, so they keep control of it.\n"
                )
              );
            } else {
              console.log();
            }
            break;
          }
          case "5":
            await backfill(network.networkId);
            break;
          case "6":
            running = false;
            console.log("\n👋 Goodbye!");
            break;
          default:
            console.log(chalk.red("❌ Invalid choice. Please enter 1-6.\n"));
        }
      } catch (error) {
        console.error(
          chalk.red(`\n❌ ${error instanceof Error ? error.message : String(error)}`)
        );
        console.error(chalk.gray("   Is the database up? Start it with: npm run db:up\n"));
      }
    }
  } finally {
    rl.close();
    await closeRegistry();
  }
  process.exit(0);
}

main().catch(async (error) => {
  console.error(chalk.red("\n❌ Error:"), error);
  await closeRegistry();
  process.exit(1);
});
