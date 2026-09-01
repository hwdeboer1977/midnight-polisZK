// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { apiUrl } from "./origin";

/**
 * Signing in to the platform routes with the wallet, instead of a pasted secret.
 *
 * The operator already connects the platform wallet to this page. Asking them
 * to ALSO paste a 64 character shared secret was asking for the same authority
 * twice, in a form that has to be stored in the browser to be usable — and a
 * secret in a browser is a secret in a browser, however short its life.
 *
 * A signature settles it instead: the service issues a random challenge, the
 * wallet signs it, and the service checks the signature against the verifying
 * key of the wallet it spends from. Nothing is pasted, nothing is stored that
 * is worth stealing, and authority follows the wallet rather than a string.
 *
 * ── The prefix problem, and why this shape avoids it ───────────────────────
 *
 * `signData` says it prepends "the right prefix" before signing and does not
 * document what that prefix is. So the signature is verified server-side over
 * the `data` the wallet HANDS BACK — its own account of what it signed — and
 * the challenge is required to appear inside it. That holds without either side
 * knowing the prefix, and the wallet cannot talk its way past it: the challenge
 * is 32 random bytes chosen by the service moments earlier.
 */

/** Where the session token lives. Not the platform secret — a 12 hour session. */
const SESSION_KEY = "polisZK/wallet-session";

export interface WalletSigner {
  signData(
    data: string,
    options: { encoding: "hex" | "base64" | "text"; keyType: "unshielded" }
  ): Promise<{ data: string; signature: string; verifyingKey: string }>;
}

/** The stored session token, or null. Safe on a browser that blocks storage. */
export function storedSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function remember(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // A browser with site data blocked still works for this page view.
  }
}

/**
 * Runs the whole exchange and returns a session token.
 *
 * Throws with the service's own reason on refusal — unlike the bearer-token
 * guard, this path is deliberately talkative, because "you signed with the
 * wrong wallet" and "your challenge expired" need different actions from the
 * operator and neither leaks anything. See `server/wallet-auth.ts`.
 */
export async function signIn(wallet: WalletSigner): Promise<string> {
  const challengeResponse = await fetch(apiUrl("/api/auth/challenge"), {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  const issued = (await challengeResponse.json().catch(() => ({}))) as {
    challenge?: string;
    error?: string;
  };
  if (!challengeResponse.ok || !issued.challenge) {
    throw new Error(issued.error ?? "This service would not issue a sign-in challenge.");
  }

  // "text" so the operator sees the sentence in their wallet's approval dialog
  // rather than a wall of hex. What they are approving should be readable.
  const signed = await wallet.signData(issued.challenge, {
    encoding: "text",
    keyType: "unshielded",
  });

  const verifyResponse = await fetch(apiUrl("/api/auth/verify"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: signed.data,
      signature: signed.signature,
      verifyingKey: signed.verifyingKey,
      challenge: issued.challenge,
    }),
  });
  const result = (await verifyResponse.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
  };
  if (!verifyResponse.ok || !result.token) {
    throw new Error(result.error ?? "The service refused that signature.");
  }

  remember(result.token);
  return result.token;
}

/** Drops the session here and asks the service to forget it too. */
export async function signOut(token: string | null): Promise<void> {
  remember(null);
  if (!token) return;
  try {
    await fetch(apiUrl("/api/auth/signout"), {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    // The local half is what matters; the session expires on its own regardless.
  }
}
