/**
 * `claimNullifier` against the three inputs it must separate, and the calendar
 * helpers a claim is built from against the contract's own arithmetic.
 *
 * This circuit exists so a claimant can search the fund's public spent set for
 * her own claims. The failure it has to be protected from is not a wrong hash —
 * the circuit is the hash — but a wrong CALL: `payee` and `fund` are both 32
 * bytes in the caller's hands, so transposing them at a call site compiles,
 * runs, and returns a perfectly well-formed nullifier that is in nobody's spent
 * set. The page would then tell every claimant she has never claimed, for every
 * month, forever, and look completely healthy doing it.
 *
 * So each argument is varied alone and required to move the result.
 *
 *   npm run test:nullifier
 */
import * as fund from "../contracts/managed/fund/contract/index.js";

const bytes = (seed) => Uint8Array.from({ length: 32 }, (_, i) => (seed * 31 + i * 7) % 256);
const hex = (b) => Buffer.from(b).toString("hex");

let failures = 0;
const check = (name, ok) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}`);
};

console.log("\nclaim nullifier\n");

const KEY = bytes(1);
const OTHER_KEY = bytes(2);
const FUND = bytes(9);
const OTHER_FUND = bytes(10);
const MONTH = 202610n;

// `payee` is a ZswapCoinPublicKey, so it arrives wrapped.
const nullifier = (key, month, fundAddr) =>
  hex(fund.pureCircuits.claimNullifier({ bytes: key }, month, fundAddr));

const base = nullifier(KEY, MONTH, FUND);

check("32 bytes", base.length === 64);

// Deterministic, or a claimant would get a different answer on every reload and
// the check would be worse than not having one.
check("stable across calls", nullifier(KEY, MONTH, FUND) === base);

// Each input alone must move it. An ignored `month` would mean one claim per
// person ever; an ignored `payee` would collide every claimant on the fund.
check("month changes it", nullifier(KEY, 202611n, FUND) !== base);
check("payee key changes it", nullifier(OTHER_KEY, MONTH, FUND) !== base);
check("fund changes it", nullifier(KEY, MONTH, OTHER_FUND) !== base);

// The transposition guard. If the circuit hashed payee and fund symmetrically,
// a call site that swapped them would agree with the correct call.
check("key and fund are not interchangeable", nullifier(FUND, MONTH, KEY) !== base);

// Claimed months are consecutive in practice, so the pair most likely to collide
// under a truncating or additive construction is an adjacent one.
const consecutive = new Set(
  [202610n, 202611n, 202612n, 202701n, 202702n].map((m) => nullifier(KEY, m, FUND))
);
check("five consecutive months are five distinct nullifiers", consecutive.size === 5);

// The entitlement months the app scans and claims, checked here because an
// off-by-one at the year boundary would silently look at the wrong months — and
// "not claimed" is what a wrong month looks like.
const {
  entitlementPeriods,
  monthStartSeconds,
  claimCalendar,
  PILOT_DURATION_MONTHS,
  BENEFIT_V1,
  recordedParams,
  toCircuitParams,
} = await import("../dist/utils/benefit-params.js");

check("pilot entitlement is 3 months", PILOT_DURATION_MONTHS === 3);
check(
  "starts the month AFTER the final period",
  JSON.stringify(entitlementPeriods(202609)) === JSON.stringify([202610, 202611, 202612])
);
check(
  "rolls the year rather than making a month 13",
  JSON.stringify(entitlementPeriods(202611)) === JSON.stringify([202612, 202701, 202702])
);
check(
  "a December final period starts in January",
  JSON.stringify(entitlementPeriods(202612)) === JSON.stringify([202701, 202702, 202703])
);

// `claim` compares the block time with the fund's own `monthStart`. The page's
// "opens on" and the pre-check before proving use `monthStartSeconds`, so the
// two must agree on every month, leap years and century years included.
let calendarMismatches = 0;
for (const period of [202601, 202602, 202603, 202812, 202903, 210003, 240003, 299912]) {
  const cal = claimCalendar(202512, period);
  const circuit = fund.pureCircuits.monthStart(cal.year, cal.month, cal.q4, cal.q100, cal.q400);
  if (circuit !== BigInt(monthStartSeconds(period))) calendarMismatches += 1;
}
check("monthStart (circuit) and monthStartSeconds (app) agree", calendarMismatches === 0);

const cal = claimCalendar(202609, 202701);
check(
  "claimCalendar splits both periods",
  cal.finalYear === 2026n && cal.finalMonth === 9n && cal.year === 2027n && cal.month === 1n
);

// The rule set a period is claimed under is found by the hash the fund records.
const hashOf = (p) => fund.pureCircuits.benefitParamsHash(p);
check(
  "recordedParams finds v1 by its hash",
  recordedParams(hashOf(toCircuitParams(BENEFIT_V1)), hashOf)?.version === BENEFIT_V1.version
);
check("recordedParams finds nothing for an unknown hash", recordedParams(bytes(3), hashOf) === null);

console.log(
  failures === 0
    ? "\nall claim-nullifier checks passed\n"
    : `\n${failures} claim-nullifier check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
