import "dotenv/config";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { pipe } from "effect";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

async function main() {
  console.log();
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log(chalk.blue.bold("🌙  midnight-polisZK Deployment"));
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log();

  EnvironmentManager.validateEnvironment();

  const network = EnvironmentManager.getNetworkConfig();
  const contractName = process.env.CONTRACT_NAME || "hello-world";
  const seed = EnvironmentManager.getWalletSeed();

  setNetworkId(network.networkId);

  if (!EnvironmentManager.checkContractCompiled(contractName)) {
    console.error(chalk.red("❌ Contract not compiled! Run: npm run compile"));
    process.exit(1);
  }

  // A compiler/runtime mismatch only surfaces as an opaque `Version mismatch`
  // when the contract module is imported, well after the wallet has synced.
  const runtime = EnvironmentManager.checkRuntimeVersion(contractName);
  if (!runtime.ok) {
    console.error(
      chalk.red(
        `❌ contracts/managed was compiled for compact-runtime ${runtime.compiled}, ` +
          `but ${runtime.installed} is installed.`
      )
    );
    console.error(
      chalk.cyan("   Pin the matching compiler and recompile: ") +
        chalk.yellow.bold("compact update <version> && npm run reset")
    );
    process.exit(1);
  }

  console.log(chalk.gray("Building wallet..."));
  const wallet = await buildWallet(seed, network);

  try {
    console.log(chalk.gray("Syncing (a fresh wallet syncs from genesis)..."));
    const state = await waitForSync(wallet, (line) =>
      console.log(chalk.gray(`   ${line}`))
    );

    console.log();
    console.log(chalk.cyan.bold("📍 Unshielded address:"));
    console.log(chalk.white(`   ${wallet.unshieldedAddress}`));
    console.log();

    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());

    console.log(chalk.yellow.bold("💰 tNIGHT: ") + chalk.white(`${night}`));
    console.log(chalk.yellow.bold("💨 tDUST:  ") + chalk.white(`${dust}`));
    console.log();

    if (dust === 0n) {
      console.log(chalk.red.bold("❌ No tDUST — fees cannot be paid."));
      console.log();
      if (EnvironmentManager.isLocal()) {
        console.log(
          chalk.cyan(
            "   The devnet mints DUST a few blocks after genesis. Wait ~30s and retry."
          )
        );
      } else if (night === 0n) {
        console.log(
          chalk.cyan("   Fund the address above at: ") +
            chalk.underline(network.faucet)
        );
      } else {
        console.log(
          chalk.cyan(
            "   You hold tNIGHT but no tDUST. It must be registered for DUST generation before fees can be paid."
          )
        );
      }
      console.log();
      process.exit(1);
    }

    console.log(chalk.gray("📦 Loading contract..."));
    const managedPath = path.join(
      process.cwd(),
      "contracts",
      "managed",
      contractName
    );
    const contractModule = await import(
      path.join(managedPath, "contract", "index.js")
    );

    // Contracts are now bound through CompiledContract: the constructor, its
    // witnesses, and the path to the compiled ZK assets.
    const compiledContract = pipe(
      CompiledContract.make(contractName, contractModule.Contract),
      CompiledContract.withVacantWitnesses,
      CompiledContract.withCompiledFileAssets(managedPath)
    );

    console.log(chalk.gray("Setting up providers..."));
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });

    console.log(chalk.blue("🚀 Deploying contract (30-60 seconds)..."));
    console.log();

    const deployed = await deployContract(providers as any, {
      compiledContract: compiledContract as any,
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log();
    console.log(chalk.green.bold("━".repeat(60)));
    console.log(chalk.green.bold("🎉 CONTRACT DEPLOYED SUCCESSFULLY!"));
    console.log(chalk.green.bold("━".repeat(60)));
    console.log();
    console.log(chalk.cyan.bold("📍 Contract Address:"));
    console.log(chalk.white(`   ${contractAddress}`));
    console.log();

    const info = {
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: network.name,
      networkId: network.networkId,
      contractName,
    };
    fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));
    console.log(chalk.gray("   Saved to deployment.json"));
    console.log();
    console.log(chalk.cyan("   Interact with it: ") + chalk.yellow.bold("npm run cli"));
    console.log();
  } finally {
    await wallet.facade.stop();
  }
  process.exit(0);
}

main().catch((error) => {
  console.log();
  console.log(chalk.red.bold("❌ Deployment failed:"));
  console.error(chalk.red(error instanceof Error ? error.stack ?? error.message : String(error)));
  console.log();
  process.exit(1);
});
