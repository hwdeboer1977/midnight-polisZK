// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { ZswapSecretKeys } from "@midnight-ntwrk/ledger-v8";
import { toPublicKey } from "./keys.js";
import { deriveKeys } from "./wallet.js";

/**
 * Where withheld tax and contributions are sent, read from the environment.
 *
 * Every payroll contract freezes both destinations in its constructor and can
 * never change them, so they are required rather than defaulted. Falling back
 * to the deployer's own key would produce a contract that remits tax to the
 * platform — which would deploy cleanly, run correctly, and be wrong in a way
 * nobody notices until somebody asks where the tax went.
 *
 * Shared by the deploy script and the self-service onboarding path, because a
 * contract deployed by one and a contract deployed by the other must send
 * money to the same place.
 */
export interface TreasuryKeys {
  tax: { bytes: Uint8Array };
  social: { bytes: Uint8Array };
}

export class TreasuryKeysMissing extends Error {
  constructor() {
    super(
      "TAX_TREASURY_KEY and SOCIAL_TREASURY_KEY must both be set — a payroll " +
        "contract freezes both destinations at deploy and can never change them. " +
        "Generate keys with `npm run payee`."
    );
    this.name = "TreasuryKeysMissing";
  }
}

export function treasuryKeys(): TreasuryKeys {
  const tax = process.env.TAX_TREASURY_KEY?.trim();
  const social = process.env.SOCIAL_TREASURY_KEY?.trim();
  if (!tax || !social) throw new TreasuryKeysMissing();
  return { tax: toPublicKey(tax), social: toPublicKey(social) };
}

/**
 * The treasuries' ENCRYPTION public keys, which sending to them requires.
 *
 * A coin public key says who owns a shielded coin; the encryption public key is
 * what the coin is encrypted to, and without it the recipient cannot find the
 * coin at all. `peur.compact` documents the same requirement for `mintTo`, and
 * `payPeriod` carries the mapping for exactly this reason.
 *
 * The failure without it is not silent here — the balancer refuses with
 * "Unable to resolve encryption public key for recipient" — which is a better
 * outcome than the one that motivated the note on `mintTo`, where a missing
 * mapping produced a coin nobody could ever detect.
 *
 * Derived from the treasury seeds rather than stored, because `.env` records
 * the seeds already and a second copy of a public key is a second thing to keep
 * in step. Deriving needs the seed, which is more than sending strictly
 * requires — set `TAX_TREASURY_ENC_KEY` / `SOCIAL_TREASURY_ENC_KEY` instead on
 * any machine that should not hold the treasuries' spending keys.
 */
export function treasuryEncryptionKeys(networkId: string): {
  tax: string;
  social: string;
} {
  const resolve = (label: "TAX" | "SOCIAL"): string => {
    const explicit = process.env[`${label}_TREASURY_ENC_KEY`]?.trim();
    if (explicit) return explicit.replace(/^0x/, "").toLowerCase();

    const seed = process.env[`${label}_TREASURY_SEED`]?.trim();
    if (!seed) {
      throw new Error(
        `${label}_TREASURY_ENC_KEY is not set and ${label}_TREASURY_SEED is not ` +
          "available to derive it from. A shielded coin can only be found by " +
          "someone whose encryption public key the transaction was built with, " +
          "so a remittance cannot be sent without it."
      );
    }
    const { shieldedSeed } = deriveKeys({ kind: "seed", value: seed }, networkId);
    return String(ZswapSecretKeys.fromSeed(shieldedSeed).encryptionPublicKey)
      .replace(/^0x/, "")
      .toLowerCase();
  };

  return { tax: resolve("TAX"), social: resolve("SOCIAL") };
}
