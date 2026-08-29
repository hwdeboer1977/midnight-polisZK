// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { deriveEmployerKey } from "./openings";
import { apiUrl } from "./origin";

/**
 * The employer's roster, sealed under their payroll passphrase.
 *
 * ── The problem it solves ──────────────────────────────────────────────────
 *
 * The chain stores `payeeHash(coinPublicKey, period, instance)` and never the
 * key, so nothing public maps people to employers. The cost of that is carried
 * by the employer: the preimages live in a workbook, and a browser that has not
 * seen it shows slot numbers instead of names and cannot end anybody's
 * employment.
 *
 * ── Why sealed rather than stored ──────────────────────────────────────────
 *
 * A plaintext roster on the platform would rebuild the map the whole design
 * avoids — off chain, and held by us, which for a payroll platform is arguably
 * worse than publishing it because nobody would think to look. So the service
 * gets ciphertext under a key derived from the payroll passphrase it never
 * sees, and can do nothing with it but hand it back.
 *
 * The same passphrase already seals every opening on chain. This is that
 * pattern applied to the one thing an employer otherwise carries between
 * machines in a spreadsheet.
 *
 * ── What is in it, and what is deliberately not ────────────────────────────
 *
 * Names and the two public keys. **No salaries.** Those stay in the workbook,
 * so the worst case for this blob — if the sealing were broken, or the
 * passphrase guessed — is "who works here" and not "and what they earn". The
 * two are different disclosures and there is no reason to combine them.
 */
export interface SealedRosterRow {
  fullName: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_BYTES = 12;

/**
 * The AES key for this blob, from the employer key.
 *
 * Domain-separated from the openings' sealing key rather than reused: the same
 * passphrase now protects two unrelated things, and a key used for two purposes
 * is one that cannot be rotated for one of them.
 */
async function rosterKey(employerKey: Uint8Array): Promise<CryptoKey> {
  const material = new Uint8Array(employerKey.length + 16);
  material.set(employerKey, 0);
  material.set(encoder.encode("polisZK/roster/1"), employerKey.length);
  const digest = await crypto.subtle.digest("SHA-256", material as BufferSource);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...Array.from(bytes)));
const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Seals a roster and returns base64 of `iv || ciphertext`. */
export async function sealRoster(
  passphrase: string,
  contractAddress: string,
  rows: SealedRosterRow[]
): Promise<string> {
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = encoder.encode(JSON.stringify(rows));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      await rosterKey(employerKey),
      plaintext as BufferSource
    )
  );
  const sealed = new Uint8Array(IV_BYTES + ciphertext.length);
  sealed.set(iv, 0);
  sealed.set(ciphertext, IV_BYTES);
  return toBase64(sealed);
}

/**
 * Opens a sealed roster.
 *
 * AES-GCM authenticates, so a wrong passphrase fails here rather than yielding
 * plausible nonsense — which is what makes "wrong passphrase" a thing this can
 * report instead of a corrupted roster somebody acts on.
 */
export async function openRoster(
  passphrase: string,
  contractAddress: string,
  sealed: string
): Promise<SealedRosterRow[]> {
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);
  const raw = fromBase64(sealed);
  const iv = raw.slice(0, IV_BYTES);
  const ciphertext = raw.slice(IV_BYTES);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      await rosterKey(employerKey),
      ciphertext as BufferSource
    );
  } catch {
    throw new Error(
      "That passphrase does not open this roster. It is the one you file periods with."
    );
  }
  return JSON.parse(decoder.decode(plaintext)) as SealedRosterRow[];
}

/** Uploads a sealed roster. Returns the failure text, or null on success. */
export async function putSealedRoster(
  networkId: string,
  contractAddress: string,
  sealed: string
): Promise<string | null> {
  try {
    const response = await fetch(apiUrl("/api/sealed-roster"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ networkId, contractAddress, sealed }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return response.ok ? null : (body.error ?? `Service returned ${response.status}`);
  } catch {
    return "The service is not reachable, so the roster was not stored.";
  }
}

/** The stored blob, or null when there is none or no service to ask. */
export async function fetchSealedRoster(
  networkId: string,
  contractAddress: string
): Promise<{ sealed: string; updatedAt: string } | null> {
  try {
    const response = await fetch(
      apiUrl(
        `/api/sealed-roster?networkId=${encodeURIComponent(networkId)}` +
          `&contractAddress=${encodeURIComponent(contractAddress)}`
      ),
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      roster?: { sealed: string; updatedAt: string } | null;
    };
    return body.roster ?? null;
  } catch {
    return null;
  }
}
