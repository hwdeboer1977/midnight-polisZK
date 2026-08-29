// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { bech32m } from "@scure/base";

/**
 * The DApp connector returns keys in Bech32m — `mn_shield-cpk_preview1…` — while
 * contracts, and therefore every comparison against on-chain state, work in raw
 * hex. Mixing the two silently fails: a bech32 string never equals a hex string,
 * so an employer would simply see none of their contracts, with no error.
 *
 * Decoded with @scure/base rather than the SDK's address-format package, which
 * depends on ledger-v8 and would pull 11 MB of WASM into the browser for what is
 * a base32 decode.
 */
export function keyToHex(key: string): string {
  const value = key.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();

  // Midnight's strings are longer than bech32's default 90-character limit.
  const { words } = bech32m.decode(value as `${string}1${string}`, 1023);
  return Array.from(bech32m.fromWords(words), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when a Bech32m or hex key refers to the same bytes as a hex key. */
export function sameKey(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return keyToHex(a) === keyToHex(b);
  } catch {
    return false;
  }
}

export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
