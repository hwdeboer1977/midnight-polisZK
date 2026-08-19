import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Salary commitment openings: how they are derived, and how they are stored on
 * chain so losing a local file is survivable.
 *
 * A commitment is `H(salary, nonce)`. The commitment itself lives on chain
 * forever, keyed by period — but a commitment nobody can open proves nothing,
 * and until now the only copy of the nonces was `payroll-secrets.json`. Losing
 * that file lost the ability to demonstrate what anyone was paid, permanently
 * and silently.
 *
 * Two independent changes fix that, and either alone would leave a gap:
 *
 *   1. Nonces are DERIVED, not random. Everything needed to recompute them is
 *      the wallet secret the employer already backs up, so there is no second
 *      secret that can be lost separately from the wallet.
 *
 *   2. The opening is SEALED and stored on chain. Derivation recovers the
 *      nonce, but opening a commitment also needs the salary — and if the
 *      roster spreadsheet is gone too, a derived nonce alone is not enough.
 *      Sealed openings put the amount on chain as well, readable only by the
 *      employer's key.
 *
 * Together: the chain holds everything, and one backed-up wallet secret opens
 * it. Nothing on the employer's disk is load-bearing any more.
 */

/** Bytes of ciphertext stored per employee per period. Must match payroll.compact. */
export const SEALED_BYTES = 68;

const IV_BYTES = 12;
const TAG_BYTES = 16;
const SALARY_BYTES = 8;
const NONCE_BYTES = 32;

/** 8-byte salary + 32-byte nonce. */
const PLAINTEXT_BYTES = SALARY_BYTES + NONCE_BYTES;

/**
 * Domain separators. Every derived value is tagged with what it is for, so the
 * nonce key and the sealing key can never collide even though both descend from
 * the same wallet secret.
 */
const DOMAIN = {
  employer: "polisZK/employer/v1",
  nonce: "polisZK/nonce/v1",
  seal: "polisZK/seal/v1",
} as const;

function sha256(...parts: (string | Uint8Array)[]): Buffer {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(typeof part === "string" ? part : Buffer.from(part));
  return hash.digest();
}

/**
 * The employer's root secret for one payroll instance.
 *
 * Bound to the contract address as well as the wallet, so the same employer
 * running two instances derives unrelated nonces for each. Without that, two
 * instances filing the same period would produce identical commitments for
 * identical salaries, which leaks equality across contracts that are supposed
 * to know nothing about each other.
 */
export function deriveEmployerKey(masterSeedHex: string, contractAddress: string): Buffer {
  return sha256(DOMAIN.employer, masterSeedHex.toLowerCase(), contractAddress.toLowerCase());
}

/**
 * The nonce for one employee in one period.
 *
 * Deterministic, so it can be recomputed forever from the wallet secret. Keyed
 * by period and index so no two commitments share a nonce — two employees on
 * the same salary must not produce the same commitment.
 */
export function deriveNonce(employerKey: Buffer, period: number, index: number): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.nonce, employerKey, `${period}:${index}`));
}

function sealingKey(employerKey: Buffer): Buffer {
  return sha256(DOMAIN.seal, employerKey);
}

/**
 * Encrypts one opening for storage on chain.
 *
 * The IV is random and stored alongside the ciphertext rather than derived from
 * (period, index). Deriving it would be smaller, but a period can legitimately
 * be re-filed — a correction to a month already submitted is the reason the
 * ledger is keyed by period at all — and a re-file would then reuse the same IV
 * with the same key on different plaintext. For GCM that does not merely weaken
 * the ciphertext, it leaks the XOR of the two salaries and destroys the
 * authentication guarantee. Twelve bytes is a cheap price.
 */
export function sealOpening(
  employerKey: Buffer,
  salaryMinor: bigint,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`nonce must be ${NONCE_BYTES} bytes, got ${nonce.length}`);
  }
  if (salaryMinor < 0n || salaryMinor >= 1n << BigInt(SALARY_BYTES * 8)) {
    throw new Error(`salary ${salaryMinor} does not fit in ${SALARY_BYTES} bytes`);
  }

  const plaintext = Buffer.alloc(PLAINTEXT_BYTES);
  plaintext.writeBigUInt64BE(salaryMinor, 0);
  plaintext.set(nonce, SALARY_BYTES);

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", sealingKey(employerKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const sealed = Buffer.concat([iv, ciphertext, cipher.getAuthTag()]);

  if (sealed.length !== SEALED_BYTES) {
    throw new Error(`sealed opening is ${sealed.length} bytes, expected ${SEALED_BYTES}`);
  }
  return new Uint8Array(sealed);
}

/**
 * Decrypts one opening read back from chain.
 *
 * Throws on a wrong key rather than returning nonsense: GCM authenticates, so a
 * blob sealed by a different wallet fails loudly instead of yielding a
 * plausible-looking salary that would not match its commitment.
 */
export function openSealed(
  employerKey: Buffer,
  sealed: Uint8Array
): { salaryMinor: bigint; nonce: Uint8Array } {
  if (sealed.length !== SEALED_BYTES) {
    throw new Error(`sealed opening is ${sealed.length} bytes, expected ${SEALED_BYTES}`);
  }

  const buffer = Buffer.from(sealed);
  const iv = buffer.subarray(0, IV_BYTES);
  const ciphertext = buffer.subarray(IV_BYTES, IV_BYTES + PLAINTEXT_BYTES);
  const tag = buffer.subarray(IV_BYTES + PLAINTEXT_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", sealingKey(employerKey), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return {
    salaryMinor: plaintext.readBigUInt64BE(0),
    nonce: new Uint8Array(plaintext.subarray(SALARY_BYTES)),
  };
}

/** An all-zero blob, for periods filed before sealing existed. */
export function isSealed(sealed: Uint8Array): boolean {
  return sealed.length === SEALED_BYTES && sealed.some((byte) => byte !== 0);
}
