// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { keyToHex } from "./keys";
import { apiUrl } from "./origin";

/**
 * Claim-key hashes an employee has published for their employer to pick up.
 *
 * ── What travels, and why it is safe ───────────────────────────────────────
 *
 * The hash only. `persistentHash(claimKey)` over 32 random bytes: not
 * reversible, nothing to guess against, and no route to a payment — `claim`
 * binds to `ownPublicKey()` separately, so the hash alone claims nothing. The
 * key itself lives in one downloaded file and is never sent anywhere.
 *
 * ── Why it is a suggestion rather than a source of truth ───────────────────
 *
 * The employer anchors this value in a write-once termination statement, and a
 * wrong value there is only detectable when a claim is attempted — long after
 * the statement can be changed. So this fills the employer's field and does not
 * replace it: the paste box stays, the direct hand-over still works, and the
 * employee is shown what this service holds for them while a mismatch can still
 * be fixed.
 *
 * Every call degrades to "nothing published" rather than to an error. A
 * deployment with no database is a normal deployment — it simply means the
 * courier step is manual, which is how this worked before.
 *
 * ⚠️ **Everything here is keyed on the HEX coin public key**, normalised on the
 * way in and on the way out. The two sides of this exchange hold the same key in
 * different encodings: an employee's wallet hands out Bech32m
 * (`mn_shield-cpk_preview1…`) while an employer's workbook carries raw hex, and
 * a bech32 string never equals a hex string. Publishing one and looking up the
 * other matched nothing, silently — the employer saw "Missing" for a hash that
 * was sitting in the table. `keyToHex` accepts either form, so normalising at
 * both ends also repairs rows written before this was noticed.
 */
export interface PublishedClaimKey {
  coinPublicKey: string;
  claimKeyHash: string;
  createdAt: string;
}

/** Publishes one employee's hash. Returns the failure text, or null on success. */
export async function publishClaimKeyHash(
  networkId: string,
  coinPublicKey: string,
  claimKeyHash: string
): Promise<string | null> {
  try {
    const response = await fetch(apiUrl("/api/claim-keys"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        networkId,
        coinPublicKey: keyToHex(coinPublicKey),
        claimKeyHash,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return body.error ?? `Service returned ${response.status}`;
    return null;
  } catch {
    return "The service is not reachable, so the hash was not published. Send it to your employer directly.";
  }
}

/** What this service holds for one person — for them to compare against their file. */
export async function readMyClaimKeyHash(
  networkId: string,
  coinPublicKey: string
): Promise<PublishedClaimKey | null> {
  try {
    const response = await fetch(
      apiUrl(
        `/api/claim-keys?networkId=${encodeURIComponent(networkId)}` +
          `&coinPublicKey=${encodeURIComponent(keyToHex(coinPublicKey))}`
      ),
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { claimKey?: PublishedClaimKey | null };
    return body.claimKey ?? null;
  } catch {
    return null;
  }
}

/** Every hash published on this network, keyed by coin public key, lowercased. */
export async function readPublishedClaimKeys(
  networkId: string
): Promise<Record<string, string>> {
  try {
    const response = await fetch(
      apiUrl(`/api/claim-keys?networkId=${encodeURIComponent(networkId)}`),
      { cache: "no-store" }
    );
    if (!response.ok) return {};
    const body = (await response.json()) as { claimKeys?: PublishedClaimKey[] };
    const out: Record<string, string> = {};
    for (const row of body.claimKeys ?? []) {
      // Normalised on read as well as on write, so a row stored in Bech32m
      // before this was fixed still matches a hex lookup.
      try {
        out[keyToHex(row.coinPublicKey)] = row.claimKeyHash.toLowerCase();
      } catch {
        out[row.coinPublicKey.toLowerCase()] = row.claimKeyHash.toLowerCase();
      }
    }
    return out;
  } catch {
    return {};
  }
}
