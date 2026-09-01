// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { randomBytes, timingSafeEqual } from "crypto";
import { verifySignature } from "@midnight-ntwrk/compact-runtime";
import { EnvironmentManager } from "../utils/environment.js";
import { deriveKeys } from "../utils/wallet.js";

/**
 * Proving you hold the platform wallet, instead of proving you know a password.
 *
 * `requirePlatformToken` asks for a shared secret, and a shared secret has to
 * live in whoever is calling — which meant pasting a 64 character string into
 * the operator page and storing it in the browser. That is the wrong shape for
 * this: the person allowed to mint pEUR and deploy contracts is the holder of
 * the PLATFORM WALLET, and they already connect that wallet to the page.
 *
 * `app.ts` states the problem this solves exactly: "A page can check that the
 * connected wallet is the platform key, and that check is worth exactly nothing
 * to the server — the coin public key is public, so anyone can claim it, and
 * nothing in a POST body proves possession." A public key proves nothing; a
 * SIGNATURE over a value the server chose proves possession.
 *
 * ── Why nothing new has to be configured ───────────────────────────────────
 *
 * The service already holds the platform wallet's seed — it deploys with it and
 * mints with it — so it can derive that wallet's unshielded verifying key
 * offline and compare. There is no new secret, no new environment variable, and
 * nothing to rotate: "authorised" means "signed by the same wallet this service
 * spends from", which is checked rather than configured.
 *
 * ── What is actually verified ──────────────────────────────────────────────
 *
 * The wallet's `signData` prepends its own prefix before signing, and that
 * prefix is not published in `@midnight-ntwrk/dapp-connector-api`. Rather than
 * guess it, the signature is verified over the `data` field the wallet returns
 * — which is what it says it signed — and the challenge is then required to
 * appear INSIDE that data. Both halves are needed:
 *
 *   • verifying the signature over `data` proves the platform key signed it;
 *   • requiring our challenge inside `data` proves it was signed for THIS
 *     request, and not replayed from some other signature the operator
 *     produced elsewhere.
 *
 * Neither is sufficient alone, and together they hold without knowing the
 * prefix. A challenge is 32 random bytes, so it cannot appear in a signature
 * that predates it.
 */

/** How long an unused challenge stays valid. Long enough to approve in a wallet. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** How long a session lasts before the operator signs again. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Issued challenges, held in memory.
 *
 * In memory rather than in the database on purpose: a challenge is worthless
 * once used and meaningless after a restart, and persisting it would create a
 * replay window that outlives the process for no benefit. A restart costs the
 * operator one extra signature.
 */
const challenges = new Map<string, number>();

/** Live sessions: token -> expiry. */
const sessions = new Map<string, number>();

function sweep(): void {
  const now = Date.now();
  for (const [value, expiry] of challenges) if (expiry <= now) challenges.delete(value);
  for (const [value, expiry] of sessions) if (expiry <= now) sessions.delete(value);
}

/**
 * The verifying key of the wallet this service spends from.
 *
 * Derived once and cached. `deriveKeys` reads the seed and runs PBKDF2-grade
 * HD derivation, which is not something to repeat per request.
 */
let cachedKey: string | null = null;
export function platformVerifyingKey(): string {
  if (cachedKey) return cachedKey;
  const network = EnvironmentManager.getNetworkConfig();
  const secret = EnvironmentManager.getWalletSecret();
  cachedKey = deriveKeys(secret, network.networkId).unshieldedKeystore.getPublicKey();
  return cachedKey;
}

/** A fresh single-use challenge for the operator's wallet to sign. */
export function issueChallenge(): { challenge: string; expiresInMs: number } {
  sweep();
  // Prefixed so a human reading the wallet's approval dialog can see what they
  // are signing and which service asked. The random half is what makes it
  // unguessable; the words are for the person, not the check.
  const challenge = `polisZK operator sign-in: ${randomBytes(32).toString("hex")}`;
  challenges.set(challenge, Date.now() + CHALLENGE_TTL_MS);
  return { challenge, expiresInMs: CHALLENGE_TTL_MS };
}

export interface SignedChallenge {
  /** What the wallet says it signed. May carry a wallet-specific prefix. */
  data: string;
  signature: string;
  verifyingKey: string;
  /** The challenge this service issued, which must appear inside `data`. */
  challenge: string;
}

export type VerifyResult =
  | { ok: true; token: string; expiresInMs: number }
  | { ok: false; reason: string };

/**
 * Turns a signed challenge into a session, or explains why it will not.
 *
 * The reasons are deliberately specific, unlike the bearer-token guard's
 * deliberate silence. Nothing here is a secret an attacker could probe for: a
 * challenge is public the moment it is issued, and the platform verifying key
 * is derivable from any address the wallet has ever paid. What IS secret is the
 * signing key, and no message below moves anyone closer to it — while an
 * operator staring at a failed sign-in needs to know whether they signed with
 * the wrong wallet or simply took too long.
 */
export function verifySignedChallenge(input: SignedChallenge): VerifyResult {
  sweep();

  const expiry = challenges.get(input.challenge);
  if (expiry === undefined) {
    return { ok: false, reason: "That challenge is unknown or has already been used." };
  }
  if (expiry <= Date.now()) {
    challenges.delete(input.challenge);
    return { ok: false, reason: "That challenge expired. Sign in again." };
  }

  // Burned before the signature is checked, not after. A challenge that
  // survived a failed attempt could be retried, and retrying a signature check
  // is the shape of an oracle.
  challenges.delete(input.challenge);

  if (!input.data.includes(input.challenge)) {
    return {
      ok: false,
      reason: "The signed data does not contain the challenge that was issued.",
    };
  }

  const expected = platformVerifyingKey();
  if (!constantTimeEqual(input.verifyingKey.trim().toLowerCase(), expected.toLowerCase())) {
    return {
      ok: false,
      reason:
        "That wallet is not the platform wallet for this service. Connect the wallet " +
        "that deployed these contracts.",
    };
  }

  let valid = false;
  try {
    valid = verifySignature(
      input.verifyingKey.trim(),
      new TextEncoder().encode(input.data),
      input.signature.trim()
    );
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "That signature did not verify." };

  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return { ok: true, token, expiresInMs: SESSION_TTL_MS };
}

/** Whether a presented bearer value is a live wallet session. */
export function isLiveSession(token: string): boolean {
  sweep();
  const expiry = sessions.get(token);
  return expiry !== undefined && expiry > Date.now();
}

/** Ends one session. Used by sign-out; a restart ends them all. */
export function endSession(token: string): void {
  sessions.delete(token);
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
