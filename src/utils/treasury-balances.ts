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
  /** Why it could not be read — an unset seed, usually. Never the seed itself. */
  error?: string;
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

        log(
          `   ${from}: €${formatPeur(held)} pEUR` +
            (night > 0n ? "" : " — and no NIGHT, so it cannot pay a fee to spend it")
        );
        out.push({ from, minor: held.toString(), nightMinor: night.toString() });
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
      out.push({ from, minor: null, nightMinor: null, error: message });
    }
  }

  return out;
}
