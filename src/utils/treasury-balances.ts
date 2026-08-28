import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { EnvironmentManager } from "./environment.js";
import { benefitTokenColour, treasurySecret, type TreasuryName } from "./fund-deposit.js";
import { buildWallet, currentState, waitForSync } from "./wallet.js";
import { formatPeur } from "./constructor-args.js";

/**
 * What each treasury wallet actually holds, in pEUR.
 *
 * The deposit route already refuses an amount the wallet cannot cover — but it
 * refuses it after the operator has typed a figure and pressed a button, which
 * makes "how much is in there?" a question answered only by guessing wrong.
 * `remitTax` and `remitSocial` put a period's pools into these wallets and
 * nothing reports the result, so the amount to deposit was being reconstructed
 * from the payroll totals by hand.
 *
 * ⚠️ This has to BUILD each wallet and sync it. A shielded balance is not
 * public: it is the sum of the coins that wallet can decrypt, so there is no
 * indexer query that answers this and no way to read it without the spending
 * key. That is also why it runs as a job — first sync after a restart is
 * minutes, and a resumed one is seconds.
 */
export interface TreasuryBalance {
  from: TreasuryName;
  /** Minor units as a string, because JSON has no bigint. Null when unreadable. */
  minor: string | null;
  /**
   * Unshielded NIGHT held by the same wallet, as a string.
   *
   * Reported beside the pEUR because holding one without the other is a wallet
   * that cannot spend what it holds, and nothing said so. A treasury only ever
   * RECEIVES — `remitTax` and `remitSocial` send it pEUR and nothing sends it
   * NIGHT — so the natural state of a fresh treasury is a balance it cannot
   * move. That failed deep inside the balancer, as `Insufficient funds for
   * fallible segment N`, naming a segment number and no wallet.
   */
  nightMinor: string | null;
  /**
   * The most that can actually be moved in ONE transaction, minor units.
   *
   * Lower than `minor` whenever the wallet holds two coins of the same value,
   * and the gap is not cosmetic — see `spendableMax`. Offering the balance as a
   * Max would fill an amount the balancer cannot reach.
   */
  spendableMinor: string | null;
  /** Why it could not be read — an unset seed, usually. Never the seed itself. */
  error?: string;
}

/**
 * The largest amount the balancer can assemble from these coins, in one go.
 *
 * ⚠️ This is not the balance, and the difference is a defect in the SDK rather
 * than a property of the money.
 *
 * `getBalanceRecipe` (wallet-sdk-capabilities/balancer/Balancer.js) consumes a
 * coin and then drops every candidate matching it:
 *
 * ```js
 * counterOffer.addInput(coin);
 * coins = coins.filter((c) => !isCoinEqual(c, coin));
 * ```
 *
 * and the shielded wallet passes `isCoinEqual: (a, b) => a.type === b.type &&
 * a.value === b.value` — **value equality, with no nonce**. Two coins of the
 * same value are therefore indistinguishable to it, and spending one discards
 * the other. A treasury collects identical amounts as a matter of course: the
 * same payroll remits the same withholding every month, so €200.20 arriving
 * twice is the normal case, not a coincidence.
 *
 * This simulates that loop exactly — `chooseCoin` takes the smallest, the
 * filter removes every coin of that value — so the figure is what the balancer
 * will actually reach rather than an estimate of it. Effectively the sum of the
 * DISTINCT values present.
 *
 * The rest of the balance is not lost; it needs another transaction, whose
 * change will carry values unlikely to collide again.
 */
export function spendableMax(
  coins: readonly { type: string; value: bigint }[],
  tokenType: string
): bigint {
  let pool = coins.filter((coin) => coin.type === tokenType);
  let total = 0n;
  while (pool.length > 0) {
    const chosen = [...pool].sort((a, b) => Number(a.value - b.value))[0];
    total += chosen.value;
    pool = pool.filter((coin) => !(coin.type === chosen.type && coin.value === chosen.value));
  }
  return total;
}

/** NIGHT's unshielded token type: all zeroes. */
const NIGHT = "0".repeat(64);

export async function readTreasuryBalances(options?: {
  /** Which wallets to read. Defaults to the two treasuries; the platform is a top-up. */
  wallets?: TreasuryName[];
  log?: (line: string) => void;
}): Promise<TreasuryBalance[]> {
  const wallets = options?.wallets ?? ["social-treasury", "tax-treasury"];
  const log = options?.log ?? (() => {});

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  // Read once, not per wallet: it is the same token in every case, and it is an
  // indexer round trip plus a ledger decode.
  const colourHex = Buffer.from(await benefitTokenColour(network)).toString("hex");

  const out: TreasuryBalance[] = [];
  // Sequentially, deliberately. These sync against the same indexer and each
  // holds a wallet runtime open; three at once is three times the load for an
  // answer nobody is waiting on in parallel.
  for (const from of wallets) {
    try {
      const secret = treasurySecret(from);
      log(`Reading the ${from} wallet…`);
      const wallet = await buildWallet(secret, network);
      try {
        await waitForSync(wallet, (line: string) => log(`   ${line}`));
        const state = await currentState(wallet);
        const balances = (state.shielded as any).balances as Record<string, bigint>;
        const held = balances[colourHex] ?? balances[`0x${colourHex}`] ?? 0n;

        const unshielded = ((state.unshielded as any).balances ?? {}) as Record<string, bigint>;
        const night = unshielded[NIGHT] ?? unshielded[`0x${NIGHT}`] ?? 0n;

        // The individual coins, not just their sum. `state.state` is the
        // shielded wallet's view and `.state` inside it is the Zswap state
        // itself, whose `coins` getter is what the balancer is handed.
        const coins = [...((state.shielded as any).state?.state?.coins ?? [])] as {
          type: string;
          value: bigint;
        }[];
        const spendable = spendableMax(coins, colourHex);

        log(
          `   ${from}: €${formatPeur(held)} pEUR in ${coins.length} coin(s)` +
            (spendable < held ? `, of which €${formatPeur(spendable)} is reachable at once` : "") +
            (night > 0n ? "" : " — and no NIGHT, so it cannot pay a fee to spend it")
        );
        out.push({
          from,
          minor: held.toString(),
          spendableMinor: spendable.toString(),
          nightMinor: night.toString(),
        });
      } finally {
        // Always stopped, including when the sync throws. A wallet runtime left
        // running holds an indexer subscription open for the life of the
        // process, and this route is the one that would open a new one per
        // press of a button.
        await wallet.facade.stop();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      log(`   ${from}: could not be read — ${message}`);
      // One unreadable wallet must not take the other down: a service with only
      // SOCIAL_TREASURY_SEED set should still be told what the social treasury
      // holds.
      out.push({ from, minor: null, spendableMinor: null, nightMinor: null, error: message });
    }
  }

  return out;
}
