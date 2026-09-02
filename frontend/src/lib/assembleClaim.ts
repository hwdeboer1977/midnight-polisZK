// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { keyToHex, bytesToHex } from "./keys";
import { fromHex } from "./payslip";
import { apiUrl } from "./origin";
import { readClaimTree } from "./rebuildOpening";
import { indexOfDigest, ownLeafDigest, pathFromDigests } from "./claimTree";
import type { ClaimBundle } from "./claim";

/**
 * A claim bundle, assembled in the browser instead of handed over as a file.
 *
 * ── What this replaces ─────────────────────────────────────────────────────
 *
 * The employer used to build a bundle at termination and send it. That put them
 * in the claim path, and the file went stale on its own: a bundle names a fund
 * coin, and any earlier claimant spending that coin invalidates it. A bundle
 * handed over in September is likely worthless by the time she claims in
 * November — so she was going to need a fresh one anyway.
 *
 * Everything in it is now reachable without them:
 *
 *   leaf          → reconstructed here, from chain and her wallet
 *   path, root    → built from the period's digests (`/api/claim-tree`)
 *   fund, version → read from the chain
 *   pool coin     → `/api/pool-coin`, the one field a browser cannot derive
 *
 * ── Why she can identify her own leaf ──────────────────────────────────────
 *
 * Nobody tells her which row is hers, and nobody has to: she recomputes her own
 * digest and looks for the match. `commitmentsFor` and `payeeFor` are public,
 * the payee binding needs her own key, and `monthsWorked` is a count of her own
 * periods. Being told would be worse — it would mean the service knew.
 */
export interface AssembledClaim {
  bundle: ClaimBundle;
  /** Set when something is missing but nameable. */
  warning: string | null;
}

interface PoolCoinResponse {
  coin: { nonce: string; color: string; value: string; mtIndex: number } | null;
  fund: string | null;
  warning: string | null;
}

async function readPoolCoin(networkId: string): Promise<PoolCoinResponse> {
  try {
    const response = await fetch(
      apiUrl(`/api/pool-coin?networkId=${encodeURIComponent(networkId)}`),
      { cache: "no-store" }
    );
    if (!response.ok) return { coin: null, fund: null, warning: null };
    return (await response.json()) as PoolCoinResponse;
  } catch {
    return {
      coin: null,
      fund: null,
      warning: "The service is not reachable, so no fund coin could be fetched.",
    };
  }
}

/**
 * Assembles everything a claim needs for one terminated period.
 *
 * Throws with a named cause rather than returning a half-built bundle: every
 * failure here is something a claimant can act on — a root not yet published, a
 * fund not yet funded — and a bundle missing a field would fail later inside
 * proving, where the message is "assertion failed".
 */
export async function assembleClaim(options: {
  networkId: string;
  /** The payroll this termination is on. */
  contractAddress: string;
  /** Her coin public key, hex or Bech32m. */
  coinPublicKey: string;
  /** The month her employer attested as final. */
  finalPeriod: number;
}): Promise<AssembledClaim> {
  const { networkId, contractAddress, coinPublicKey, finalPeriod } = options;

  const state = await fetchContractState(networkId, contractAddress);
  if (!state) throw new Error("That payroll contract has no state on chain.");

  const payroll = await loadContract("payroll");
  const ledger = decodePayrollLedger(payroll, state.data);
  if (!ledger) throw new Error("That payroll's state could not be read with this build.");

  const instanceBytes = fromHex(contractAddress.replace(/^0x/, ""));
  const myKey = fromHex(keyToHex(coinPublicKey));
  const binding = (period: bigint): string =>
    bytesToHex(
      (payroll as any).pureCircuits.payeeHash({ bytes: myKey }, period, instanceBytes)
    );

  // Her slot in the final period, and how many months she appears in — counted
  // exactly as the employer counted it when the attestation was signed, from
  // the same public source, so the numbers agree by construction.
  let slot = -1;
  let monthsWorked = 0;
  for (const period of [...ledger.periods].sort((a, b) => (a < b ? -1 : 1))) {
    if (!ledger.payeeFor.member(period)) continue;
    const payees = ledger.payeeFor.lookup(period);
    const count = ledger.employeeCountFor.member(period)
      ? Number(ledger.employeeCountFor.lookup(period))
      : 0;
    const mine = binding(period);
    for (let i = 0; i < count; i += 1) {
      const key = BigInt(i);
      if (!payees.member(key)) continue;
      if (bytesToHex(payees.lookup(key)) !== mine) continue;
      monthsWorked += 1;
      if (Number(period) === finalPeriod) slot = i;
    }
  }

  if (slot < 0) {
    throw new Error(
      `No slot in ${finalPeriod} on this payroll matches your wallet. A different ` +
        "wallet produces a different hash and matches nothing."
    );
  }

  const period = BigInt(finalPeriod);
  if (!ledger.commitmentsFor.member(period) || !ledger.commitmentsFor.lookup(period).member(BigInt(slot))) {
    throw new Error(`No salary commitment was filed for your slot in ${finalPeriod}.`);
  }
  const commitment = bytesToHex(ledger.commitmentsFor.lookup(period).lookup(BigInt(slot)));

  const leaf = {
    commitment: fromHex(commitment),
    payeeBinding: fromHex(binding(period)),
    finalPeriod: period,
    monthsWorked: BigInt(monthsWorked),
    instance: instanceBytes,
  };

  const digest = await ownLeafDigest(leaf);

  const tree = await readClaimTree(networkId, finalPeriod);
  if (!tree) {
    // ⚠️ Not "your employment has not ended yet". By the time this runs the
    // termination is already on chain — that is what put this period in the
    // ended list in the first place. Publishing the tree is a SECOND step that
    // normally happens in the same action and can fail on its own, and saying
    // otherwise sends a claimant to ask their employer to do something they
    // have already done.
    throw new Error(
      `Your employment ending for ${finalPeriod} is recorded on chain, but the ` +
        "claim tree for that month has not been published. That is a separate " +
        "step your employer's app does at the same time, and it can fail on its " +
        "own — ask them to publish the claim tree for that period. Nothing is " +
        "lost: the termination stands and publishing can be redone at any time."
    );
  }

  const index = indexOfDigest(tree.leafDigests, digest);
  if (index < 0) {
    // Worth naming precisely: the tree exists but does not contain her. The
    // usual cause is a tree built before her termination was relayed.
    throw new Error(
      `The published claim tree for ${finalPeriod} does not contain your ` +
        "termination. Ask your employer to re-run the relay for that month."
    );
  }

  const { path, root } = await pathFromDigests(tree.leafDigests, index);
  if (root.toString() !== tree.root) {
    throw new Error(
      "The path rebuilt from the published digests does not reproduce the " +
        "published root. The digest list may be stale — try again, and if it " +
        "persists the period needs re-relaying."
    );
  }

  const pool = await readPoolCoin(networkId);

  return {
    warning: pool.warning,
    bundle: {
      period: finalPeriod,
      instance: contractAddress,
      slot,
      root: tree.root,
      leaf: {
        commitment,
        payeeBinding: binding(period),
        finalPeriod,
        monthsWorked,
        instance: contractAddress,
      },
      leafDigest: bytesToHex(digest),
      path: path.path.map((entry) => ({
        sibling: entry.sibling.toString(),
        goesLeft: entry.goesLeft,
      })),
      fund: pool.fund,
      // The newest published rule set. `claim` pins it against `paramsFor`, so
      // a wrong guess fails there rather than silently.
      paramsVersion: 1,
      poolCoin: pool.coin,
    },
  };
}
