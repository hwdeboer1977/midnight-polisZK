/**
 * A payslip must open the commitment the chain holds — and must fail if edited.
 *
 * The whole employee-facing story rests on this one property: an employer hands
 * over figures out of band, and the chain is what proves them. If a tampered
 * payslip still verified, the page would be showing an employee a number their
 * employer could have chosen after payday, with a green tick next to it.
 *
 * So the check runs against the REAL compiled circuit — the same
 * `pureCircuits.commitmentFor` the browser calls and the same one `setPayroll`
 * hashes with — rather than a TypeScript reimplementation that could agree with
 * itself while disagreeing with Compact.
 *
 *   npm run test:payslip
 */
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import {
  buildPayslip,
  decodePayslip,
  fromHex,
  verifyPayslip,
} from "../frontend/src/lib/payslip.ts";
import { DUTCH_V1, computeLine } from "../dist/utils/tax-params.js";

const CONTRACT = "7fd5cddcef5c8945ce0b563dd6ceff0a71fdaeff9ac59339aec7b3656db89a7f";
const PERIOD = 202610;
const SLOT = 0;

// Arbitrary but fixed: the test must be reproducible, and none of these values
// is secret — they stand in for what a real filing would put on chain.
const employer = fromHex("11".repeat(32));
const paramsHash = fromHex("22".repeat(32));
const nonce = fromHex("33".repeat(32));

const gross = 220_000_000n;
const computed = computeLine(gross, DUTCH_V1);
const line = {
  grossMinor: gross,
  taxMinor: computed.taxMinor,
  socialMinor: computed.contribMinor,
  netMinor: computed.netMinor,
  weeks: 4,
};

/** What the employer would have published for this slot. */
const commitment = Buffer.from(
  payroll.pureCircuits.commitmentFor(
    line.grossMinor,
    line.taxMinor,
    line.socialMinor,
    line.netMinor,
    BigInt(line.weeks),
    BigInt(PERIOD),
    { bytes: employer },
    paramsHash,
    nonce
  )
).toString("hex");

const anchor = { employer, paramsHash, commitment };
const slip = buildPayslip({
  contractAddress: CONTRACT,
  period: PERIOD,
  slot: SLOT,
  employee: "Test Employee",
  line,
  nonce,
});

let failures = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${ok ? "" : `  (got ${actual})`}`);
};

console.log("\npayslip ↔ commitment\n");

check("the genuine payslip opens the commitment",
  verifyPayslip(payroll.pureCircuits, slip, anchor), true);

check("a round trip through the file encoding survives",
  verifyPayslip(payroll.pureCircuits, decodePayslip(JSON.stringify(slip)), anchor), true);

// Links used to be a supported way in and are not any more — "Copy link" and
// the paste box were both removed, so a link must now fail rather than quietly
// work. This is the check that would catch it coming back by accident.
check("a payslip offered as a link is refused", (() => {
  try {
    decodePayslip("https://example.test/employee#payslip=eyJ2IjoxfQ");
    return false;
  } catch {
    return true;
  }
})(), true);

// The cases that matter. Each edits one field a dishonest employer would want
// to edit, and each must fail — including the ones that keep the arithmetic
// self-consistent, since internal consistency is not what is being checked.
console.log("\ntampering\n");

check("a raised net fails",
  verifyPayslip(payroll.pureCircuits, { ...slip, net: "999000000" }, anchor), false);

check("a lowered tax fails",
  verifyPayslip(payroll.pureCircuits, { ...slip, tax: "1" }, anchor), false);

check("a raised gross fails",
  verifyPayslip(payroll.pureCircuits, { ...slip, gross: "999000000" }, anchor), false);

check("changed weeks fail",
  verifyPayslip(payroll.pureCircuits, { ...slip, weeks: 5 }, anchor), false);

check("a substituted nonce fails",
  verifyPayslip(payroll.pureCircuits, { ...slip, nonce: "44".repeat(32) }, anchor), false);

{
  // A wholly recomputed line: every figure consistent with a gross of 340, and
  // still refused, because the commitment fixes the numbers rather than their
  // relationship.
  const other = computeLine(340_000_000n, DUTCH_V1);
  check("a consistent but different salary fails",
    verifyPayslip(payroll.pureCircuits, {
      ...slip,
      gross: "340000000",
      tax: other.taxMinor.toString(),
      social: other.contribMinor.toString(),
      net: other.netMinor.toString(),
    }, anchor), false);
}

check("the same payslip under another employer's key fails",
  verifyPayslip(payroll.pureCircuits, slip, { ...anchor, employer: fromHex("99".repeat(32)) }),
  false);

check("the same payslip under another rule set fails",
  verifyPayslip(payroll.pureCircuits, slip, { ...anchor, paramsHash: fromHex("99".repeat(32)) }),
  false);

check("an empty commitment fails rather than passing vacuously",
  verifyPayslip(payroll.pureCircuits, slip, { ...anchor, commitment: "" }), false);

console.log("\nmalformed input\n");
for (const [name, input] of [
  ["empty", ""],
  ["not a payslip", "hello"],
  ["truncated json", '{"v":1,'],
  ["wrong version", JSON.stringify({ ...slip, v: 99 })],
  ["missing a field", JSON.stringify({ ...slip, nonce: undefined })],
]) {
  let threw = false;
  try {
    decodePayslip(input);
  } catch {
    threw = true;
  }
  check(`${name} is refused`, threw, true);
}

console.log();
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all payslip checks passed\n");
