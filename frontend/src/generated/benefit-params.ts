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
   * How many calendar months after the final period can be claimed.
   *
   * Part of the struct, which is the whole point: `claim` admits exactly these
   * months, so the figure the page shows and the figure the contract allows are
   * the same value. It used to be `PILOT_DURATION_MONTHS` alone — a constant the
   * UI honoured and the circuit never saw.
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
 * How many calendar months one termination entitles a claimant to, under v1.
 *
 * ⚠️ PILOT SIMPLIFICATION. Three months for everyone, regardless of how long
 * they worked. The scheme this models derives duration from employment history
 * — months accrued per year worked, with a floor and a cap — and `leaf`
 * already carries the `monthsWorked` such a rule would read. A version 2 should
 * compute it; this is a placeholder chosen so the pilot has an answer, and it
 * is deliberately flat rather than a plausible-looking formula nobody sourced.
 *
 * ✅ PART OF `BenefitParams`, and enforced.
 *
 * It was neither at first. `claim` took a window number, put it in the
 * nullifier and asserted nothing about it, so this figure was what the app
 * SHOWED and not what the contract ALLOWED — a claimant calling the circuit
 * directly passed 0, 1, 2, 3 … and drew a distinct payment for each.
 *
 * `claim` now names a calendar month instead: one of the `durationMonths`
 * after the final period, already begun, once per wallet. The figure the page
 * shows and the months the contract admits agree by construction.
 *
 * Read from the rule set rather than declared beside it, so the page cannot
 * show a duration the contract would refuse. A real claim uses the rules
 * recorded for its final period on the fund — see `recordedParams`.
 */
export const PILOT_DURATION_MONTHS = BENEFIT_V1.durationMonths;

/** 202601 → 202602. Rolls the year rather than producing a month 13. */
export function nextPeriod(period: number): number {
  const year = Math.floor(period / 100);
  const month = period % 100;
  return month >= 12 ? (year + 1) * 100 + 1 : year * 100 + month + 1;
}

/**
 * The calendar months a termination entitles her to claim: the months AFTER
 * the final period, as many as the rule set's `durationMonths`.
 *
 * After, not including, the final period. That month was paid as salary —
 * `endEmployment` refuses to attest a month that was not — so a benefit for it
 * would pay the same month twice, and `claim` refuses it. Every claim still
 * proves membership of the FINAL period's tree, whichever month it names, so
 * starting later needs no other root.
 */
export function entitlementPeriods(
  finalPeriod: number,
  months: number = PILOT_DURATION_MONTHS
): number[] {
  const periods: number[] = [];
  let period = finalPeriod;
  for (let i = 0; i < months; i += 1) {
    period = nextPeriod(period);
    periods.push(period);
  }
  return periods;
}

/**
 * The first second of a YYYYMM month in UTC, as seconds since 1970 — what
 * `claim` compares the block time against. The fund's `monthStart` pure circuit
 * computes the same value, and `tests/claim-nullifier.test.mjs` checks the two
 * agree.
 */
export function monthStartSeconds(period: number): number {
  return Date.UTC(Math.floor(period / 100), (period % 100) - 1, 1) / 1000;
}

/**
 * The `calendar` argument `claim` takes for one month of one termination.
 *
 * Compact has no division, so the circuit is handed the year/month split and
 * the leap-year quotients and pins each to the one value that fits. Computing
 * them here is not a licence to choose them: anything else fails to prove.
 */
export function claimCalendar(finalPeriod: number, claimPeriod: number) {
  const year = Math.floor(claimPeriod / 100);
  return {
    finalYear: BigInt(Math.floor(finalPeriod / 100)),
    finalMonth: BigInt(finalPeriod % 100),
    year: BigInt(year),
    month: BigInt(claimPeriod % 100),
    q4: BigInt(Math.floor(year / 4)),
    q100: BigInt(Math.floor(year / 100)),
    q400: BigInt(Math.floor(year / 400)),
  };
}

/**
 * The published rule set whose hash is `recorded` — the one the platform pinned
 * to a final period in the fund's `paramsHashFor` — or null if no version known
 * here hashes to it.
 *
 * The hash function is passed in so this file stays free of contract imports
 * (it is copied into the frontend). Callers pass the fund's own
 * `benefitParamsHash` pure circuit, never a TypeScript reimplementation.
 */
export function recordedParams(
  recorded: Uint8Array,
  hashOf: (params: ReturnType<typeof toCircuitParams>) => Uint8Array
): BenefitParams | null {
  const hex = (bytes: Uint8Array) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const want = hex(recorded);
  return PUBLISHED.find((p) => hex(hashOf(toCircuitParams(p))) === want) ?? null;
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
