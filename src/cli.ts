import "dotenv/config";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { pipe } from "effect";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";
import chalk from "chalk";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(chalk.blue.bold("🌙  midnight-polisZK CLI"));
  console.log();

  if (!fs.existsSync("deployment.json")) {
    console.error(
      chalk.red("❌ No deployment.json found. Run: npm run deploy")
    );
    rl.close();
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  const contractName = process.env.CONTRACT_NAME || "hello-world";
  const seed = EnvironmentManager.getWalletSeed();

  setNetworkId(network.networkId);

  console.log(chalk.gray("Building wallet..."));
  const wallet = await buildWallet(seed, network);

  try {
    console.log(chalk.gray("Syncing..."));
    await waitForSync(wallet, (line) => console.log(chalk.gray(`   ${line}`)));

    const managedPath = path.join(
      process.cwd(),
      "contracts",
      "managed",
      contractName
    );
    const contractModule = await import(
      path.join(managedPath, "contract", "index.js")
    );

    const compiledContract = pipe(
      CompiledContract.make(contractName, contractModule.Contract),
      CompiledContract.withVacantWitnesses,
      CompiledContract.withCompiledFileAssets(managedPath)
    );

    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });

    const deployed: any = await findDeployedContract(providers as any, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.contractAddress,
    });

    console.log(chalk.green("✅ Connected to contract"));
    console.log();

    let running = true;
    while (running) {
      console.log(chalk.cyan("--- Menu ---"));
      console.log("1. Store message");
      console.log("2. Read current message");
      console.log("3. Exit");

      const choice = await rl.question("\nYour choice: ");

      switch (choice) {
        case "1": {
          const customMessage = await rl.question("Enter your message: ");
          try {
            const tx = await deployed.callTx.storeMessage(customMessage);
            console.log(chalk.green("✅ Success!"));
            console.log(`Message: "${customMessage}"`);
            console.log(`Transaction ID: ${tx.public.txId}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Failed to store message:"), error);
          }
          break;
        }

        case "2": {
          console.log("\nReading message from blockchain...");
          try {
            const state = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress
            );
            if (state) {
              const ledger = contractModule.ledger(state.data);
              console.log(`📋 Current message: "${ledger.message}"\n`);
            } else {
              console.log("📋 No message found\n");
            }
          } catch (error) {
            console.error(chalk.red("❌ Failed to read message:"), error);
          }
          break;
        }

        case "3":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log(chalk.red("❌ Invalid choice. Please enter 1, 2, or 3.\n"));
      }
    }
  } finally {
    await wallet.facade.stop();
    rl.close();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error);
  process.exit(1);
});
