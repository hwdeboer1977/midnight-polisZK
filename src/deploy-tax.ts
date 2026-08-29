// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import chalk from "chalk";
import { loadCompiledContract } from "./utils/contract.js";
import {
  currentInstance,
  deploymentKey,
  getDeployment,
  saveDeployment,
} from "./utils/deployments.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { toPublicKey } from "./utils/keys.js";
import { treasuryKeys } from "./utils/treasury.js";
import { DUTCH_V1 } from "./utils/tax-params.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

/**
 * Deploys the tax half of the system, in the one order that works.
 *
 *   1. taxparams          — the rule registry, one shared instance
 *   2. publish v1         — the rates, immutable once written
 *   3. payroll            — one per employer, with both treasuries frozen in
 *   4. assignEmployer     — hands the instance over, once and permanently
 *   5. setParamsFor       — records which rules each period is filed under
 *
 * Why it is one script rather than five commands: every step after the first
 * needs a value the previous one produced, and three of them are irreversible.
 * A registry version cannot be edited, a payroll's treasuries cannot be
 * changed, and an employer cannot be reassigned. Getting the order wrong does
 * not fail — it succeeds into a state you cannot correct.
 *
 *   REGISTRY_ONLY=1 npm run deploy:tax  only the registry — for browser signup
 *   npm run deploy:tax                  deploy the registry, then a payroll
 *   INSTANCE=acme npm run deploy:tax    name the employer instance
 *   EMPLOYER_KEY=... npm run deploy:tax assign it on the way
 *   PERIODS=202608,202609 npm run deploy:tax   record rules for those months
 */

const line = (n = 60) => "━".repeat(n);

/**
 * Treasury destinations, with the guidance the shared helper cannot give.
 *
 * The helper throws a message; this turns it into instructions, because the
 * answer to "they are not set" is a command to run, not a definition.
 */
function requireTreasuries() {
  try {
    return treasuryKeys();
  } catch {
    console.error();
    console.error(chalk.red("❌ Treasury keys are not set."));
    console.error();
    console.error(
      chalk.gray(
        "   A payroll contract freezes both destinations at deploy and can never\n" +
          "   change them, so they have to be decided now rather than defaulted."
      )
    );
    console.error();
    console.error(chalk.cyan("   Generate two keys:"));
    console.error(chalk.yellow.bold("      npm run payee") + chalk.gray("   (twice — keep both seeds)"));
    console.error();
    console.error(chalk.cyan("   Then add their coin public keys to .env:"));
    console.error(chalk.yellow("      TAX_TREASURY_KEY=<64 hex chars>"));
    console.error(chalk.yellow("      SOCIAL_TREASURY_KEY=<64 hex chars>"));
    console.error();
    process.exit(1);
  }
}

/** The shared rule set, in the shape the generated binding expects. */
function circuitParams() {
  return {
    version: BigInt(DUTCH_V1.version),
    validFrom: BigInt(DUTCH_V1.validFrom),
    threshold1: DUTCH_V1.threshold1,
    threshold2: DUTCH_V1.threshold2,
    rate1: BigInt(DUTCH_V1.rate1),
    rate2: BigInt(DUTCH_V1.rate2),
    rate3: BigInt(DUTCH_V1.rate3),
    maxContribBase: DUTCH_V1.maxContribBase,
    contribRate: BigInt(DUTCH_V1.contribRate),
  };
}

function periodsFromEnv(): number[] {
  const raw = process.env.PERIODS?.trim();
  if (!raw) return [];

  const one = (text: string): number => {
    const period = Number(text.trim());
    if (!Number.isInteger(period) || period < 200001 || period > 299912) {
      throw new Error(`"${text.trim()}" is not a period in YYYYMM form`);
    }
    const month = period % 100;
    if (month < 1 || month > 12) {
      throw new Error(`"${text.trim()}" has no month 1-12`);
    }
    return period;
  };

  // Ranges, because a year is twelve of these and writing them out is how a
  // month gets missed. `202601-202612` expands month-wise rather than
  // numerically: the numbers between 202612 and 202701 are not periods.
  const periods = new Set<number>();
  for (const part of raw.split(",")) {
    const range = part.split("-");
    if (range.length === 1) {
      periods.add(one(range[0]!));
      continue;
    }
    if (range.length !== 2) throw new Error(`"${part.trim()}" is not a period or a range`);

    const from = one(range[0]!);
    const to = one(range[1]!);
    if (to < from) throw new Error(`"${part.trim()}" runs backwards`);

    let year = Math.floor(from / 100);
    let month = from % 100;
    for (;;) {
      const period = year * 100 + month;
      periods.add(period);
      if (period >= to) break;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  return [...periods].sort((a, b) => a - b);
}

async function main() {
  console.log();
  console.log(chalk.blue.bold(line()));
  console.log(chalk.blue.bold("🌙  IncomeLayerZK — tax registry and payroll deployment"));
  console.log(chalk.blue.bold(line()));
  console.log();

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  const instance = currentInstance();
  const treasuries = requireTreasuries();
  const periods = periodsFromEnv();

  setNetworkId(network.networkId);

  for (const name of ["taxparams", "payroll"]) {
    if (!EnvironmentManager.checkContractCompiled(name)) {
      console.error(chalk.red(`❌ ${name} is not compiled. Run: npm run compile`));
      process.exit(1);
    }
    const runtime = EnvironmentManager.checkRuntimeVersion(name);
    if (!runtime.ok) {
      console.error(
        chalk.red(
          `❌ ${name} was compiled for compact-runtime ${runtime.compiled}, ` +
            `but ${runtime.installed} is installed.`
        )
      );
      process.exit(1);
    }
  }

  console.log(chalk.gray("Building wallet..."));
  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);

  try {
    console.log(
      chalk.gray(
        wallet.resumed
          ? "Syncing (resuming from cached state)..."
          : "Syncing (no cached state — a fresh wallet replays from genesis)..."
      )
    );
    const state = await waitForSync(wallet, (l) => console.log(chalk.gray(`   ${l}`)));

    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());
    console.log();
    console.log(chalk.cyan.bold("📍 Deployer: ") + chalk.white(wallet.unshieldedAddress));
    console.log(chalk.yellow.bold("💰 tNIGHT: ") + chalk.white(`${night}`));
    console.log(chalk.yellow.bold("💨 tDUST:  ") + chalk.white(`${dust}`));
    console.log();

    if (dust === 0n) {
      console.log(chalk.red.bold("❌ No tDUST — fees cannot be paid."));
      if (!EnvironmentManager.isLocal() && night === 0n) {
        console.log(chalk.cyan("   Fund the address above at: ") + chalk.underline(network.faucet));
      }
      process.exit(1);
    }

    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providersFor = (contractName: string) =>
      MidnightProviders.create({
        contractName,
        walletProvider,
        midnightProvider,
        networkConfig: network,
        accountId: wallet.unshieldedAddress,
      });

    // ── 1. the registry ────────────────────────────────────────────────────
    //
    // Reused if one already exists on this network. It is shared by every
    // employer, so a second instance would fragment the record rather than
    // extend it — and a period filed against one registry is not checkable
    // against another.
    const existing = getDeployment(network.networkId, "taxparams");
    const paramsContract = await loadCompiledContract("taxparams");
    let taxparamsAddress: string;
    let taxparamsDeployed: any;

    if (existing) {
      console.log(chalk.gray(`📋 Reusing taxparams at ${existing.contractAddress}`));
      taxparamsAddress = existing.contractAddress;
      taxparamsDeployed = await findDeployedContract(providersFor("taxparams") as any, {
        contractAddress: taxparamsAddress,
        compiledContract: paramsContract.compiledContract as any,
      } as any);
    } else {
      console.log(chalk.blue("🚀 Deploying taxparams (30-60s)..."));
      taxparamsDeployed = await deployContract(providersFor("taxparams") as any, {
        compiledContract: paramsContract.compiledContract as any,
        args: [],
      } as any);
      taxparamsAddress = taxparamsDeployed.deployTxData.public.contractAddress;
      console.log(chalk.green(`   ✅ ${taxparamsAddress}`));
      saveDeployment({
        contractAddress: taxparamsAddress,
        deployedAt: new Date().toISOString(),
        network: network.name,
        networkId: network.networkId,
        contractName: "taxparams",
      });
    }

    // ── 2. publish the rules ───────────────────────────────────────────────
    //
    // Append-only: a version that exists cannot be rewritten, so publishing
    // twice is refused by the circuit rather than silently overwriting. That is
    // the property the whole registry exists for, so a failure here is the
    // system working.
    const paramsHash = (paramsContract.contractModule as any).pureCircuits.paramsHash(
      circuitParams()
    );
    const paramsHashHex = Buffer.from(paramsHash).toString("hex");

    console.log();
    console.log(chalk.blue(`📜 Publishing rule set v${DUTCH_V1.version}...`));
    console.log(chalk.gray(`   valid from   ${DUTCH_V1.validFrom}`));
    console.log(
      chalk.gray(
        `   bands        ${DUTCH_V1.rate1 / 100}% / ${DUTCH_V1.rate2 / 100}% / ${DUTCH_V1.rate3 / 100}%`
      )
    );
    console.log(chalk.gray(`   contribution ${DUTCH_V1.contribRate / 100}%`));
    console.log(chalk.gray(`   hash         ${paramsHashHex}`));

    try {
      const tx = await taxparamsDeployed.callTx.publish(circuitParams());
      console.log(chalk.green(`   ✅ published, tx ${tx.public.txHash}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already published")) {
        console.log(chalk.gray("   already published — left as it stands"));
      } else {
        throw error;
      }
    }

    // Registering from the browser deploys its own payroll contract through the
    // onboarding service, so stopping here leaves exactly what that path needs
    // and nothing it would duplicate.
    if (process.env.REGISTRY_ONLY === "1") {
      console.log();
      console.log(chalk.green.bold(line()));
      console.log(chalk.green.bold("🎉 Registry ready"));
      console.log(chalk.green.bold(line()));
      console.log();
      console.log(chalk.cyan("taxparams  ") + chalk.white(taxparamsAddress));
      console.log();
      console.log(chalk.cyan("Employers can now register from the app, which needs both:"));
      console.log(chalk.yellow.bold("   npm run proof:up") + chalk.gray("      the service proves server-side"));
      console.log(chalk.yellow.bold("   npm run demo:server") + chalk.gray("   holds the platform key"));
      console.log();
      console.log(chalk.cyan("Then: ") + chalk.yellow.bold("npm run frontend:config"));
      console.log();
      await wallet.facade.stop();
      process.exit(0);
    }

    // ── 3. the payroll contract ────────────────────────────────────────────
    //
    // Reused if one is already recorded for this network and instance, so the
    // script can be re-run to do only the steps that were skipped. Assigning an
    // employer is irreversible, which makes "deploy, check it reads, then
    // assign" the sane order — and that order is impossible if a second run
    // deploys a second contract.
    const payrollContract = await loadCompiledContract("payroll");
    const existingPayroll = getDeployment(network.networkId, "payroll", instance);
    let payrollAddress: string;
    let payrollDeployed: any;

    console.log();
    if (existingPayroll && process.env.NEW_PAYROLL !== "1") {
      payrollAddress = existingPayroll.contractAddress;
      console.log(chalk.gray(`📋 Reusing payroll at ${payrollAddress}`));
      console.log(
        chalk.gray("   Set NEW_PAYROLL=1 to deploy another instance instead.")
      );
      payrollDeployed = await findDeployedContract(providersFor("payroll") as any, {
        contractAddress: payrollAddress,
        compiledContract: payrollContract.compiledContract as any,
      } as any);
    } else {
      console.log(chalk.blue("🚀 Deploying payroll (30-60s)..."));
      console.log(chalk.gray(`   tax treasury    ${process.env.TAX_TREASURY_KEY}`));
      console.log(chalk.gray(`   social treasury ${process.env.SOCIAL_TREASURY_KEY}`));
      console.log(chalk.gray("   Both are frozen at deploy and can never be changed."));

      payrollDeployed = await deployContract(providersFor("payroll") as any, {
        compiledContract: payrollContract.compiledContract as any,
        args: [treasuries.tax, treasuries.social],
      } as any);
      payrollAddress = payrollDeployed.deployTxData.public.contractAddress;

      console.log(chalk.green(`   ✅ ${payrollAddress}`));
      saveDeployment({
        contractAddress: payrollAddress,
        deployedAt: new Date().toISOString(),
        network: network.name,
        networkId: network.networkId,
        contractName: "payroll",
        instance,
      });
      console.log(
        chalk.gray(
          `   Saved under "${deploymentKey(network.networkId, "payroll", instance)}"`
        )
      );
    }

    // ── 4. hand it to the employer ─────────────────────────────────────────
    //
    // Optional here because it is irreversible: once assigned, the platform can
    // never write payroll to this instance or take it back. Skipping it leaves
    // the contract deployed and unowned, which is recoverable; assigning it to
    // the wrong key is not.
    const employerKey = process.env.EMPLOYER_KEY?.trim();
    if (employerKey) {
      console.log();
      console.log(chalk.blue("🤝 Assigning the employer..."));
      console.log(
        chalk.gray("   Once only, and irreversible: after this the platform can")
      );
      console.log(
        chalk.gray("   neither write payroll to this instance nor take it back.")
      );
      const tx = await payrollDeployed.callTx.assignEmployer(toPublicKey(employerKey));
      console.log(chalk.green(`   ✅ assigned to ${employerKey.slice(0, 16)}…`));
      console.log(chalk.gray(`   tx ${tx.public.txHash}`));
    } else {
      console.log();
      console.log(chalk.yellow("   ⚠️  No EMPLOYER_KEY set — the instance is unowned."));
      console.log(
        chalk.cyan("   Assign it later (deployer only, once): ") +
          chalk.yellow.bold(`${instance ? `INSTANCE=${instance} ` : ""}npm run payroll`)
      );
    }

    // ── 5. record the rules for each period ────────────────────────────────
    //
    // Needed because the payroll contract cannot read the registry — contracts
    // cannot read each other's state — so the platform writes the hash in.
    // Write-once per period: changing it afterwards would retroactively alter
    // what an employer already committed to.
    if (periods.length > 0) {
      console.log();

      // Which are already recorded, read from the contract rather than
      // remembered. `setParamsFor` is write-once, so a period recorded earlier
      // fails the call — and it fails AFTER proving, which meant that asking for
      // a year that overlapped an existing month cost a proof and then aborted
      // the whole run. Skipping them makes "record everything" a safe thing to
      // ask for twice, which is the only way it is useful.
      let already = new Set<number>();
      try {
        const state = await providersFor("payroll").publicDataProvider.queryContractState(
          payrollAddress
        );
        if (state) {
          const ledger = (payrollContract.contractModule as any).ledger(state.data);
          already = new Set(
            periods.filter((period) => ledger.paramsHashFor.member(BigInt(period)))
          );
        }
      } catch {
        // An unreadable ledger is not a reason to refuse to record: the calls
        // below still assert write-once themselves. Worst case is the old
        // behaviour.
      }

      const todo = periods.filter((period) => !already.has(period));
      if (already.size > 0) {
        console.log(
          chalk.gray(
            `   ${already.size} period(s) already recorded — skipping ` +
              `${[...already].sort().join(", ")}`
          )
        );
      }

      if (todo.length === 0) {
        console.log(chalk.green("📅 Every period requested is already recorded."));
      } else {
        console.log(chalk.blue(`📅 Recording the rule set for ${todo.length} period(s)...`));
        for (const period of todo) {
          const tx = await payrollDeployed.callTx.setParamsFor(BigInt(period), paramsHash);
          console.log(chalk.green(`   ✅ ${period} → v${DUTCH_V1.version}`) + chalk.gray(`  tx ${tx.public.txHash}`));
        }
      }
    } else {
      console.log();
      console.log(chalk.yellow("   ⚠️  No PERIODS set — no month can be filed yet."));
      console.log(
        chalk.gray(
          "   A period needs its rule set recorded before setPayroll will accept it."
        )
      );
      console.log(
        chalk.cyan("   Add them: ") +
          chalk.yellow.bold("PERIODS=202608,202609,202610 npm run deploy:tax")
      );
    }

    console.log();
    console.log(chalk.green.bold(line()));
    console.log(chalk.green.bold("🎉 Deployed"));
    console.log(chalk.green.bold(line()));
    console.log();
    console.log(chalk.cyan("taxparams  ") + chalk.white(taxparamsAddress));
    console.log(chalk.cyan("payroll    ") + chalk.white(payrollAddress));
    console.log();
    console.log(chalk.cyan("Next: ") + chalk.yellow.bold("npm run frontend:config"));
    console.log(
      chalk.gray("   copies the new contract modules and addresses into the app.")
    );
    console.log();
  } finally {
    await wallet.facade.stop();
  }
  process.exit(0);
}

main().catch((error) => {
  console.log();
  console.error(chalk.red.bold("❌ Deployment failed:"));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  console.log();
  process.exit(1);
});
