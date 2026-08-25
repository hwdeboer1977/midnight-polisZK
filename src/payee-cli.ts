import "dotenv/config";
import { randomBytes } from "crypto";
import { ZswapSecretKeys } from "@midnight-ntwrk/ledger-v8";
import * as fundContract from "../contracts/managed/fund/contract/index.js";
import { validateMnemonic } from "@midnight-ntwrk/wallet-sdk";
import chalk from "chalk";
import { EnvironmentManager } from "./utils/environment.js";
import { formatPeur } from "./utils/constructor-args.js";
import { peurTokenId } from "./utils/peur.js";
import { buildWallet, deriveKeys, waitForSync, type WalletSecret } from "./utils/wallet.js";
import { deriveClaimKey } from "./utils/payroll-openings.js";

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
 *   npm run payee "<24 words>" → an employee who lives in a browser wallet
 *   npm run payee <secret> -- --balance
 *                              → sync their wallet and show what arrived
 *
 * Both secret forms are accepted, and the second is not a convenience. A
 * browser wallet (Lace, IAM) only ever hands out a recovery phrase — it has no
 * import for a raw key, and none of the 32-byte seeds generated here can be
 * expressed as one: a phrase becomes a master seed through PBKDF2, which lands
 * on 64 bytes and is one-way besides. Encoding such a seed as 24 words is the
 * trap, not the fix — restoring it derives an unrelated, empty wallet that
 * looks like a successful import. So an employee who has to be visible in a
 * wallet app must ORIGINATE there, and this end must take the phrase. Both
 * forms reach the same HD derivation, so the keys printed below are the ones
 * that wallet shows.
 */

function keysFor(secret: WalletSecret, networkId: string) {
  // Via the HD role, not `ZswapSecretKeys.fromSeed(seed)` directly. A wallet's
  // shielded keys hang off the Zswap role of the master seed, so deriving from
  // the master seed itself yields a different keypair — one that would be
  // filed on the roster, paid, and then found by no wallet at all.
  //
  // `deriveKeys` takes either secret form: a phrase is run through BIP-39 to a
  // 64-byte master seed first, exactly as the wallet SDK's own builder does it,
  // which is what makes these keys match what the browser wallet displays.
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
  // Read off the deployed contract, not out of deployment.json — that file
  // records addresses, and the token id lives on chain.
  const tokenId = await peurTokenId(network.networkId, network.indexer);

  console.log(chalk.gray(`\nSyncing this employee's wallet on ${network.name}…`));
  console.log(
    chalk.gray("   a first sync replays the chain and can take a few minutes")
  );

  const wallet = await buildWallet(secret, network);
  try {
    const state = await waitForSync(wallet, (line) => console.log(chalk.gray(`   ${line}`)));
    const balances = state.shielded.balances as Record<string, bigint>;

    console.log();
    if (!tokenId) {
      console.log(
        chalk.yellow("No pEUR deployment found for this network — showing every token.")
      );
    } else {
      const id = tokenId.replace(/^0x/, "").toLowerCase();
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
        !tokenId ||
        id.replace(/^0x/, "").toLowerCase() !== tokenId.replace(/^0x/, "").toLowerCase()
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

/**
 * Which employee this run is about: a hex seed, a recovery phrase, or a new one.
 *
 * The phrase is joined from every non-flag argument rather than read from the
 * first, so 24 words survive being pasted unquoted — which is how they come off
 * a wallet's export screen. Taking only `args[0]` would silently treat the word
 * "abandon" as the secret and fail on a length check that names the wrong
 * problem.
 */
function parseSecret(words: string[]): { secret: WalletSecret; fresh: boolean } {
  const given = words.join(" ").trim().replace(/\s+/g, " ");

  if (!given) {
    return {
      secret: { kind: "seed", value: randomBytes(32).toString("hex") },
      fresh: true,
    };
  }

  const hex = given.replace(/^0x/, "").toLowerCase();
  if (/^[0-9a-f]{64}$/.test(hex)) {
    return { secret: { kind: "seed", value: hex }, fresh: false };
  }

  if (validateMnemonic(given)) {
    return { secret: { kind: "mnemonic", value: given }, fresh: false };
  }

  throw new Error(
    given.includes(" ")
      ? `Not a valid BIP-39 recovery phrase (${given.split(" ").length} words read). ` +
          "Check for a typo, a missing word, or smart quotes from a copy-paste."
      : "Expected a 64-character hex seed, or a recovery phrase in quotes."
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantsBalance = args.includes("--balance");

  const network = EnvironmentManager.getNetworkConfig();
  const { secret, fresh } = parseSecret(args.filter((a) => !a.startsWith("--")));

  const { coinPublicKey, encryptionPublicKey } = keysFor(secret, network.networkId);

  console.log();
  console.log(chalk.blue.bold("━".repeat(64)));
  console.log(chalk.blue.bold("👤  Test employee") + chalk.gray(`   (${network.name})`));
  console.log(chalk.blue.bold("━".repeat(64)));
  console.log();

  if (fresh) {
    console.log(chalk.yellow.bold("Seed (keep this — it is the only way back to this employee):"));
    console.log(chalk.white(`   ${secret.value}`));
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

  if (args.includes("--claim-key")) {
    // Derived from the shielded seed, never from the coin public key. That key
    // is an address handed out to be paid, so a claim key derived from it would
    // be computable by every employer who ever paid this person — and the
    // nullifier built on it would hand them the claimant's benefit history.
    //
    // Only the HASH is given to an employer. It is anchored when they are hired,
    // and a claim later proves knowledge of its preimage — which is what stops a
    // claimant inventing fresh keys and drawing an endless series of benefits
    // that each look unspent.
    const { shieldedSeed } = deriveKeys(secret, network.networkId);
    const claimKey = deriveClaimKey(shieldedSeed);
    const hash = Buffer.from(
      (fundContract as any).pureCircuits.claimKeyHash(claimKey)
    ).toString("hex");

    console.log();
    console.log(chalk.cyan.bold("Claim key hash (give this to your employer):"));
    console.log(chalk.white(`   ${hash}`));
    console.log();
    console.log(
      chalk.gray(
        "Public, and safe to share: it is a hash. The key itself stays in this\n" +
          "wallet's seed and is what a benefit claim proves knowledge of — never\n" +
          "send that, and never derive it from anything anyone else has seen."
      )
    );
    console.log();
  }

  if (wantsBalance) {
    await showBalance(secret);
  } else {
    console.log();
    // A seed is echoed because it was just printed above anyway; a phrase is
    // not, because it belongs to a wallet holding real funds and this output
    // ends up in scrollback, screenshots and issues.
    const echo = secret.kind === "seed" ? secret.value : '"<your 24 words>"';
    console.log(
      chalk.gray("After payday, check what arrived:\n") +
        chalk.yellow(`   npm run payee ${echo} -- --balance`)
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
