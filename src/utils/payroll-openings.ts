// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from "crypto";

/**
 * Salary commitment openings: how they are derived, and how they are stored on
 * chain so losing a local file is survivable.
 *
 * A commitment is `H(salary, nonce)`. The commitment lives on chain forever,
 * keyed by period — but a commitment nobody can open proves nothing, and the
 * only copy of the nonces used to be `payroll-secrets.json`. Losing that file
 * lost the ability to demonstrate what anyone was paid, permanently and
 * silently.
 *
 * Two independent changes fix that, and either alone leaves a gap:
 *
 *   1. Nonces are DERIVED from a passphrase, not random. Everything needed to
 *      recompute them is one secret the employer already has to remember, so
 *      there is no file whose loss is unrecoverable.
 *
 *   2. The opening is SEALED and stored on chain. Derivation recovers the
 *      nonce, but opening a commitment also needs the salary — and if the
 *      roster spreadsheet is gone too, a derived nonce alone is not enough.
 *      Sealing puts the amount on chain as well, readable only by the employer.
 *
 * Together: the chain holds everything, and one passphrase opens it.
 *
 * The passphrase is shared with the browser deliberately. `setPayroll` requires
 * the employer's own key, so any employer who is not also the platform operator
 * must submit from their browser wallet — and a page can never reach the wallet
 * seed. Deriving from the seed here would leave every browser-filed period
 * unopenable by this tool. One root, both tools.
 */

/** Bytes of ciphertext stored per employee per period. Must match payroll.compact. */
export const SEALED_BYTES = 100;

const IV_BYTES = 12;
const TAG_BYTES = 16;
const SALARY_BYTES = 8;
const NONCE_BYTES = 32;

/**
 * Four 8-byte amounts, the weeks worked padded to 8, and the 32-byte nonce.
 *
 * Weeks is one byte of information stored in eight. Padding keeps every field
 * on an 8-byte boundary, which makes the layout readable at a glance and costs
 * seven bytes in a blob that is already 100.
 */
const AMOUNTS = 4;
const WEEKS_BYTES = 8;
const PLAINTEXT_BYTES = SALARY_BYTES * AMOUNTS + WEEKS_BYTES + NONCE_BYTES;

/**
 * Domain separators. Every derived value is tagged with what it is for, so the
 * nonce key and the sealing key can never collide even though both descend from
 * the same wallet secret.
 */
const DOMAIN = {
  nonce: "polisZK/nonce/v1",
  seal: "polisZK/seal/v1",
  employee: "polisZK/employee/v1",
  coin: "polisZK/coin/v1",
  termination: "polisZK/termination/v1",
  claim: "polisZK/claim/v1",
} as const;

/**
 * PBKDF2 work factor. Must match `frontend/src/lib/openings.ts` exactly — the
 * two derive the same key from the same passphrase, and that is what lets a
 * period filed in the browser be recovered here.
 */
export const KDF_ITERATIONS = 600_000;

/** Salt: binds the key to one instance, so two contracts never share a key. */
export function kdfSalt(contractAddress: string): string {
  return `polisZK/kdf/v1|${contractAddress.toLowerCase()}`;
}

function sha256(...parts: (string | Uint8Array)[]): Buffer {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(typeof part === "string" ? part : Buffer.from(part));
  return hash.digest();
}

/**
 * The employer's root secret for one payroll instance.
 *
 * A passphrase rather than the wallet seed, because the browser cannot reach a
 * seed and both tools must derive the same key: `setPayroll` requires the
 * employer's own signature, and for any employer who is not also the operator
 * that means submitting from the browser wallet. A root only the CLI could
 * compute would leave those periods permanently unopenable here.
 *
 * PBKDF2 rather than a plain hash because the input is human-chosen: a single
 * SHA-256 would let anyone holding the public commitments grind candidate
 * passphrases at billions per second. The salt binds the key to the contract,
 * so the same passphrase on two instances yields unrelated keys.
 */
export function deriveEmployerKey(passphrase: string, contractAddress: string): Buffer {
  return pbkdf2Sync(
    passphrase,
    kdfSalt(contractAddress),
    KDF_ITERATIONS,
    32,
    "sha256"
  );
}

/**
 * A fingerprint of the derived key, for spotting a mistyped passphrase.
 *
 * One-way, and computed over the derived key rather than the passphrase.
 */
export function keyFingerprint(employerKey: Buffer): string {
  return sha256("polisZK/fingerprint/v1", employerKey).toString("hex");
}

/**
 * The nonce for one employee in one period.
 *
 * Deterministic, so it can be recomputed forever from the wallet secret. Keyed
 * by period and index so no two commitments share a nonce — two employees on
 * the same salary must not produce the same commitment.
 */
/**
 * The nonces for a period's two withholding coins.
 *
 * Byte-identical to `withholdingCoinNonce` in `frontend/src/lib/openings.ts` —
 * the browser funds these coins and this side spends them when remitting, so a
 * difference between the two means money the contract holds and neither tool
 * can describe. `tests/withholding-nonce.test.mjs` checks the two agree.
 */
export function withholdingCoinNonce(
  employerKey: Buffer,
  period: number,
  round: number,
  which: "tax" | "social"
): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.coin, employerKey, `${period}:${round}:${which}`));
}

export function deriveNonce(employerKey: Buffer, period: number, index: number): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.nonce, employerKey, `${period}:${index}`));
}

/**
 * The blinding nonce for one employee's termination attestation.
 *
 * Derived rather than random, for the reason every nonce here is: the employer
 * has to be able to rebuild the opening later. A termination is attested once
 * and consumed months afterwards, by a relay that was not running at the time,
 * so a random nonce would have to survive in a file nobody thought to keep.
 */
export function deriveTerminationNonce(
  employerKey: Buffer,
  period: number,
  index: number
): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.termination, employerKey, `${period}:${index}`));
}

/**
 * A claimant's claim key, from their own shielded seed.
 *
 * Never from the coin public key. That key is an address handed out to be paid,
 * so anything derived from it is computable by everyone who has ever paid this
 * person — and the nullifier built on this key would then reveal their benefit
 * history to exactly those people. Domain-separated so it is unrelated to any
 * other key the same seed produces.
 */
export function deriveClaimKey(shieldedSeed: Uint8Array): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.claim, Buffer.from(shieldedSeed)));
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
export interface PayrollLine {
  grossMinor: bigint;
  taxMinor: bigint;
  socialMinor: bigint;
  netMinor: bigint;
  weeks: number;
}

export function sealOpening(
  employerKey: Buffer,
  line: PayrollLine,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`nonce must be ${NONCE_BYTES} bytes, got ${nonce.length}`);
  }

  const amounts = [line.grossMinor, line.taxMinor, line.socialMinor, line.netMinor];
  for (const amount of amounts) {
    if (amount < 0n || amount >= 1n << BigInt(SALARY_BYTES * 8)) {
      throw new Error(`amount ${amount} does not fit in ${SALARY_BYTES} bytes`);
    }
  }

  const plaintext = Buffer.alloc(PLAINTEXT_BYTES);
  amounts.forEach((amount, i) => plaintext.writeBigUInt64BE(amount, i * SALARY_BYTES));
  plaintext.writeBigUInt64BE(BigInt(line.weeks), SALARY_BYTES * AMOUNTS);
  plaintext.set(nonce, SALARY_BYTES * AMOUNTS + WEEKS_BYTES);

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
): PayrollLine & { nonce: Uint8Array } {
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
    grossMinor: plaintext.readBigUInt64BE(0),
    taxMinor: plaintext.readBigUInt64BE(SALARY_BYTES),
    socialMinor: plaintext.readBigUInt64BE(SALARY_BYTES * 2),
    netMinor: plaintext.readBigUInt64BE(SALARY_BYTES * 3),
    weeks: Number(plaintext.readBigUInt64BE(SALARY_BYTES * AMOUNTS)),
    nonce: new Uint8Array(plaintext.subarray(SALARY_BYTES * AMOUNTS + WEEKS_BYTES)),
  };
}

/** An all-zero blob, for periods filed before sealing existed. */
export function isSealed(sealed: Uint8Array): boolean {
  return sealed.length === SEALED_BYTES && sealed.some((byte) => byte !== 0);
}

/**
 * The seed for one employee's payment keypair.
 *
 * LEGACY. Payees come from the roster now: the employee generates their own
 * keys in their own wallet and sends the public halves to their employer.
 * Deriving them from the employer's passphrase made every salary spendable by
 * the employer, which is custodial payroll wearing a privacy costume.
 *
 * Kept because `payeeFor` is immutable: a period filed before the change
 * commits to a derived key, and paying it still needs this. Re-file such a
 * period against real keys rather than reaching for it.
 */
export function deriveEmployeeSeed(employerKey: Buffer, index: number): Uint8Array {
  return new Uint8Array(sha256(DOMAIN.employee, employerKey, String(index)));
}
