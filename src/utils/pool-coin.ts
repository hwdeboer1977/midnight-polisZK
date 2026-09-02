// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { getDeployment } from "./deployments.js";
import { listDeposits } from "./fund-pool.js";
import { contractLeaves } from "./contract.js";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { EnvironmentManager } from "./environment.js";

/**
 * A fund coin a claimant can spend, without a bundle file.
 *
 * ── Why this cannot be derived in a browser ────────────────────────────────
 *
 * Everything else a claim needs is reachable from the chain plus her own
 * wallet: the leaf she reconstructs, the path she builds from the period's
 * digests, the root and rule-set version she reads from `rootFor` and
 * `paramsFor`. The coin is the exception. `receiveShielded` puts a coin in the
 * fund's ownership and the chain records that it exists — but not its nonce or
 * its value, which is exactly the point of a shielded coin. Those live in
 * `fund-pool.json`, written when the deposit was made.
 *
 * So this endpoint is the last thing standing between a claimant and needing no
 * file at all, and it hands out the two fields the chain withholds.
 *
 * ── What it does NOT disclose ──────────────────────────────────────────────
 *
 * Nothing about who is asking. A request names a period and gets a coin; it
 * does not say which leaf in that period is the caller's, which is the anonymity
 * the claim tree exists to provide. `claim` proves membership without
 * disclosing the leaf, and an endpoint that identified the claimant would give
 * away off chain exactly what the circuit protects on chain.
 *
 * ⚠️ **Do not log these requests.** A period, an IP and a timestamp is a
 * claim-timing record, and it would reconstruct off chain the linkage the rest
 * of this design pays to avoid. Stated here because it is a policy, not a
 * mechanism — nothing in the code enforces it, so the next person to add
 * request logging has to read this and decide deliberately.
 *
 * ── Allocation, and what this deliberately does not do yet ─────────────────
 *
 * A claim spends the WHOLE coin it names — `sendShielded` splits it, the
 * claimant gets the net benefit and the fund gets the change back as a NEW
 * coin. So two claimants handed the same coin race for a spent input, and the
 * loser sees node error 103, which does not say so.
 *
 * The fund holds many coins — one per deposit, plus a change coin per settled
 * claim — so the fix is to hand out different ones. This returns the largest
 * available, and takes no lease: with a single claimant in a period there is
 * nothing to race, which is the pilot's case. A lease with an expiry is the
 * shape for more than one, and belongs here when that day comes.
 */
export interface PoolCoin {
  nonce: string;
  color: string;
  value: string;
  mtIndex: number;
}

export async function findPoolCoin(networkId: string): Promise<{
  coin: PoolCoin | null;
  fund: string | null;
  /** Set when the pool file is behind the chain — see `runRelay` for why. */
  warning: string | null;
}> {
  const network = EnvironmentManager.getNetworkConfig();
  const fundRecord = getDeployment(networkId, "fund");
  if (!fundRecord) return { coin: null, fund: null, warning: null };

  const recorded = listDeposits(networkId, fundRecord.contractAddress)
    .filter((d) => d.status === "confirmed" && d.ordinal !== null)
    // Largest first, for the same reason `runRelay` sorts this way: a claimant
    // left with a coin too small to cover their benefit is a deposit away from
    // claiming rather than a retry away.
    .sort((a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : -1));

  if (recorded.length === 0) {
    return {
      coin: null,
      fund: fundRecord.contractAddress,
      warning:
        "This fund has no recorded deposits, so there is no coin to claim against. " +
        "Deposit into it first — a fund with nothing in it fails at `benefitTokenSet`.",
    };
  }

  const leaves = await contractLeaves(
    indexerPublicDataProvider(network.indexer, network.indexerWS) as any,
    fundRecord.contractAddress
  );

  const usable = recorded
    .map((d) => ({ deposit: d, mtIndex: leaves[d.ordinal as number] }))
    .find((c) => c.mtIndex !== undefined);

  if (!usable) {
    return {
      coin: null,
      fund: fundRecord.contractAddress,
      warning:
        "Recorded fund coins have no visible leaf yet — the indexer may be behind. Try again shortly.",
    };
  }

  return {
    coin: {
      nonce: usable.deposit.nonce,
      color: usable.deposit.color,
      value: usable.deposit.value,
      mtIndex: usable.mtIndex as number,
    },
    fund: fundRecord.contractAddress,
    warning: null,
  };
}
