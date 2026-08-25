/**
 * The browser's withholding-coin nonce against the CLI's.
 *
 * `fundWithholding` is called from the employer's browser; `remitTax` and
 * `remitSocial` spend those same coins, and may well run from the CLI months
 * later. Both sides rebuild the coin from a derived nonce, and the two
 * derivations live in different files by necessity — one uses WebCrypto, the
 * other Node's.
 *
 * If they ever disagree, nothing fails loudly: funding succeeds, the contract
 * holds the money, and remitting rebuilds a coin that does not exist. That is
 * the failure this file exists to prevent, and it is the same shape as the
 * fund's `evolveChangeNonce` — a nonce nobody can reproduce is money nobody can
 * spend.
 *
 *   npm run test:withholding-nonce
 */
import { webcrypto } from "crypto";
import { withholdingCoinNonce } from "../dist/utils/payroll-openings.js";

const DOMAIN_COIN = "polisZK/coin/v1";

/** The frontend's `sha256(...parts)`, reimplemented from its source. */
async function browserNonce(employerKey, period, round, which) {
  const encoder = new TextEncoder();
  const parts = [
    encoder.encode(DOMAIN_COIN),
    employerKey,
    encoder.encode(`${period}:${round}:${which}`),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return new Uint8Array(await webcrypto.subtle.digest("SHA-256", joined));
}

const hex = (b) => Buffer.from(b).toString("hex");

let failures = 0;
const check = (name, a, b) => {
  const ok = a === b;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n       ${a}\n       ${b}`}`);
  if (!ok) failures += 1;
};

console.log("\nwithholding coin nonces\n");

const key = Buffer.from("9f".repeat(32), "hex");

for (const [period, round] of [
  [202601, 0],
  [202601, 1],
  [202612, 0],
  [299912, 7],
]) {
  for (const which of ["tax", "social"]) {
    check(
      `${period} round ${round} ${which}`,
      hex(withholdingCoinNonce(key, period, round, which)),
      hex(await browserNonce(key, period, round, which))
    );
  }
}

// The two coins in one period must differ, and neither may collide with an
// employee slot — a numbered label would eventually do exactly that, and a
// duplicate Zswap commitment fails at funding with nothing naming the cause.
const tax = hex(withholdingCoinNonce(key, 202601, 0, "tax"));
const social = hex(withholdingCoinNonce(key, 202601, 0, "social"));
check("tax and social differ", tax === social ? "same" : "different", "different");

// Re-filing a period bumps the round, so its coins must not rebuild identically.
check(
  "a re-filed period gets fresh coins",
  hex(withholdingCoinNonce(key, 202601, 0, "tax")) ===
    hex(withholdingCoinNonce(key, 202601, 1, "tax"))
    ? "same"
    : "different",
  "different"
);

console.log();
if (failures > 0) {
  console.error(`${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("all withholding-nonce checks passed\n");
