// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import chalk from "chalk";
import { EnvironmentManager } from "./utils/environment.js";
import { buildWallet, getUnshieldedAddress, waitForSync } from "./utils/wallet.js";

async function checkBalance() {
  console.log();
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log(chalk.blue.bold("🌙  Wallet Balance Checker"));
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log();

  EnvironmentManager.validateEnvironment();
  const secret = EnvironmentManager.getWalletSecret();
  const network = EnvironmentManager.getNetworkConfig();

  // Derived locally from the seed, so it prints even if the network is down.
  const address = getUnshieldedAddress(secret, network.networkId);

  console.log(chalk.cyan.bold("📍 Unshielded address (fund this one):"));
  console.log(chalk.white(`   ${address}`));
  console.log();
  console.log(chalk.gray(`   Network: ${network.name}`));
  console.log(chalk.gray(`   Key from: ${EnvironmentManager.describeWalletSecret()}`));
  if (!EnvironmentManager.isLocal()) {
    console.log(
      chalk.yellow("   This must match the address your wallet app shows.")
    );
  }
  console.log();

  console.log(chalk.gray("Syncing wallet..."));
  let wallet;
  try {
    wallet = await buildWallet(secret, network);
  } catch (error) {
    console.log();
    console.log(chalk.red("❌ Could not reach the network:"));
    console.log(
      chalk.red(`   ${error instanceof Error ? error.message : String(error)}`)
    );
    console.log();
    console.log(chalk.yellow("The address above is still correct — fund it at:"));
    console.log(chalk.underline(`   ${network.faucet}`));
    console.log();
    process.exit(1);
  }

  console.log(
    chalk.gray(
      wallet.resumed
        ? "   resuming from cached state"
        : "   no cached state — first sync replays the chain and can take a while"
    )
  );

  try {
    const state = await waitForSync(wallet, (line) =>
      console.log(chalk.gray(`   ${line}`))
    );
    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());

    console.log();
    console.log(chalk.yellow.bold("💰 tNIGHT: ") + chalk.white(`${night}`));
    console.log(chalk.yellow.bold("💨 tDUST:  ") + chalk.white(`${dust}`));
    console.log();

    if (EnvironmentManager.isLocal()) {
      console.log(
        dust === 0n
          ? chalk.yellow("⚠️  No tDUST yet — the devnet mints it a few blocks after genesis.")
          : chalk.green.bold("✅ Wallet is funded and ready!")
      );
    } else if (night === 0n) {
      console.log(chalk.red("❌ No tNIGHT yet."));
      console.log();
      console.log(chalk.magenta.bold("📝 How to get test tokens:"));
      console.log();
      console.log(
        chalk.white("   1. ") + chalk.cyan("Visit: ") + chalk.underline(network.faucet)
      );
      console.log(
        chalk.white("   2. ") + chalk.cyan("Paste the unshielded address above")
      );
      console.log(chalk.white("   3. ") + chalk.cyan("Request tokens"));
      console.log(
        chalk.white("   4. ") +
          chalk.cyan("Wait a few minutes, then re-run ") +
          chalk.yellow.bold("npm run check-balance")
      );
      console.log();
      console.log(
        chalk.gray(
          "   tNIGHT must be registered for DUST generation before you can pay fees."
        )
      );
    } else if (dust === 0n) {
      console.log(
        chalk.yellow(
          "⚠️  You hold tNIGHT but no tDUST. It must be registered for DUST generation before fees can be paid."
        )
      );
    } else {
      console.log(chalk.green.bold("✅ Wallet is funded and ready!"));
      console.log();
      console.log(
        chalk.cyan("   Deploy with: ") + chalk.yellow.bold("npm run deploy")
      );
    }
    console.log();
  } finally {
    await wallet.facade.stop();
  }
  process.exit(0);
}

checkBalance().catch((error) => {
  console.log();
  console.log(chalk.red.bold("❌ Error checking balance:"));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  console.log();
  process.exit(1);
});
