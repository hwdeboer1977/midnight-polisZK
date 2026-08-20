import "dotenv/config";
import { randomBytes } from "crypto";
import { ZswapSecretKeys } from "@midnight-ntwrk/ledger-v8";
import chalk from "chalk";
import { EnvironmentManager } from "./utils/environment.js";
import { formatPeur } from "./utils/constructor-args.js";
import { getDeployment } from "./utils/deployments.js";
import { buildWallet, deriveKeys, waitForSync, type WalletSecret } from "./utils/wallet.js";

/**
 * A standalone employee, for testing that payroll actually pays someone else.
 *
 * Salaries used to be paid to keypairs derived from the employer's own
 * passphrase, which meant every "employee" was the employer wearing another
 * hat: the money moved and nobody but the employer could ever spend it. The
 * fix is that payees come from the roster — real keys, belonging to real
 * wallets — and the only way to test that honestly is with a wallet whose keys
 * the employer cannot derive.
 *
 * That normally means a second browser wallet, which is a slow thing to stand
 * up and an awkward thing to script. This gives the same guarantee from the
 * command line: a seed nobody else holds, its two public keys to paste into the
 * roster, and a balance check that answers the only question that matters —
 * can the person who was paid see the money?
 *
 *   npm run payee              → a new employee identity
 *   npm run payee <seed-hex>   → that employee's keys again
 *   npm run payee <seed-hex> --balance
 *                              → sync their wallet and show what arrived
 */

function keysFor(seedHex: string, networkId: string) {
  // Via the HD role, not `ZswapSecretKeys.fromSeed(seed)` directly. A wallet's
  // shielded keys hang off the Zswap role of the master seed, so deriving from
  // the master seed itself yields a different keypair — one that would be
  // filed on the roster, paid, and then found by no wallet at all.
  const secret: WalletSecret = { kind: "seed", value: seedHex };
  const { shieldedSeed } = deriveKeys(secret, networkId);
  const zswap = ZswapSecretKeys.fromSeed(shieldedSeed);
  return {
    secret,
    coinPublicKey: String(zswap.coinPublicKey).replace(/^0x/, "").toLowerCase(),
    encryptionPublicKey: String(zswap.encryptionPublicKey)
      .replace(/^0x/, "")
      .toLowerCase(),
  };
}

async function showBalance(secret: WalletSecret): Promise<void> {
  const network = EnvironmentManager.getNetworkConfig();
  const peur = getDeployment(network.networkId, "peur") as
    | { tokenId?: string }
    | undefined;

  console.log(chalk.gray(`\nSyncing this employee's wallet on ${network.name}…`));
  console.log(
    chalk.gray("   a first sync replays the chain and can take a few minutes")
  );

  const wallet = await buildWallet(secret, network);
  try {
    const state = await waitForSync(wallet, (line) => console.log(chalk.gray(`   ${line}`)));
    const balances = state.shielded.balances as Record<string, bigint>;

    console.log();
    if (!peur?.tokenId) {
      console.log(
        chalk.yellow("No pEUR deployment found for this network — showing every token.")
      );
    } else {
      const id = peur.tokenId.replace(/^0x/, "").toLowerCase();
      const held = balances[id] ?? balances[`0x${id}`] ?? 0n;

      console.log(
        chalk.yellow.bold("pEUR received: ") + chalk.white(`${formatPeur(held)} pEUR`)
      );
      console.log(chalk.gray(`   (${held} minor units)`));

      const coins = (state.shielded.availableCoins as any[]).filter(
        (c) => String(c.coin.type).replace(/^0x/, "").toLowerCase() === id
      );
      for (const c of coins) {
        console.log(
          chalk.gray(`   ${formatPeur(BigInt(c.coin.value))} pEUR  (leaf ${c.coin.mt_index})`)
        );
      }

      console.log();
      console.log(
        held > 0n
          ? chalk.green.bold(
              "✅ This employee can see their salary — and the employer cannot spend it."
            )
          : chalk.red.bold("❌ Nothing arrived for this employee.")
      );
      if (held === 0n) {
        console.log(
          chalk.gray(
            "\n   Either the period has not been paid yet, or the roster carried\n" +
              "   the wrong keys. Check the coin public key filed for this slot\n" +
              "   against the one printed above — the circuit commits to a hash of\n" +
              "   it, so a wrong key is not recoverable by re-paying."
          )
        );
      }
    }

    // Every token, because a mismatched pEUR deployment shows up here as a
    // balance under a token id nobody was looking for.
    const others = Object.entries(balances).filter(
      ([id]) =>
        !peur?.tokenId ||
        id.replace(/^0x/, "").toLowerCase() !== peur.tokenId.replace(/^0x/, "").toLowerCase()
    );
    if (others.length > 0) {
      console.log();
      console.log(chalk.cyan("Other shielded tokens held:"));
      for (const [id, amount] of others) {
        console.log(chalk.gray(`   ${id}  ${amount}`));
      }
    }
    console.log();
  } finally {
    await wallet.facade.stop();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantsBalance = args.includes("--balance");
  const seedArg = args.find((a) => !a.startsWith("--"));

  const network = EnvironmentManager.getNetworkConfig();
  const fresh = !seedArg;
  const seedHex = seedArg
    ? seedArg.trim().replace(/^0x/, "").toLowerCase()
    : randomBytes(32).toString("hex");

  if (!/^[0-9a-f]{64}$/.test(seedHex)) {
    throw new Error("A seed is 64 hex characters");
  }

  const { secret, coinPublicKey, encryptionPublicKey } = keysFor(seedHex, network.networkId);

  console.log();
  console.log(chalk.blue.bold("━".repeat(64)));
  console.log(chalk.blue.bold("👤  Test employee") + chalk.gray(`   (${network.name})`));
  console.log(chalk.blue.bold("━".repeat(64)));
  console.log();

  if (fresh) {
    console.log(chalk.yellow.bold("Seed (keep this — it is the only way back to this employee):"));
    console.log(chalk.white(`   ${seedHex}`));
    console.log();
  }

  console.log(chalk.cyan.bold("Paste into the roster, columns 4 and 5:"));
  console.log();
  console.log(chalk.gray("   Coin public key"));
  console.log(chalk.white(`   ${coinPublicKey}`));
  console.log();
  console.log(chalk.gray("   Encryption public key"));
  console.log(chalk.white(`   ${encryptionPublicKey}`));
  console.log();
  console.log(
    chalk.gray(
      "Both are public. The first names this employee inside the circuit and is\n" +
        "published only as a hash; the second is what their coin's ciphertext is\n" +
        "encrypted to. Omit the second and the payment succeeds and the coin is\n" +
        "never findable."
    )
  );

  if (wantsBalance) {
    await showBalance(secret);
  } else {
    console.log();
    console.log(
      chalk.gray("After payday, check what arrived:\n") +
        chalk.yellow(`   npm run payee ${seedHex} -- --balance`)
    );
    console.log();
  }

  process.exit(0);
}

main().catch((error) => {
  console.log();
  console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
  console.log();
  process.exit(1);
});
