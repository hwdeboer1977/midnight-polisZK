// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { runRelay, type TerminationOpening } from "./utils/relay-run.js";
import { EnvironmentManager } from "./utils/environment.js";

/**
 * The relay: publishes one period's claim tree to the fund.
 *
 * It exists because of a wall, not a preference. A fund contract cannot read a
 * payroll ledger and a payroll contract cannot call the fund — both probed, both
 * settled — so the fund cannot check a claim against the commitment that backs
 * it. Something has to carry public payroll state across, and that something is
 * trusted to carry it faithfully.
 *
 * Be precise about what that trust is. A forged root is not prevented: nothing
 * in the fund can tell a true copy from an invented one. It is ATTRIBUTABLE and
 * publicly checkable — every input is public payroll state, so anyone with an
 * indexer can rebuild the tree and compare. And `publishRoot` is permissionless,
 * so a relay that declines to publish cannot silently block a claim; someone
 * else can publish the same root.
 *
 * What the relay never sees: any salary. Leaves are built from commitments and
 * payee bindings, both already public and both opaque. The one non-public input
 * is the termination opening, which carries months worked and a claim-key hash —
 * not an amount.
 *
 *   npm run relay -- <period>              build and write claim bundles
 *   npm run relay -- <period> --publish    and publish the root to the fund
 */

/** Openings the employers have handed over, for this period. */
function readOpenings(period: number): TerminationOpening[] {
  const dir = path.join(process.cwd(), "terminations");
  if (!fs.existsSync(dir)) return [];
  const openings: TerminationOpening[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      if (Number(entry.finalPeriod) === period) openings.push(entry);
    }
  }
  return openings;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const publish = args.includes("--publish");
  const periodArg = args.find((a) => !a.startsWith("--"));
  if (!periodArg) throw new Error("Usage: npm run relay -- <period> [--publish]");
  const period = Number(periodArg);

  const network = EnvironmentManager.getNetworkConfig();

  console.log();
  console.log(chalk.blue.bold("🌙  IncomeLayerZK — claim tree relay"));
  console.log(chalk.gray(`   period ${period} on ${network.name}`));
  console.log();

  const openings = readOpenings(period);
  if (openings.length === 0) {
    console.log(chalk.yellow("No termination openings for that period in ./terminations."));
    console.log(
      chalk.gray(
        "   Each employer writes one file per terminated employee. Without the\n" +
          "   opening the attestation on chain is an opaque hash and no leaf can\n" +
          "   be built from it — which is the point: the relay is given what it\n" +
          "   needs and nothing else."
      )
    );
    console.log();
    return;
  }

  const result = await runRelay({
    period,
    openings,
    publish,
    log: (line) => console.log(chalk.gray(line)),
  });

  for (const warning of result.warnings) console.log(chalk.yellow(`   ⚠️  ${warning}`));

  if (result.bundles.length === 0) {
    console.log();
    console.log(chalk.yellow("Nothing to publish."));
    console.log();
    return;
  }

  // Written here rather than in `runRelay`, because the HTTP caller wants the
  // bundles in the response and has no filesystem to put them on. The shape is
  // identical either way — the same object, serialised once here and once over
  // the wire.
  const outDir = path.join(process.cwd(), "claims", String(period));
  fs.mkdirSync(outDir, { recursive: true });
  for (const bundle of result.bundles) {
    const file = path.join(
      outDir,
      `claim-bundle-${bundle.instance}-${period}-slot-${bundle.slot + 1}.json`
    );
    fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
    console.log(chalk.gray(`   wrote ${path.relative(process.cwd(), file)}`));
  }

  if (!result.published) {
    console.log();
    console.log(chalk.gray("Not published — pass --publish to write the root to the fund."));
  }
  console.log();
}

main().catch((error) => {
  console.log();
  console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
  console.log();
  process.exit(1);
});
