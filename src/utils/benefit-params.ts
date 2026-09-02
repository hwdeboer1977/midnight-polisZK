// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The rule sets published to the fund's benefit registry.
 *
 * Contract DATA, not contract code — the same arrangement as `tax-params.ts`,
 * and for a sharper reason here. The fund stores only
 * `persistentHash<BenefitParams>` in `paramsFor`, never the figures, so the
 * chain can *check* a rule set and cannot *tell you* one. A claimant has to
 * supply the whole struct to `claim`, which means these five numbers must reach
 * her from somewhere off chain. This file is that somewhere, and it is why the
 * values below are not a convenience copy: lose them and every claim against
 * that version fails with "those are not the published rules for that version",
 * with nothing on chain to reconstruct them from.
 *
 * ⚠️ Editing a published version silently breaks every claim under it. The
 * registry is append-only on purpose — a new schedule is a new version here and
 * a new `fund params` call, never an edit to one already published.
 *
 * The gap worth closing in a future deploy: `fund.compact` exposes pure circuits
 * for the tree hashes but not for this one, so nothing can check these values
 * against the hash on chain without reimplementing `persistentHash` over the
 * struct — the exact duplication `claim-tree.ts` exists to avoid. A
 * `benefitParamsHash` pure circuit would make the check one line. It needs a
 * redeploy, since verifier keys are fixed at deploy.
 */

/** Minor units per pEUR. Mirrors PEUR_DECIMALS = 6. */
const SCALE = 1_000_000n;

/** Basis points, so 7000 is 70%. */
export const BASIS_POINTS = 10_000n;

export interface BenefitParams {
  version: number;
  /** YYYYMM this version first applies to. */
  validFrom: number;
  /** The monthly gross a benefit is computed from, capped. Minor units. */
  maxMonthlyGross: bigint;
  /** Basis points of the capped gross. */
  rate: number;
  /** Months of employment required to claim. */
  minMonths: number;
  /**
   * Monthly windows one termination entitles her to.
   *
   * Part of the struct now, which is the whole point: `claim` asserts
   * `window < durationMonths`, so the figure the page shows and the figure the
   * contract allows are the same value. It used to be `PILOT_DURATION_MONTHS`
   * alone — a constant the UI honoured and the circuit never saw.
   */
  durationMonths: number;
}

/**
 * Version 1 — the pilot rule set, published 2026-08-25 in tx
 * `a99421c5ce1505633ea4b277fc087254ee83fba8a929d75e67306cc28bbcd226`.
 *
 *   cap    €4,000 / month
 *   rate   70% of the capped gross
 *   months 1
 *
 * ⚠️ `minMonths: 1` is a PILOT figure, not the scheme's. The rules this models
 * require twelve. One was chosen deliberately over the alternative — an employer
 * attesting twelve months against an instance whose public filings show one —
 * because a published rule set that says what it is stays honest, while a
 * fabricated attestation contradicts a record anybody can read. The real
 * schedule belongs in a version 2.
 *
 * The rate is also flat, where the scheme steps it down after the opening
 * months; `fund.compact` says so at `claim`, and modelling it needs a schedule
 * in the struct rather than a single rate.
 */
export const BENEFIT_V1: BenefitParams = {
  version: 1,
  validFrom: 200001,
  maxMonthlyGross: 4_000n * SCALE,
  rate: 7000,
  minMonths: 1,
  durationMonths: 3,
};

/** Every published version, newest last. */
export const PUBLISHED: BenefitParams[] = [BENEFIT_V1];

export function paramsForVersion(version: number): BenefitParams {
  const found = PUBLISHED.find((p) => p.version === version);
  if (!found) {
    throw new Error(
      `No rule set v${version} is recorded here. The fund stores only the hash, ` +
        "so a version published from another machine has to be added to " +
        "utils/benefit-params.ts before a claim under it can be built."
    );
  }
  return found;
}

/** The shape the generated `claim` binding wants for its `params` argument. */
/**
 * How many monthly windows one termination entitles a claimant to.
 *
 * ⚠️ PILOT SIMPLIFICATION. Three months for everyone, regardless of how long
 * they worked. The scheme this models derives duration from employment history
 * — months accrued per year worked, with a floor and a cap — and `leaf`
 * already carries the `monthsWorked` such a rule would read. A version 2 should
 * compute it; this is a placeholder chosen so the pilot has an answer, and it
 * is deliberately flat rather than a plausible-looking formula nobody sourced.
 *
 * ✅ NOW PART OF `BenefitParams`, and now enforced.
 *
 * It was neither. `claim` took `window` as an argument, put it in the nullifier
 * and asserted nothing about it, so this figure was what the app SHOWED and not
 * what the contract ALLOWED — a claimant calling the circuit directly passed
 * window 0, 1, 2, 3 … and drew a distinct nullifier, and a distinct payment,
 * for each. Everything else about them was genuine; only the NUMBER of payments
 * was theirs to choose.
 *
 * `claim` now asserts `window < params.durationMonths`, so the two agree by
 * construction rather than by nobody having tried. The cost was the one the old
 * note predicted: the struct hash changed, so every version had to be
 * republished and the fund redeployed.
 *
 * Read from the rule set rather than declared beside it, so the page cannot
 * show a duration the contract would refuse.
 */
export const PILOT_DURATION_MONTHS = BENEFIT_V1.durationMonths;

/**
 * The windows one termination entitles her to: the final month, then the next.
 *
 * Starting AT the final period rather than after it, because that is the month
 * the relay publishes a tree for and the month her bundle is built against — a
 * benefit that began the following month would leave her first window with no
 * published root to prove membership of.
 */
export function entitlementWindows(
  finalPeriod: number,
  months: number = PILOT_DURATION_MONTHS
): number[] {
  const windows: number[] = [];
  let period = finalPeriod;
  for (let i = 0; i < months; i += 1) {
    windows.push(period);
    const year = Math.floor(period / 100);
    const month = period % 100;
    period = month >= 12 ? (year + 1) * 100 + 1 : year * 100 + month + 1;
  }
  return windows;
}

export function toCircuitParams(p: BenefitParams) {
  return {
    version: BigInt(p.version),
    validFrom: BigInt(p.validFrom),
    maxMonthlyGross: p.maxMonthlyGross,
    rate: BigInt(p.rate),
    minMonths: BigInt(p.minMonths),
    durationMonths: BigInt(p.durationMonths),
  };
}

/**
 * The benefit a gross earns under one rule set — the cap first, then the rate.
 *
 * Mirrors `claim` branch for branch, including the floor division. Compact has
 * no `/`, so the circuit takes the quotient as a witness and pins it with
 * `q * 10000 <= n < (q + 1) * 10000`, which admits exactly one value. Computing
 * it here is not a licence to choose it: supply anything else and the claim
 * fails to prove.
 */
export function benefitFor(
  grossMinor: bigint,
  p: BenefitParams
): { capped: bigint; numerator: bigint; quotient: bigint } {
  const capped = grossMinor < p.maxMonthlyGross ? grossMinor : p.maxMonthlyGross;
  const numerator = capped * BigInt(p.rate);
  const quotient = numerator / BASIS_POINTS;
  if (quotient <= 0n) {
    throw new Error(
      `A gross of ${grossMinor} minor units rounds to no benefit under v${p.version} — ` +
        "`claim` asserts the benefit is greater than zero."
    );
  }
  return { capped, numerator, quotient };
}
