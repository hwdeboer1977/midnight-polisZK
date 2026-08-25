/**
 * Differential test: the TypeScript bracket arithmetic against the circuit's.
 *
 * Two implementations exist by necessity — Compact has no division, so the
 * client computes the tax and the circuit pins the quotient. Whenever the same
 * calculation is written twice, the interesting failures are on the boundaries,
 * and they are invisible to a demo whose salaries sit comfortably inside a
 * band. This calls both and compares.
 *
 *   npm run test:bands
 */
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import { DUTCH_V1, bands, computeLine, BASIS_POINTS } from "../dist/utils/tax-params.js";

const t1 = DUTCH_V1.threshold1;
const t2 = DUTCH_V1.threshold2;

/** Every value where a branch could go the wrong way, plus ordinary ones. */
const cases = [
  0n,
  1n,
  t1 - 1n, t1, t1 + 1n,
  t2 - 1n, t2, t2 + 1n,
  2_000_000_000n,
  4_000_000_000n,
  9_000_000_000n,
  DUTCH_V1.maxContribBase - 1n,
  DUTCH_V1.maxContribBase,
  DUTCH_V1.maxContribBase + 1n,
  (1n << 59n) - 1n,
];

// Minor units, not euros. Rounding to cents makes t1-1, t1 and t1+1 print
// identically, which would hide exactly the cases this test exists for.
const u = (v) => v.toString().padStart(16);

const label = (gross) => {
  if (gross === t1) return "= threshold1";
  if (gross === t1 - 1n) return "threshold1 - 1";
  if (gross === t1 + 1n) return "threshold1 + 1";
  if (gross === t2) return "= threshold2";
  if (gross === t2 - 1n) return "threshold2 - 1";
  if (gross === t2 + 1n) return "threshold2 + 1";
  if (gross === DUTCH_V1.maxContribBase) return "= contribution cap";
  return "";
};
let failures = 0;

for (const gross of cases) {
  const mine = bands(gross, t1, t2);
  const theirs = payroll.pureCircuits.bandsFor(gross, t1, t2);

  const same =
    mine.length === theirs.length && mine.every((b, i) => b === theirs[i]);
  if (!same) {
    failures += 1;
    console.error(`MISMATCH at gross ${gross}`);
    console.error(`  typescript: ${mine.join(", ")}`);
    console.error(`  circuit:    ${theirs.join(", ")}`);
    continue;
  }

  // The bands must also reconstruct the gross exactly, or a salary is being
  // taxed twice or not at all.
  const summed = mine[0] + mine[1] + mine[2];
  if (summed !== gross) {
    failures += 1;
    console.error(`BANDS DO NOT SUM at gross ${gross}: ${summed} != ${gross}`);
    continue;
  }

  // And the quotient the client will hand the circuit must satisfy the bound
  // the circuit enforces — the other half of the same arithmetic.
  const line = computeLine(gross, DUTCH_V1);
  const lo = line.taxQuotient * BASIS_POINTS <= line.taxNumerator;
  const hi = line.taxNumerator < (line.taxQuotient + 1n) * BASIS_POINTS;
  if (!lo || !hi) {
    failures += 1;
    console.error(`QUOTIENT OUT OF BOUND at gross ${gross}`);
    continue;
  }
  if (gross !== line.taxMinor + line.contribMinor + line.netMinor) {
    failures += 1;
    console.error(`IDENTITY BROKEN at gross ${gross}`);
    continue;
  }

  console.log(
    `  ok  ${u(gross)}  bands ${mine.map((b) => u(b)).join(" ")}  ${label(gross)}`
  );
}

// A test that cannot fail proves nothing. Feed the two sides different
// thresholds and check the comparison actually notices.
const wrong = payroll.pureCircuits.bandsFor(t1 + 100n, t1, t2);
const right = bands(t1 + 100n, t1, t2);
const shifted = bands(t1 + 100n, t1 + 50n, t2);
if (wrong.every((b, i) => b === shifted[i]) || !wrong.every((b, i) => b === right[i])) {
  console.error("SELF-CHECK FAILED: the comparison does not distinguish differing bands");
  failures += 1;
} else {
  console.log("\n  self-check: comparison detects a divergence when one exists");
}

console.log(
  failures === 0
    ? `\n${cases.length} cases, TypeScript and circuit agree on every band.`
    : `\n${failures} of ${cases.length} cases FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
