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
export async function signIn(
  wallet: WalletSigner,
  /**
   * Reports each step to the page.
   *
   * On screen rather than only in the console, because every failure in this
   * flow so far has been invisible: a prompt behind the window, a disabled
   * button, a promise that neither resolves nor rejects. Each looked identical
   * from the outside — nothing happened — and each needed a different fix. A
   * visible step tells the operator which one they are in without opening
   * devtools.
   */
  onStep: (step: string) => void = () => {}
): Promise<string> {
  // Checked before anything else, because the type system cannot.
  // `@midnight-ntwrk/dapp-connector-api` DECLARES `signData` on
  // `WalletConnectedAPI`, but the declaration describes the protocol, not the
  // extension the visitor happens to have installed — an older wallet satisfies
  // the type and still has no such method. Calling it then throws
  // "signData is not a function" from inside a promise, which surfaces as a
  // sign-in that fails with nothing in the console to say why.
  if (typeof wallet?.signData !== "function") {
    throw new Error(
      "This wallet does not support message signing (signData), which is how the " +
        "service checks you hold the platform wallet. Update the wallet extension, " +
        "or use the platform token instead."
    );
  }

  onStep("Asking the service for a challenge…");
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

  // Logged BEFORE the call as well as after. A wallet that rejects, hangs or
  // throws leaves no trace otherwise, and "nothing in the console" is
  // indistinguishable from "the button did nothing".
  onStep("OPEN YOUR WALLET EXTENSION AND APPROVE — it will not open by itself");
  console.info("[sign-in] asking the wallet to sign", {
    challengeLength: issued.challenge.length,
    hasSignData: typeof wallet.signData === "function",
  });

  // "text" so the operator sees the sentence in their wallet's approval dialog
  // rather than a wall of hex. What they are approving should be readable.
  //
  // Raced against a timeout because a dead extension channel makes this promise
  // hang rather than reject: no prompt appears, nothing throws, and the button
  // waits forever on a dialog that will never open. Two minutes is generous for
  // a human approving in a wallet window and still short of "forever".
  const signed = await Promise.race([
    wallet.signData(issued.challenge, { encoding: "text", keyType: "unshielded" }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "No answer from the wallet. 1AM does NOT raise its own window for a signing " +
                "request — open the extension from the toolbar and approve the pending " +
                "\"Sign Data\" prompt, then press Sign in again."
            )
          ),
        90_000
      )
    ),
  ]);

  // What the wallet actually returned, for when it does not match what this
  // service can read. The connector documents neither the encoding of `data`
  // nor the prefix, so the shape is worth seeing once rather than guessing at.
  // The challenge is public and the signature is useless without the key, so
  // there is nothing here worth hiding from a console the operator owns.
  console.info("[sign-in] wallet returned", {
    dataLength: signed.data.length,
    dataStartsWith: signed.data.slice(0, 48),
    containsChallenge: signed.data.includes(issued.challenge),
    verifyingKeyLength: signed.verifyingKey.length,
    signatureLength: signed.signature.length,
  });

  onStep("Checking the signature…");
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

  onStep("Signed in");
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
