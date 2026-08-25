import { getDeployment } from "./deployments.js";
import { loadCompiledContract } from "./contract.js";
import { DUTCH_V1 } from "./tax-params.js";

/**
 * Which periods a freshly deployed payroll contract can file against.
 *
 * A payroll contract cannot read the rule registry — contracts cannot read each
 * other's state — so the platform records the rule-set hash per period with
 * `setParamsFor`. A contract with none recorded is deployed, assigned, owned by
 * its employer, and unable to file anything: `setPayroll` rejects every period
 * with "no rule set recorded for that period".
 *
 * So onboarding has to open a window. It is a window rather than "all of time"
 * because each period is its own transaction, and rather than "just this month"
 * because an employer's first act is often to file the month that just ended.
 */
export const DEFAULT_WINDOW_MONTHS = 6;

/** YYYYMM for `count` months, starting `back` months before the current one. */
export function ruleWindow(
  now: Date = new Date(),
  count = DEFAULT_WINDOW_MONTHS,
  back = 2
): number[] {
  const periods: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + i, 1));
    periods.push(d.getUTCFullYear() * 100 + d.getUTCMonth() + 1);
  }
  return periods;
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
