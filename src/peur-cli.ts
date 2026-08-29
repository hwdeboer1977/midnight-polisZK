// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import * as readline from "readline/promises";
import chalk from "chalk";
import { submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { MidnightBech32m } from "@midnight-ntwrk/wallet-sdk-address-format";
import { connect, readLedger } from "./utils/contract.js";
import { EnvironmentManager } from "./utils/environment.js";
import { currentState } from "./utils/wallet.js";
import { formatPeur, parsePeurAmount } from "./utils/constructor-args.js";
import { hex, toPublicKey } from "./utils/keys.js";

const CONTRACT_NAME = "peur";

/**
 * pEUR is shielded, so it does not appear in the tNIGHT/tDUST view. It lands in
 * the wallet's shielded balances, keyed by this deployment's token type.
 */
async function peurBalance(conn: any, tokenId: Uint8Array): Promise<bigint> {
  const state = await currentState(conn.wallet);
  const balances = state.shielded.balances as Record<string, bigint>;
  const key = hex(tokenId);
  return balances[key] ?? balances[`0x${key}`] ?? 0n;
}

async function showStatus(conn: any): Promise<void> {
  const ledger = await readLedger(conn);
  if (!ledger) {
    console.log("📋 No state found\n");
    return;
  }

  const mine = await peurBalance(conn, ledger.tokenId);

  console.log();
  console.log(chalk.cyan("Token id:      ") + hex(ledger.tokenId));
  console.log(chalk.cyan("Issuer:        ") + hex(ledger.issuer.bytes));
  console.log(
    chalk.gray(
      `   → ${
        hex(ledger.issuer.bytes) === conn.myPublicKey
          ? chalk.green("you are the issuer")
          : chalk.gray("you are not the issuer")
      }`
    )
  );
  console.log();
  console.log(
    chalk.yellow.bold("Total supply:  ") + `${formatPeur(ledger.totalSupply)} pEUR`
  );
  console.log(
    chalk.yellow.bold("Your balance:  ") + `${formatPeur(mine)} pEUR`
  );
  console.log(chalk.gray(`   (${mine} minor units, held as shielded coins)`));
  console.log(chalk.cyan("Mints so far:  ") + `${ledger.mintCounter}`);

  // "Where is my pEUR?" — it is not at the unshielded address wallets show by
  // default. It is one or more shielded coins, listed here so the holding is
  // visible even when a wallet app does not render custom token types.
  const state = await currentState(conn.wallet);
  const tokenHex = hex(ledger.tokenId);
  const coins = state.shielded.availableCoins.filter(
    (c: any) => String(c.coin.type) === tokenHex
  );
  console.log();
  console.log(chalk.cyan("Held as:       ") + `${coins.length} shielded coin(s)`);
  for (const c of coins) {
    console.log(
      chalk.gray(`   ${formatPeur(BigInt(c.coin.value))} pEUR  (leaf ${c.coin.mt_index})`)
    );
  }

  const network = EnvironmentManager.getNetworkConfig();
  console.log();
  console.log(chalk.cyan("Shielded address:"));
  console.log(
    chalk.white(
      `   ${MidnightBech32m.encode(network.networkId as any, state.shielded.address as any)}`
    )
  );
  console.log(
    chalk.gray("   pEUR lives here, not at your mn_addr_... unshielded address.")
  );
  console.log();
  console.log(chalk.cyan("Keys others need to pay you in pEUR:"));
  console.log(chalk.white(`   coin public key: ${conn.myPublicKey}`));
  console.log(
    chalk.white(
      `   enc public key : ${String(conn.wallet.shieldedSecretKeys.encryptionPublicKey)}`
    )
  );
  console.log(
    chalk.gray(
      "\nSupply is public so the token can be audited against reserves;\n" +
        "who holds how much is not.\n"
    )
  );
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(chalk.blue.bold("🌙  midnight-polisZK CLI — pEUR"));
  console.log();

  // pEUR is one deployment per network, not one per employer, so INSTANCE —
  // which scopes payroll — must not leak into the lookup here.
  const conn = await connect(CONTRACT_NAME, null);
  console.log(chalk.green("✅ Connected to contract"));
  console.log(chalk.gray(`   ${conn.contractAddress}`));
  console.log();

  try {
    let running = true;
    while (running) {
      console.log(chalk.cyan("--- Menu ---"));
      console.log("1. Show token status");
      console.log("2. Mint more pEUR to yourself   (anyone)");
      console.log("3. Send pEUR to someone else    (anyone)");
      console.log("4. Exit");

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
            chalk.gray("\nAmount in minor units — 1000000 = 1.00 pEUR.")
          );
          const answer = await rl.question("Amount: ");
          let amount: bigint;
          try {
            amount = parsePeurAmount(answer);
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          try {
            console.log(chalk.gray("\nProving and submitting..."));
            const tx = await conn.deployed.callTx.mint(amount);
            console.log(chalk.green("✅ Minted!"));
            console.log(`Amount: ${formatPeur(amount)} pEUR`);
            console.log(`Tx hash: ${tx.public.txHash}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Mint failed:"), error);
          }
          break;
        }

        case "3": {
          console.log(
            chalk.gray(
              "\nA shielded coin can only be found and spent by someone whose\n" +
                "encryption key the transaction was built with, so both of the\n" +
                "recipient's keys are needed. They can read them off `npm run peur`\n" +
                "or the frontend.\n"
            )
          );
          const coinKey = (await rl.question("Recipient coin public key (hex): ")).trim();
          const encKey = (await rl.question("Recipient encryption public key (hex): ")).trim();
          const rawAmount = await rl.question("Amount (minor units, 1000000 = 1.00 pEUR): ");

          let amount: bigint;
          let recipient: { bytes: Uint8Array };
          try {
            amount = parsePeurAmount(rawAmount);
            recipient = toPublicKey(coinKey);
            if (!/^[0-9a-fA-F]{2,}$/.test(encKey)) {
              throw new Error("Encryption public key must be hex");
            }
          } catch (error) {
            console.error(
              chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}\n`)
            );
            break;
          }

          try {
            console.log(chalk.gray("\nProving and submitting..."));
            // The callTx shorthand cannot carry the encryption-key mapping, so
            // the call is built explicitly. Without the mapping the coin is
            // created but the recipient's wallet can never detect it.
            const tx = await submitCallTx(conn.providers as any, {
              compiledContract: conn.compiledContract,
              contractAddress: conn.contractAddress,
              circuitId: "mintTo",
              args: [amount, recipient],
              additionalCoinEncPublicKeyMappings: new Map([[coinKey, encKey]]),
            } as any);
            console.log(chalk.green("✅ Sent!"));
            console.log(`Amount: ${formatPeur(amount)} pEUR`);
            console.log(`To: ${coinKey}`);
            console.log(`Tx hash: ${(tx as any).public.txHash}\n`);
          } catch (error) {
            console.error(chalk.red("❌ Send failed:"), error);
          }
          break;
        }

        case "4":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log(chalk.red("❌ Invalid choice. Please enter 1-4.\n"));
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
