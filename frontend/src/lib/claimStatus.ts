// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { keyToHex } from "./keys";
import { loadContract } from "./contracts";
import { fromHex } from "./payslip";
import { PILOT_DURATION_MONTHS, entitlementWindows } from "../generated/benefit-params";

/**
 * Which benefit windows this claimant has already claimed.
 *
 * The page used to say this was unanswerable. That was the wrong conclusion
 * from a correct premise. The premise is that NOBODY ELSE may compute her
 * nullifiers — which is why `fund.compact` keys them on her secret claim key
 * rather than on her coin public key, and says so at length: a nullifier
 * derived from an address she hands out to be paid would let every employer she
 * ever had enumerate windows and read her benefit history off a public Set.
 *
 * None of that stops HER computing them. She is the one party who holds the
 * key. What was actually missing was a way to compute the hash without
 * reimplementing it — `claimNullifier` was not exposed as a pure circuit, and
 * `claim-tree.ts` records why a TypeScript copy of a contract hash is not an
 * acceptable substitute.
 *
 * ── Two properties this must not give up ───────────────────────────────────
 *
 * The check is LOCAL. The whole spent set is read and searched here. Asking an
 * indexer whether one particular nullifier is present would hand that indexer
 * the linkage the entire construction exists to deny it — the query itself
 * would be the disclosure, even though the answer is public.
 *
 * The claim key is never persisted. It arrives from her file, is used, and is
 * dropped with the component.
 *
 * ── Where the entitlement figure comes from ────────────────────────────────
 *
 * `PILOT_DURATION_MONTHS` — three months for everyone, a stated pilot
 * simplification rather than the scheme's rule, which derives duration from
 * employment history.
 *
 * It is APP policy, not contract policy, and that distinction matters here more
 * than anywhere else in this file. `BenefitParams` carries no duration, and
 * `claim` now asserts `window < params.durationMonths`, so a window outside the
 * entitlement is refused on chain rather than merely absent from this table.
 * Windows are zero-based indices; the month each one falls in is shown for
 * readability and is not what the circuit sees.
 *
 * So "2 remaining" means "2 remaining under the rule this app displays", not
 * "the fund would refuse a third". Which is why the scan does not stop at the
 * entitlement — it looks past it and reports anything found there. A claim
 * outside the three months is not something the chain prevents, so the honest
 * thing is to be able to see one.
 */

export interface WindowStatus {
  /** YYYYMM. */
  window: number;
  claimed: boolean;
}

export interface ClaimHistory {
  /** The entitlement windows, in order. What the table shows. */
  windows: WindowStatus[];
  /**
   * Claimed windows falling OUTSIDE the entitlement.
   *
   * Normally empty. Non-empty means a claim the app's rule does not account
   * for — which the contract permits today, so it is surfaced rather than
   * assumed impossible.
   */
  outside: WindowStatus[];
  /** How many entitlement windows carry her nullifier. */
  claimedCount: number;
  /** How many entitlement windows do not. */
  remaining: number;
  /** What the entitlement was measured against. */
  entitlementMonths: number;
  /**
   * `claimsPaid` from the fund's ledger: every claim by everyone, ever.
   *
   * Public already, and included because it is the honest denominator for what
   * she is looking at — it says nothing about which of them were hers.
   */
  claimsOnFund: number;
}

/** 202601 → 202602. Rolls the year rather than producing a month 13. */
export function nextPeriod(period: number): number {
  const year = Math.floor(period / 100);
  const month = period % 100;
  return month >= 12 ? (year + 1) * 100 + 1 : year * 100 + month + 1;
}

/**
 * How far past the entitlement to look for claims that should not exist.
 *
 * A year. Long enough that an extra claim shows up rather than sitting just
 * beyond the edge of the scan, short enough to stay a handful of local hashes.
 */
const OVERRUN_MONTHS = 12;

export async function readClaimHistory(options: {
  networkId: string;
  /** The fund's contract address, hex. */
  fundAddress: string;
  /** The connected wallet's coin public key, hex or Bech32m. */
  coinPublicKey: string;
  /** The month her employer attested as final. The entitlement starts here. */
  finalPeriod: number;
  entitlementMonths?: number;
}): Promise<ClaimHistory> {
  const { networkId, fundAddress, coinPublicKey, finalPeriod } = options;
  const entitlementMonths = options.entitlementMonths ?? PILOT_DURATION_MONTHS;

  const state = await fetchContractState(networkId, fundAddress);
  if (!state) throw new Error("The fund contract has no state on chain.");

  const fund = (await loadContract("fund")) as any;

  let ledger: any;
  try {
    ledger = fund.ledger(state.data);
    // Touched immediately, so a state that decodes against the wrong contract
    // fails here rather than reporting "not claimed" for everything — which
    // would be a wrong answer wearing the shape of a right one.
    void ledger.claimsPaid;
    void ledger.spent.size();
  } catch {
    throw new Error("The fund's state could not be read with this build of the contract.");
  }

  const fundBytes = fromHex(fundAddress.replace(/^0x/, ""));
  const payeeBytes = fromHex(keyToHex(coinPublicKey));

  // ⚠️ `window` is an INDEX now, not a period. `claim` asserts
  // `window < params.durationMonths`, which YYYYMM could never satisfy — and
  // the assert is the point: the number of windows is the published rule set's
  // answer rather than whatever the caller passes. The month each index falls
  // in is still shown, from `entitlementWindows`, because an index is not a
  // thing anybody wants to read.
  const isClaimed = (index: number): boolean =>
    ledger.spent.member(
      fund.pureCircuits.claimNullifier({ bytes: payeeBytes }, BigInt(index), fundBytes)
    ) as boolean;

  const entitlement = entitlementWindows(finalPeriod, entitlementMonths);
  const windows = entitlement.map((period, index) => ({
    window: period,
    index,
    claimed: isClaimed(index),
  }));

  // Nothing can fall outside the entitlement any more: a window at or beyond
  // `durationMonths` is refused by the circuit, so there is no set of stray
  // nullifiers left to go looking for.
  const outside: WindowStatus[] = [];

  const claimedCount = windows.filter((entry) => entry.claimed).length;

  return {
    windows,
    outside,
    claimedCount,
    remaining: windows.length - claimedCount,
    entitlementMonths,
    claimsOnFund: Number(ledger.claimsPaid),
  };
}
