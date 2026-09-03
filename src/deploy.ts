// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import chalk from "chalk";
import { loadCompiledContract } from "./utils/contract.js";
import {
  DEFAULT_PEUR_SUPPLY,
  formatPeur,
  parsePeurAmount,
} from "./utils/constructor-args.js";

/**
 * Supply minted immediately after deploying pEUR.
 *
 * Lives here rather than beside the unit constants because those are shared with
 * the browser bundle, which has no `process` to read.
 */
function initialPeurSupply(): bigint {
  const raw = process.env.PEUR_INITIAL_SUPPLY;
  return raw ? parsePeurAmount(raw) : DEFAULT_PEUR_SUPPLY;
}
import { currentInstance, deploymentKey, saveDeployment } from "./utils/deployments.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { treasuryKeys } from "./utils/treasury.js";

async function main() {
  console.log();
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log(
    chalk.blue.bold(
      `🌙  midnight-polisZK Deployment — ${process.env.CONTRACT_NAME ?? "?"}${currentInstance() ? `:${currentInstance()}` : ""}`
    )
  );
  console.log(chalk.blue.bold("━".repeat(60)));
  console.log();

  EnvironmentManager.validateEnvironment();

  const network = EnvironmentManager.getNetworkConfig();
  // No default: there is no single "the contract" here, and silently deploying
  // the wrong one wastes a real transaction.
  const contractName = process.env.CONTRACT_NAME?.trim();
  if (!contractName) {
    console.error(
      chalk.red("❌ CONTRACT_NAME is not set. Deploy one of:")
    );
    console.error(chalk.yellow.bold("   npm run deploy:payroll") + chalk.gray("   (add INSTANCE=<employer>)"));
    console.error(chalk.yellow.bold("   npm run deploy:peur"));
    process.exit(1);
  }
  const instance = currentInstance();
  const key = deploymentKey(network.networkId, contractName, instance);
  const secret = EnvironmentManager.getWalletSecret();

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
  const wallet = await buildWallet(secret, network);

  try {
    console.log(
      chalk.gray(
        wallet.resumed
          ? "Syncing (resuming from cached state)..."
          : "Syncing (no cached state — a fresh wallet replays from genesis)..."
      )
    );
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
    const { compiledContract } = await loadCompiledContract(contractName);

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

    // The fund withholds tax and contribution from every benefit, and both
    // destinations are frozen in its constructor exactly as payroll's are — so
    // triggering a remittance can never redirect one. Read from the same two
    // environment variables, because money withheld from a salary and money
    // withheld from the benefit that replaces it must land in the same place.
    //
    // "exactly as payroll's are" was true of the contract and not of this list:
    // payroll took the same two arguments and was not given them here, so
    // `npm run deploy:payroll` failed with "expected 3 arguments … received 1"
    // — a deploy-time arity error rather than anything about the contract. It
    // went unnoticed because payroll is normally deployed through
    // `utils/onboarding.ts`, which does pass them (and is the reason self-serve
    // onboarding kept working while this path did not).
    const constructorArgs =
      contractName === "fund" || contractName === "payroll"
        ? (() => {
            const t = treasuryKeys();
            console.log(chalk.gray(`   tax treasury    ${process.env.TAX_TREASURY_KEY}`));
            console.log(chalk.gray(`   social treasury ${process.env.SOCIAL_TREASURY_KEY}`));
            console.log(chalk.gray("   Both are frozen at deploy and can never be changed."));
            return [t.tax, t.social];
          })()
        : contractName === "taxvault"
          ? (() => {
              // Two arguments: who may withdraw, and which token this vault
              // holds.
              //
              // The authority is the tax treasury key, because that is already
              // the party a payroll contract remits to — the vault sits between
              // arrival and spending, it does not change who the money is for.
              //
              // The token is frozen here rather than fixed by the first coin
              // received, and that is a security fix rather than tidying.
              // Deposits are permissionless by design, so a first-writer token
              // let anyone send one dust unit of a self-minted token, pin the
              // vault to it, and make every real remittance fail `wrong token
              // for this vault` forever — nothing stolen, but the vault bricked
              // with a redeploy as the only recovery.
              //
              // ⚠️ This makes the vault deploy DEPEND on pEUR already existing.
              // `peur_token_id` is written by `npm run deploy:peur`; deploying a
              // vault before the token it holds is now refused here rather than
              // producing a vault that accepts the wrong thing.
              const t = treasuryKeys();
              const tokenId = (process.env.peur_token_id ?? "").replace(/^0x/, "").trim();
              if (!/^[0-9a-f]{64}$/i.test(tokenId)) {
                throw new Error(
                  "taxvault needs `peur_token_id` in .env — 64 hex characters.\n" +
                    "   It is written by `npm run deploy:peur`, and the vault's token is\n" +
                    "   frozen at deploy, so there is no fixing it afterwards."
                );
              }
              console.log(chalk.gray(`   authority  ${process.env.TAX_TREASURY_KEY}`));
              console.log(chalk.gray(`   holds      ${tokenId}`));
              console.log(
                chalk.gray("   Both frozen at deploy — withdrawals can go nowhere else,")
              );
              console.log(chalk.gray("   and no other token can ever be deposited."));
              return [t.tax, Uint8Array.from(Buffer.from(tokenId, "hex"))];
            })()
          : [];

    const deployed = await deployContract(providers as any, {
      compiledContract: compiledContract as any,
      args: constructorArgs,
    } as any);

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log();
    console.log(chalk.green.bold("━".repeat(60)));
    console.log(chalk.green.bold("🎉 CONTRACT DEPLOYED SUCCESSFULLY!"));
    console.log(chalk.green.bold("━".repeat(60)));
    console.log();
    console.log(chalk.cyan.bold("📍 Contract Address:"));
    console.log(chalk.white(`   ${contractAddress}`));
    console.log();
    console.log(
      chalk.gray(`   deploy tx hash: ${deployed.deployTxData.public.txHash}`)
    );
    console.log(
      chalk.gray("   Search the contract address or tx hash on an explorer.")
    );
    console.log();

    saveDeployment({
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: network.name,
      networkId: network.networkId,
      contractName,
      instance,
    });
    console.log(chalk.gray(`   Saved to deployment.json under "${key}"`));

    // pEUR is useless with zero supply, so the initial mint runs here rather
    // than leaving the caller to do it as a separate step.
    if (contractName === "peur") {
      const supply = initialPeurSupply();
      console.log();
      console.log(
        chalk.blue(`🪙  Minting initial supply (${formatPeur(supply)} pEUR)...`)
      );
      const mintTx = await deployed.callTx.mint(supply);
      console.log(chalk.green("   ✅ Minted to the deployer's shielded balance"));
      console.log(chalk.gray(`   tx hash ${mintTx.public.txHash}`));
    }
    console.log();
    if (contractName === "payroll") {
      console.log(
        chalk.yellow.bold("   ⚠️  This instance has no employer yet.")
      );
      console.log(
        chalk.cyan("   Assign one (deployer only, once): ") +
          chalk.yellow.bold(`${instance ? `INSTANCE=${instance} ` : ""}npm run payroll`)
      );
    } else {
      console.log(chalk.cyan("   Interact with it: ") + chalk.yellow.bold("npm run cli"));
    }
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
