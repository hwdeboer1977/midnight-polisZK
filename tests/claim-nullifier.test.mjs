/**
 * `claimNullifier` against the three inputs it must separate.
 *
 * This circuit exists so a claimant can search the fund's public spent set for
 * her own claims. The failure it has to be protected from is not a wrong hash —
 * the circuit is the hash — but a wrong CALL: `claimKey` and `fund` are both
 * `Bytes<32>`, so transposing them at a call site compiles, runs, and returns a
 * perfectly well-formed nullifier that is in nobody's spent set. The page would
 * then tell every claimant she has never claimed, for every month, forever, and
 * look completely healthy doing it.
 *
 * So each argument is varied alone and required to move the result. A
 * transposition of the two Bytes<32> arguments cannot survive `key vs fund`
 * below: it makes the pair symmetric, and the test asserts it is not.
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
const WINDOW = 202601n;

// `payee` is a ZswapCoinPublicKey, so it arrives wrapped. It used to be a bare
// `Bytes<32>` claim key; the claim key was removed when the employee side was
// simplified, and this test kept calling the old shape — which nothing noticed,
// because `contracts/managed` is generated and gitignored, so a stale artifact
// answered for it until the contracts were next recompiled.
const nullifier = (key, window, fundAddr) =>
  hex(fund.pureCircuits.claimNullifier({ bytes: key }, window, fundAddr));

const base = nullifier(KEY, WINDOW, FUND);

check("32 bytes", base.length === 64);

// Deterministic, or a claimant would get a different answer on every reload and
// the check would be worse than not having one.
check("stable across calls", nullifier(KEY, WINDOW, FUND) === base);

// Each input alone must move it. Any that does not is an input the nullifier is
// silently ignoring — and an ignored `window` would mean one claim per person
// ever, while an ignored `payee` would collide every claimant on the fund.
check("window changes it", nullifier(KEY, 202602n, FUND) !== base);
check("payee key changes it", nullifier(OTHER_KEY, WINDOW, FUND) !== base);
check("fund changes it", nullifier(KEY, WINDOW, OTHER_FUND) !== base);

// The transposition guard. Both values are 32 bytes in the caller's hands, so
// a call site that swapped them still compiles; if the circuit hashed them
// symmetrically, the swap would agree with the correct call and nothing else
// here would notice.
check("key and fund are not interchangeable", nullifier(FUND, WINDOW, KEY) !== base);

// Windows are consecutive months in practice, so the pair most likely to
// collide under a truncating or additive construction is an adjacent one.
const consecutive = new Set(
  [202601n, 202602n, 202603n, 202612n, 202701n].map((w) => nullifier(KEY, w, FUND))
);
check("five consecutive windows are five distinct nullifiers", consecutive.size === 5);

// The entitlement windows the app scans, checked here because an off-by-one at
// the year boundary would silently look at the wrong months — and "not claimed"
// is what a wrong month looks like.
const { entitlementWindows, PILOT_DURATION_MONTHS } = await import(
  "../dist/utils/benefit-params.js"
);

check("pilot entitlement is 3 months", PILOT_DURATION_MONTHS === 3);
check(
  "starts at the final period",
  entitlementWindows(202601)[0] === 202601
);
check(
  "three consecutive months",
  JSON.stringify(entitlementWindows(202601)) === JSON.stringify([202601, 202602, 202603])
);
check(
  "rolls the year rather than making a month 13",
  JSON.stringify(entitlementWindows(202611)) === JSON.stringify([202611, 202612, 202701])
);
check(
  "december start rolls cleanly",
  JSON.stringify(entitlementWindows(202612)) === JSON.stringify([202612, 202701, 202702])
);

console.log(
  failures === 0
    ? "\nall claim-nullifier checks passed\n"
    : `\n${failures} claim-nullifier check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
