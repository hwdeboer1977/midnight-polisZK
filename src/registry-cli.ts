// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import * as readline from "readline/promises";
import chalk from "chalk";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { EnvironmentManager } from "./utils/environment.js";
import { contractModulePath } from "./utils/contract.js";
import { listDeployments } from "./utils/deployments.js";
import { hex } from "./utils/keys.js";
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
 * `recordRegistration` runs at the end of onboarding and is deliberately
 * non-fatal — the contract is deployed and assigned by then, both irreversible,
 * so a database outage must not turn a completed onboarding into a failure. The
 * cost of that correct decision is this: contracts exist on chain with no row
 * anywhere, and the only sign was a warning in a job log that scrolled past.
 *
 * ── Where each field comes from ─────────────────────────────────────────────
 *
 * The employer key is read from the CONTRACT, not from `deployment.json`. This
 * function used to write `employerKey: ""` with a comment saying the chain was
 * the place to read it, which left every backfilled row missing the one field
 * that says whose contract it is — the deployer card renders it, and a blank
 * there is indistinguishable from an unassigned instance.
 *
 * The company's display name is nowhere on chain and nowhere in the deployment
 * record — a slug is not a name — so it is asked for. Enter to accept the slug.
 * Inventing one would be worse than either.
 */
async function backfill(
  networkId: string,
  rl: readline.Interface
): Promise<void> {
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(networkId);

  const candidates = listDeployments().filter(
    ([, record]) =>
      record.networkId === networkId &&
      record.contractName === "payroll" &&
      record.instance &&
      // A record marked unreadable by this build cannot be asked who its
      // employer is, so registering it would mean writing the blank key this
      // function exists to stop writing.
      !record.retired
  );

  if (candidates.length === 0) {
    console.log(chalk.gray("\nNothing to backfill.\n"));
    return;
  }

  const existing = new Set((await listRegistrations(networkId)).map((r) => r.instance));
  const provider = indexerPublicDataProvider(network.indexer, network.indexerWS);
  const payroll = await import(contractModulePath("payroll"));

  let added = 0;
  const skipped: string[] = [];

  for (const [, record] of candidates) {
    const instance = record.instance!;
    if (existing.has(instance)) continue;

    let employerKey: string;
    try {
      const state = await provider.queryContractState(record.contractAddress);
      if (!state) {
        skipped.push(`${instance} (no state on the indexer)`);
        continue;
      }
      const ledger = payroll.ledger(state.data);
      if (!ledger.employerAssigned) {
        // Deployed but never handed over. There is no employer to register, and
        // a row claiming otherwise would outlive the mistake.
        skipped.push(`${instance} (no employer assigned)`);
        continue;
      }
      employerKey = hex(ledger.employer.bytes);
    } catch (cause) {
      skipped.push(
        `${instance} (${cause instanceof Error ? cause.message : String(cause)})`
      );
      continue;
    }

    const answer = (
      await rl.question(
        `Company name for ${chalk.white.bold(instance)} ` +
          chalk.gray(`[${instance}]: `)
      )
    ).trim();

    const registration = await recordRegistration({
      companyName: answer || instance,
      instance,
      networkId: record.networkId,
      contractAddress: record.contractAddress,
      employerKey,
    });
    console.log(
      chalk.green(`   + ${registration.companyName}`) +
        chalk.gray(`  employer ${employerKey.slice(0, 16)}…  until ${
          registration.expiresAt.toISOString().slice(0, 10)
        }`)
    );
    added += 1;
  }

  // Said out loud rather than left to a count that does not add up. A silent
  // skip here means a contract nobody will notice is unregistered.
  if (skipped.length > 0) {
    console.log(chalk.yellow(`\nSkipped ${skipped.length}:`));
    for (const line of skipped) console.log(chalk.gray(`   · ${line}`));
  }

  console.log(
    added === 0
      ? chalk.gray("\nNothing added — every readable instance is already recorded.\n")
      : chalk.green(`\nAdded ${added} registration(s).\n`) +
          chalk.gray(
            `   The term runs ${registrationTermMonths()} months from today, not from\n` +
              "   the original onboarding — the chain does not record when that was.\n"
          )
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
            await backfill(network.networkId, rl);
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
