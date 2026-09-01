// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The rule set seeded into the `taxparams` registry.
 *
 * Contract DATA, not contract code: the circuit computes from whatever version
 * a period was filed under, and these are the numbers for the first one. They
 * live here so the deploy script, the frontend and any reviewer read the
 * identical values.
 *
 * Published thresholds are annual; a payroll period is a month, so each is
 * divided by twelve. Both divide exactly — €38,883/yr is €3,240.25/mo and
 * €78,426/yr is €6,535.50/mo — so nothing is lost converting them, which is
 * worth having checked rather than assumed.
 */

/** Minor units per pEUR. Mirrors PEUR_DECIMALS = 6. */
const SCALE = 1_000_000n;

/** Basis points, so 3575 is 35.75%. */
export const BASIS_POINTS = 10_000n;

export interface TaxParams {
  version: number;
  /** YYYYMM this version first applies to. */
  validFrom: number;
  /** Monthly, minor units. */
  threshold1: bigint;
  threshold2: bigint;
  /** Basis points. */
  rate1: number;
  rate2: number;
  rate3: number;
  /** Monthly ceiling on the contribution base, minor units. */
  maxContribBase: bigint;
  contribRate: number;
}

const monthly = (annualEuros: number): bigint => {
  const minorPerYear = BigInt(annualEuros) * SCALE;
  if (minorPerYear % 12n !== 0n) {
    throw new Error(`€${annualEuros}/yr does not divide into whole monthly minor units`);
  }
  return minorPerYear / 12n;
};

/**
 * Version 1 — Dutch bands as supplied.
 *
 *   band 1   up to €38,883      35.75%
 *   band 2   €38,883 – €78,426  37.56%
 *   band 3   above €78,426      49.50%
 *   contribution                 3.00%
 *
 * ⚠️ `maxContribBase` is a placeholder. No ceiling was specified for the 3%
 * contribution, so this is set above any salary this system will see, which
 * makes it effectively uncapped. A real schedule almost certainly caps it, and
 * capping it later means publishing a new version rather than editing this one
 * — the registry is append-only on purpose.
 */
export const DUTCH_V1: TaxParams = {
  version: 1,
  validFrom: 202601,
  threshold1: monthly(38_883),
  threshold2: monthly(78_426),
  rate1: 3575,
  rate2: 3756,
  rate3: 4950,
  maxContribBase: 1_000_000n * SCALE,
  contribRate: 300,
};

/**
 * The same arithmetic the circuit performs, for checking a filing before it is
 * proved and for showing an employer what a roster will produce.
 *
 * Per employee, then summed — never a rate reapplied to a total. Floor division
 * does not distribute: rounding each person's tax and adding gives a different
 * figure from taxing the sum, by up to one minor unit per employee.
 */
/**
 * The three bracket bands, split out so the differential test has something to
 * call. Every branch here has a counterpart in `bandsFor`.
 */
export function bands(grossMinor: bigint, t1: bigint, t2: bigint): [bigint, bigint, bigint] {
  const band1 = grossMinor < t1 ? grossMinor : t1;
  const band2 = grossMinor <= t1 ? 0n : (grossMinor < t2 ? grossMinor : t2) - t1;
  const band3 = grossMinor <= t2 ? 0n : grossMinor - t2;
  return [band1, band2, band3];
}

export function computeLine(grossMinor: bigint, p: TaxParams) {
  const t1 = p.threshold1;
  const t2 = p.threshold2;

  // Mirrors `bandsFor` in payroll.compact branch for branch. The circuit
  // exposes that as a pure circuit precisely so this can be tested against it
  // rather than reviewed alongside it — see tests/bands.test.mjs.
  const [band1, band2, band3] = bands(grossMinor, t1, t2);

  const taxNumerator =
    band1 * BigInt(p.rate1) + band2 * BigInt(p.rate2) + band3 * BigInt(p.rate3);
  const taxMinor = taxNumerator / BASIS_POINTS;

  const contribBase = grossMinor < p.maxContribBase ? grossMinor : p.maxContribBase;
  const contribNumerator = contribBase * BigInt(p.contribRate);
  const contribMinor = contribNumerator / BASIS_POINTS;

  const netMinor = grossMinor - taxMinor - contribMinor;
  if (netMinor < 0n) throw new Error("tax and contribution exceed gross");

  return {
    grossMinor,
    bands: [band1, band2, band3] as [bigint, bigint, bigint],
    taxMinor,
    contribMinor,
    netMinor,
    // The quotients the circuit needs as private inputs: Compact has no
    // division, so each is witnessed and pinned by q*10000 <= n < (q+1)*10000.
    taxQuotient: taxMinor,
    contribQuotient: contribMinor,
    taxNumerator,
    contribNumerator,
  };
}
