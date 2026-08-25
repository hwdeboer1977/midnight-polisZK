import { loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";

/**
 * The claimant's claim key, derived in her own browser.
 *
 * What it is for: `claim` builds its nullifier from this key, so it is the one
 * secret that decides whether two benefit claims can be linked to the same
 * person. `fund.compact` is explicit about the alternative — a nullifier keyed
 * on a coin public key would be computable by everyone who has ever paid her,
 * and they could then read her entire benefit history off a public Set. Hence a
 * secret, and hence one she alone holds.
 *
 * Why a passphrase, and not her wallet. Exactly the reasoning already recorded
 * in `openings.ts` for the employer's key, and it lands the same way for her:
 * no extension hands a page its seed, the connector signs non-deterministically
 * so a signature cannot be a root, and it exposes no decrypt operation. A
 * passphrase is a secret she must keep. It buys the only property that matters:
 * a key she can reproduce, from any browser, for as long as she remembers it.
 *
 * ⚠️ This is NOT the key `npm run payee <seed> -- --claim-key` produces. That
 * one is `sha256("polisZK/claim/v1", shieldedSeed)` and needs a seed, which a
 * browser wallet will never surrender. The two roots are different by
 * necessity, so an employee is anchored under one route or the other and must
 * claim under the same one. Wallet-based employees use this; the seed-based
 * test employees use the CLI.
 *
 * The salt binds the key to her coin public key so two people who choose the
 * same passphrase do not derive the same claim key — which would let either of
 * them spend the other's nullifier window.
 */

const encoder = new TextEncoder();

/**
 * PBKDF2 work factor. The same figure the employer's key uses, for the same
 * reason: the input is a human-chosen passphrase, and a single hash would let
 * anyone holding the public anchor grind candidates at billions per second.
 */
export const KDF_ITERATIONS = 600_000;

export function claimKeySalt(coinPublicKeyHex: string): string {
  return `polisZK/claim-key/v1|${coinPublicKeyHex.toLowerCase()}`;
}

/** 32 bytes, from her passphrase and her own coin public key. */
export async function deriveClaimKey(
  passphrase: string,
  coinPublicKey: string
): Promise<Uint8Array> {
  if (!passphrase) throw new Error("A passphrase is required");

  // Accepts the connector's Bech32m or raw hex, so a key copied from either
  // place salts identically. A mismatch here would derive a different key from
  // the same passphrase and the failure would only surface at her claim.
  const hex = keyToHex(coinPublicKey);

  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(claimKeySalt(hex)) as BufferSource,
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256
  );
  return new Uint8Array(bits);
}

/**
 * The anchor her employer writes into the termination attestation.
 *
 * Computed by the fund's own pure circuit rather than reimplemented, because
 * `claim` asserts `leaf.claimKeyHash == persistentHash<Bytes<32>>(claimKey)` —
 * a second implementation that disagreed would produce an anchor she could
 * never open, discovered at the worst possible moment.
 */
export async function claimKeyHash(claimKey: Uint8Array): Promise<string> {
  const fund = (await loadContract("fund")) as any;
  return bytesToHex(fund.pureCircuits.claimKeyHash(claimKey));
}

export interface ClaimIdentity {
  /** Give this to the employer. Public, and useless without the passphrase. */
  claimKeyHash: string;
  /** Kept here only as long as the caller holds it. Never displayed. */
  claimKey: Uint8Array;
}

export async function deriveClaimIdentity(
  passphrase: string,
  coinPublicKey: string
): Promise<ClaimIdentity> {
  const claimKey = await deriveClaimKey(passphrase, coinPublicKey);
  return { claimKey, claimKeyHash: await claimKeyHash(claimKey) };
}
