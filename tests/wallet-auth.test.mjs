// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Wallet-signature sign-in, exercised against the real signing primitives.
 *
 * The platform wallet's own keystore stands in for the browser extension here:
 * both produce a signature from the same unshielded key, and the server cannot
 * tell — nor should it — which one held the key. What this pins is the part
 * that is easy to get wrong and impossible to notice: that a challenge is
 * single-use, that it expires, that another wallet is refused, and that a
 * signature cannot be replayed onto a different challenge.
 */

import {
  issueChallenge,
  verifySignedChallenge,
  isLiveSession,
  endSession,
  platformVerifyingKey,
} from "../dist/server/wallet-auth.js";
import { deriveKeys } from "../dist/utils/wallet.js";
import { EnvironmentManager } from "../dist/utils/environment.js";

let failures = 0;
const ok = (n) => console.log(`  ok  ${n}`);
const fail = (n, d) => { failures += 1; console.error(`  FAIL  ${n}\n        ${d}`); };
const check = (n, cond, detail = "") => (cond ? ok(n) : fail(n, detail));

const net = EnvironmentManager.getNetworkConfig();
const ks = deriveKeys(EnvironmentManager.getWalletSecret(), net.networkId).unshieldedKeystore;

/** Signs the way the wallet does: over data that CONTAINS the challenge. */
const sign = (challenge, { prefix = "Midnight wallet signed: ", key = ks } = {}) => {
  const data = prefix + challenge;
  return {
    data,
    signature: key.signData(new TextEncoder().encode(data)),
    verifyingKey: key.getPublicKey(),
    challenge,
  };
};

console.log("\nwallet-signature sign-in\n");

check("the service derives its own platform key",
  typeof platformVerifyingKey() === "string" && platformVerifyingKey().length === 64,
  platformVerifyingKey());

// ── The happy path, including an unknown wallet prefix ─────────────────────
{
  const { challenge } = issueChallenge();
  const result = verifySignedChallenge(sign(challenge));
  check("a signature by the platform wallet opens a session", result.ok,
    result.ok ? "" : result.reason);
  if (result.ok) {
    check("the session is live", isLiveSession(result.token));
    endSession(result.token);
    check("sign-out ends it", !isLiveSession(result.token));
  }
}

// ── The prefix the wallet adds is not something we have to know ────────────
{
  const { challenge } = issueChallenge();
  const result = verifySignedChallenge(sign(challenge, { prefix: "\x19Some Other Prefix\n" }));
  check("a different wallet prefix still verifies", result.ok, result.ok ? "" : result.reason);
  if (result.ok) endSession(result.token);
}

// ── Single use ─────────────────────────────────────────────────────────────
{
  const { challenge } = issueChallenge();
  const first = verifySignedChallenge(sign(challenge));
  const second = verifySignedChallenge(sign(challenge));
  check("the first use succeeds", first.ok, first.ok ? "" : first.reason);
  check("the same challenge cannot be used twice", !second.ok,
    "a replay was accepted");
  if (first.ok) endSession(first.token);
}

// ── A signature cannot be moved onto another challenge ─────────────────────
{
  const a = issueChallenge().challenge;
  const b = issueChallenge().challenge;
  const signedA = sign(a);
  const result = verifySignedChallenge({ ...signedA, challenge: b });
  check("a signature for one challenge is refused for another", !result.ok,
    "a cross-challenge replay was accepted");
}

// ── A challenge nobody issued ──────────────────────────────────────────────
{
  const result = verifySignedChallenge(sign("polisZK operator sign-in: " + "0".repeat(64)));
  check("an unissued challenge is refused", !result.ok, "an invented challenge was accepted");
}

// ── Another wallet, correctly signing a real challenge ─────────────────────
{
  const { challenge } = issueChallenge();
  // A different wallet entirely: a fixed 32-byte seed, so the test is
  // deterministic and needs no second mnemonic to keep in step.
  const stranger = deriveKeys(
    { kind: "seed", value: "11".repeat(32) },
    net.networkId
  ).unshieldedKeystore;
  const result = verifySignedChallenge(sign(challenge, { key: stranger }));
  check("a different wallet is refused", !result.ok, "a stranger's signature was accepted");
  check("and is told why", !result.ok && /not the platform wallet/.test(result.reason),
    result.ok ? "" : result.reason);
}

// ── A valid signature over data that omits the challenge ───────────────────
{
  const { challenge } = issueChallenge();
  const signed = sign(challenge);
  const elsewhere = "Midnight wallet signed: something else entirely";
  const result = verifySignedChallenge({
    ...signed,
    data: elsewhere,
    signature: ks.signData(new TextEncoder().encode(elsewhere)),
  });
  check("signed data that omits the challenge is refused", !result.ok,
    "data unbound from the challenge was accepted");
}

// ── The wallet may hand back its data hex- or base64-encoded ───────────────
//
// The connector types `data` as a string and documents no encoding, so all
// three readings have to work. A wrong guess cannot let anything through: every
// reading is checked against the same signature and the same key.
{
  for (const [name, encode] of [
    ["hex", (t) => Buffer.from(t, "utf8").toString("hex")],
    ["base64", (t) => Buffer.from(t, "utf8").toString("base64")],
  ]) {
    const { challenge } = issueChallenge();
    const text = "\x19Midnight Signed Message:\n" + challenge;
    const result = verifySignedChallenge({
      data: encode(text),
      signature: ks.signData(new TextEncoder().encode(text)),
      verifyingKey: ks.getPublicKey(),
      challenge,
    });
    check(`${name}-encoded signed data verifies`, result.ok, result.ok ? "" : result.reason);
    if (result.ok) endSession(result.token);
  }
}

// ── Tolerance is not a hole ────────────────────────────────────────────────
{
  const { challenge } = issueChallenge();
  const text = "\x19Midnight Signed Message:\n" + challenge;
  const stranger = deriveKeys({ kind: "seed", value: "22".repeat(32) }, net.networkId)
    .unshieldedKeystore;
  const result = verifySignedChallenge({
    data: Buffer.from(text, "utf8").toString("hex"),
    signature: stranger.signData(new TextEncoder().encode(text)),
    verifyingKey: stranger.getPublicKey(),
    challenge,
  });
  check("a hex-encoded signature from another wallet is still refused", !result.ok,
    "encoding tolerance let a stranger through");
}

// ── A tampered signature ───────────────────────────────────────────────────
{
  const { challenge } = issueChallenge();
  const signed = sign(challenge);
  const flipped = signed.signature.slice(0, -2) + (signed.signature.endsWith("00") ? "11" : "00");
  const result = verifySignedChallenge({ ...signed, signature: flipped });
  check("a tampered signature is refused", !result.ok, "a bad signature verified");
}

console.log(failures === 0
  ? "\nall wallet-auth checks passed\n"
  : `\n${failures} wallet-auth check(s) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
