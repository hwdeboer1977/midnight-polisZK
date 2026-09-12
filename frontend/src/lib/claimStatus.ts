// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { keyToHex } from "./keys";
import { loadContract } from "./contracts";
import { fromHex } from "./payslip";
import {
  PILOT_DURATION_MONTHS,
  entitlementPeriods,
  monthStartSeconds,
  recordedParams,
} from "../generated/benefit-params";

/**
 * Which benefit months this claimant has claimed, and which she can claim now.
 *
 * ── Keyed on her wallet, and what that costs ───────────────────────────────
 *
 * The fund's nullifier is `hash(ownPublicKey, month, fund)`. The connected
 * wallet is therefore the whole input, and the answer needs no file — but the
 * same is true for anyone holding her coin public key, which is an address she
 * hands out to be paid. `fund.compact` records that trade on `ClaimNullifier`.
 *
 * ── Two properties this must not give up ───────────────────────────────────
 *
 * The check is LOCAL. The whole spent set is read and searched here. Asking an
 * indexer whether one particular nullifier is present would hand that indexer
 * the linkage directly — the query itself would be the disclosure, even though
 * the answer is public.
 *
 * The hash is the contract's own. `claimNullifier` is a pure circuit, so a
 * TypeScript copy of the struct encoding never gets the chance to drift.
 *
 * ── Where the entitlement comes from ───────────────────────────────────────
 *
 * The rule set the platform recorded for her FINAL period in `paramsHashFor`,
 * matched to published figures by hash. `claim` enforces exactly these months
 * and refuses one that has not started by the block's clock, so this table is
 * the contract's answer rather than an app policy.
 */

export interface MonthStatus {
  /** YYYYMM. */
  period: number;
  claimed: boolean;
  /** Whether the month has begun (UTC). Before then `claim` refuses it. */
  started: boolean;
  /** When the month opens, in seconds since 1970. */
  opensAt: number;
}

export interface ClaimHistory {
  /** The entitlement months, in order. What the table shows. */
  months: MonthStatus[];
  /** How many of them carry her nullifier. */
  claimedCount: number;
  /** How many do not. */
  remaining: number;
  /** The rule set's `durationMonths`, or the pilot figure when it is unknown. */
  entitlementMonths: number;
  /** The earliest unclaimed month that has started — the one a claim should name. */
  nextClaimable: number | null;
  /** The earliest unclaimed month that has NOT started yet, if any. */
  nextOpening: MonthStatus | null;
  /**
   * `claimsPaid` from the fund's ledger: every claim by everyone, ever.
   *
   * Public already, and included because it is the honest denominator for what
   * she is looking at.
   */
  claimsOnFund: number;
  /**
   * False when the fund has no rule set recorded for the final period, or this
   * build does not know the figures of the one it has. The months shown then
   * assume the pilot duration, and no claim can be made until it is resolved.
   */
  rulesKnown: boolean;
}

export async function readClaimHistory(options: {
  networkId: string;
  /** The fund's contract address, hex. */
  fundAddress: string;
  /** The connected wallet's coin public key, hex or Bech32m. */
  coinPublicKey: string;
  /** The month her employer attested as final. The entitlement starts after it. */
  finalPeriod: number;
  /** Milliseconds since 1970; defaults to now. */
  nowMs?: number;
}): Promise<ClaimHistory> {
  const { networkId, fundAddress, coinPublicKey, finalPeriod } = options;

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
    void ledger.paramsHashFor.size();
  } catch {
    throw new Error("The fund's state could not be read with this build of the contract.");
  }

  const fundBytes = fromHex(fundAddress.replace(/^0x/, ""));
  const payeeBytes = fromHex(keyToHex(coinPublicKey));

  const finalKey = BigInt(finalPeriod);
  let entitlementMonths = PILOT_DURATION_MONTHS;
  let rulesKnown = false;
  if (ledger.paramsHashFor.member(finalKey)) {
    const params = recordedParams(ledger.paramsHashFor.lookup(finalKey), (p) =>
      fund.pureCircuits.benefitParamsHash(p)
    );
    if (params) {
      entitlementMonths = params.durationMonths;
      rulesKnown = true;
    }
  }

  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const months: MonthStatus[] = entitlementPeriods(finalPeriod, entitlementMonths).map(
    (period) => {
      const opensAt = monthStartSeconds(period);
      return {
        period,
        claimed: ledger.spent.member(
          fund.pureCircuits.claimNullifier({ bytes: payeeBytes }, BigInt(period), fundBytes)
        ) as boolean,
        started: nowSeconds >= opensAt,
        opensAt,
      };
    }
  );

  const claimedCount = months.filter((entry) => entry.claimed).length;

  return {
    months,
    claimedCount,
    remaining: months.length - claimedCount,
    entitlementMonths,
    nextClaimable: months.find((entry) => !entry.claimed && entry.started)?.period ?? null,
    nextOpening: months.find((entry) => !entry.claimed && !entry.started) ?? null,
    claimsOnFund: Number(ledger.claimsPaid),
    rulesKnown,
  };
}

/** A month's opening date for display: "1 November 2026". UTC, as the fund counts it. */
export function openingDate(opensAt: number): string {
  return new Date(opensAt * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
