// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { getDeployment } from "./deployments.js";
import { loadCompiledContract } from "./contract.js";
import { DUTCH_V1 } from "./tax-params.js";

/**
 * Which periods a freshly deployed payroll contract can file against.
 *
 * A payroll contract cannot read the rule registry — contracts cannot read each
 * other's state — so the platform records the rule-set hash per period. A
 * contract with none recorded is deployed, assigned, owned by its employer, and
 * unable to file anything: `setPayroll` rejects every period with "no rule set
 * recorded for that period".
 *
 * So onboarding has to open something, and the unit is the calendar year.
 * Schedules are annual — every month of 2026 carries the identical hash — and
 * `setParamsFor` takes a range, so `(year, 1, 12)` writes all twelve in one
 * transaction. The old six-month rolling window bought nothing but five extra
 * proofs and a cliff that landed four months after whoever signed up, rather
 * than on 1 January where it can be seen coming.
 *
 * Deliberately the CURRENT year and no further. Opening a month decides which
 * schedule it is filed under, and that decision is write-once — so opening 2027
 * today would permanently bind next year to this year's rates, before anyone
 * has published next year's. A year is opened once its schedule is known.
 */

/** The calendar year a filing is being opened for. */
export function filingYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

/** Every YYYYMM in a calendar year, January first. */
export function monthsOf(year: number): number[] {
  return Array.from({ length: 12 }, (_, i) => year * 100 + i + 1);
}

/**
 * The hash of the rule set, computed with the registry's own pure circuit.
 *
 * Read from the deployed registry rather than recomputed independently: if the
 * two ever disagree, a filing fails with "these are not the rules recorded for
 * that period", which names the symptom and not the cause.
 */
export async function ruleSetHash(networkId: string): Promise<Uint8Array> {
  const registry = getDeployment(networkId, "taxparams");
  if (!registry) {
    throw new Error(
      "No taxparams registry on this network. Deploy it first with `npm run deploy:tax` — " +
        "a payroll contract cannot file a period until its rule set is recorded."
    );
  }
  const { contractModule } = await loadCompiledContract("taxparams");
  return (contractModule as any).pureCircuits.paramsHash({
    version: BigInt(DUTCH_V1.version),
    validFrom: BigInt(DUTCH_V1.validFrom),
    threshold1: DUTCH_V1.threshold1,
    threshold2: DUTCH_V1.threshold2,
    rate1: BigInt(DUTCH_V1.rate1),
    rate2: BigInt(DUTCH_V1.rate2),
    rate3: BigInt(DUTCH_V1.rate3),
    maxContribBase: DUTCH_V1.maxContribBase,
    contribRate: BigInt(DUTCH_V1.contribRate),
  });
}
