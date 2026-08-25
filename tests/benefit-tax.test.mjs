/**
 * The fund's copy of the band arithmetic, against payroll's.
 *
 * `fund.compact` withholds tax and contribution from a benefit using the same
 * brackets `payroll.compact` applies to a salary — and it has to duplicate them,
 * because no contract here can call another. Duplicated arithmetic drifts, and
 * the drift would be invisible: a benefit taxed under a subtly different
 * schedule still proves, still pays, and is simply wrong.
 *
 * So this calls payroll's `bandsFor` circuit, the TypeScript `computeLine` the
 * claimant uses to produce the witnessed quotients, and checks they agree — on
 * the boundaries, where a `<` written as a `<=` hides.
 *
 * It cannot call the fund's copy directly: the bands there are inline inside
 * `claim`, which is impure. What it can pin is that the two implementations the
 * CLAIMANT relies on agree, and that the fund's `taxParamsHash` matches the hash
 * payroll's registry publishes — which is the assertion `claim` makes, and the
 * one that stops a benefit being withheld under unpublished rules.
 *
 *   npm run test:benefit-tax
 */
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import * as fund from "../contracts/managed/fund/contract/index.js";
import { DUTCH_V1, computeLine, BASIS_POINTS } from "../dist/utils/tax-params.js";
import { BENEFIT_V1, benefitFor } from "../dist/utils/benefit-params.js";

let failures = 0;
const ok = (name, pass, detail = "") => {
  console.log(`  ${pass ? "ok  " : "FAIL"} ${name}${detail ? `  ${detail}` : ""}`);
  if (!pass) failures += 1;
};

console.log("\nbenefit withholding\n");

// ── 1. the schedule the fund pins is the one payroll published ──────────────
//
// `claim` asserts persistentHash<TaxParams>(taxParams) == payrollParamsHash,
// and that hash was produced by payroll's encoding of its own struct. The two
// declarations are separate source, so this is the check that they encode
// identically — a reordered field here fails every claim, silently.
const toCircuit = (p) => ({
  version: BigInt(p.version),
  validFrom: BigInt(p.validFrom),
  threshold1: p.threshold1,
  threshold2: p.threshold2,
  rate1: BigInt(p.rate1),
  rate2: BigInt(p.rate2),
  rate3: BigInt(p.rate3),
  maxContribBase: p.maxContribBase,
  contribRate: BigInt(p.contribRate),
});
const hex = (b) => Buffer.from(b).toString("hex");

// Payroll exposes no `paramsHash` pure circuit, so the reference is better than
// one: the value payroll's own `setPayroll` wrote to `paramsHashFor[202601]` on
// preview/payroll:blockstat-solutions-v6, read off the chain 2026-08-25. If the
// two struct declarations ever stop encoding identically, this is what catches
// it — against what payroll really published, not against a second opinion from
// the same source.
const PUBLISHED_BY_PAYROLL =
  "7d729df9ba56fc9b9392ce0a9ab32a55391889a6a2608a4c3cdd9f49fe614686";

const fundHash = hex(fund.pureCircuits.taxParamsHash(toCircuit(DUTCH_V1)));
ok(
  "fund's taxParamsHash reproduces the hash payroll published on chain",
  fundHash === PUBLISHED_BY_PAYROLL,
  fundHash === PUBLISHED_BY_PAYROLL ? "" : `got ${fundHash.slice(0, 24)}…`
);

// ── 2. the bands agree, on every boundary ───────────────────────────────────
const t1 = DUTCH_V1.threshold1;
const t2 = DUTCH_V1.threshold2;
const cases = [
  1n,
  t1 - 1n, t1, t1 + 1n,
  t2 - 1n, t2, t2 + 1n,
  154_000_000n,             // the first real claim
  220_000_000n,
  BENEFIT_V1.maxMonthlyGross,
  DUTCH_V1.maxContribBase - 1n,
  DUTCH_V1.maxContribBase,
  DUTCH_V1.maxContribBase + 1n,
];

for (const gross of cases) {
  const circuit = payroll.pureCircuits.bandsFor(gross, t1, t2);
  const line = computeLine(gross, DUTCH_V1);
  const [b1, b2, b3] = line.bands;

  const bandsMatch =
    circuit[0] === b1 && circuit[1] === b2 && circuit[2] === b3;
  // The quotients the claimant witnesses must satisfy exactly the inequality
  // `claim` pins them with: q * 10000 <= n < (q + 1) * 10000.
  const taxN = b1 * BigInt(DUTCH_V1.rate1) + b2 * BigInt(DUTCH_V1.rate2) + b3 * BigInt(DUTCH_V1.rate3);
  const taxPinned =
    line.taxMinor * BASIS_POINTS <= taxN && taxN < (line.taxMinor + 1n) * BASIS_POINTS;
  const base = gross < DUTCH_V1.maxContribBase ? gross : DUTCH_V1.maxContribBase;
  const socN = base * BigInt(DUTCH_V1.contribRate);
  const socPinned =
    line.contribMinor * BASIS_POINTS <= socN && socN < (line.contribMinor + 1n) * BASIS_POINTS;

  ok(
    `gross ${gross}`,
    bandsMatch && taxPinned && socPinned,
    `tax ${line.taxMinor} social ${line.contribMinor} net ${line.netMinor}`
  );
}

// ── 3. withholding never exceeds the benefit ────────────────────────────────
//
// `claim` asserts `benefitTaxQ + benefitSocialQ < benefitQ`. A schedule that
// summed past 100% would make every claim unprovable rather than pay a negative
// benefit, but the failure would surface at a claimant.
for (const salary of [1_000_000n, 220_000_000n, 3_000_000_000n, 10_000_000_000n]) {
  const benefit = benefitFor(salary, BENEFIT_V1);
  const line = computeLine(benefit.quotient, DUTCH_V1);
  ok(
    `salary ${salary} -> benefit ${benefit.quotient}`,
    line.taxMinor + line.contribMinor < benefit.quotient && line.netMinor > 0n,
    `net ${line.netMinor}`
  );
}

// ── 4. the artifact this whole change exists to remove ──────────────────────
//
// An untaxed benefit computed from a taxed salary can exceed the take-home pay
// it replaces. With withholding it must not — for any salary, under one flat
// rate below 100%, net benefit is a fraction of net pay.
for (const salary of [220_000_000n, 340_000_000n, 3_000_000_000n, 8_000_000_000n]) {
  const salaryLine = computeLine(salary, DUTCH_V1);
  const benefit = benefitFor(salary, BENEFIT_V1);
  const benefitLine = computeLine(benefit.quotient, DUTCH_V1);
  ok(
    `net benefit <= net pay, salary ${salary}`,
    benefitLine.netMinor <= salaryLine.netMinor,
    `€${Number(benefitLine.netMinor) / 1e6} vs €${Number(salaryLine.netMinor) / 1e6}`
  );
}

console.log();
if (failures > 0) {
  console.log(`${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("all benefit-withholding checks passed\n");
