/**
 * Salary commitment openings, browser side.
 *
 * Byte-identical to `src/utils/payroll-openings.ts`: same domain separators,
 * same PBKDF2 parameters, same 68-byte AES-256-GCM layout. That is the point —
 * a period filed from this page can be recovered by the CLI and vice versa,
 * because both derive from the same root.
 *
 * The root is a PASSPHRASE, and the route to that choice is worth recording so
 * nobody re-treads it:
 *
 *   - the wallet seed is unavailable to a page, correctly — no extension will
 *     hand a web page its seed;
 *   - a wallet SIGNATURE over a fixed message was the obvious substitute, and
 *     it fails: the connector signs non-deterministically, so the same message
 *     yields a different signature every time and every derived nonce would be
 *     unreproducible. This was caught by a guard rather than in production,
 *     but only just;
 *   - encrypting to the employer's own public key would be elegant, but the
 *     connector exposes no decrypt operation, so the ciphertext could never be
 *     opened again.
 *
 * A passphrase is a secret the employer must keep, which is a real cost. It
 * buys the only property that matters here: openings that stay openable, from
 * either tool, for as long as the passphrase is remembered.
 */

const SEALED_BYTES = 68;
const IV_BYTES = 12;
const SALARY_BYTES = 8;
const NONCE_BYTES = 32;
const PLAINTEXT_BYTES = SALARY_BYTES + NONCE_BYTES;

const DOMAIN = {
  nonce: "polisZK/nonce/v1",
  seal: "polisZK/seal/v1",
  employee: "polisZK/employee/v1",
  coin: "polisZK/coin/v1",
} as const;

/**
 * PBKDF2 work factor. Must match the CLI exactly or the two derive different
 * keys and neither can open the other's openings.
 */
export const KDF_ITERATIONS = 600_000;

/** Salt: binds the key to one instance, so two contracts never share a key. */
export function kdfSalt(contractAddress: string): string {
  return `polisZK/kdf/v1|${contractAddress.toLowerCase()}`;
}

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(...parts: (string | Uint8Array)[]): Promise<Uint8Array> {
  let total = 0;
  const chunks = parts.map((part) =>
    typeof part === "string" ? encoder.encode(part) : part
  );
  for (const chunk of chunks) total += chunk.length;

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", joined));
}

/**
 * The employer's root secret for one payroll instance.
 *
 * PBKDF2 rather than a plain hash because the input is a human-chosen
 * passphrase: a single SHA-256 would let anyone holding the public commitments
 * grind candidate passphrases at billions per second. The salt binds the key to
 * the contract, so the same passphrase on two instances yields unrelated keys
 * and identical salaries do not produce identical commitments across them.
 */
export async function deriveEmployerKey(
  passphrase: string,
  contractAddress: string
): Promise<Uint8Array> {
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
      salt: encoder.encode(kdfSalt(contractAddress)) as BufferSource,
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256
  );
  return new Uint8Array(bits);
}

/** The nonce for one employee in one period. Deterministic, hence recoverable. */
export async function deriveNonce(
  employerKey: Uint8Array,
  period: number,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.nonce, employerKey, `${period}:${index}`);
}

async function sealingKey(employerKey: Uint8Array): Promise<CryptoKey> {
  const raw = await sha256(DOMAIN.seal, employerKey);
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypts one opening for storage on chain.
 *
 * The IV is random and stored rather than derived from (period, index): a
 * period may legitimately be re-filed as a correction, and a derived IV would
 * then repeat with the same key on different plaintext. Under GCM that leaks
 * the XOR of the two salaries and voids authentication.
 */
export async function sealOpening(
  employerKey: Uint8Array,
  salaryMinor: bigint,
  nonce: Uint8Array
): Promise<Uint8Array> {
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`nonce must be ${NONCE_BYTES} bytes, got ${nonce.length}`);
  }

  const plaintext = new Uint8Array(PLAINTEXT_BYTES);
  new DataView(plaintext.buffer).setBigUint64(0, salaryMinor, false);
  plaintext.set(nonce, SALARY_BYTES);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      await sealingKey(employerKey),
      plaintext as BufferSource
    )
  );

  const sealed = new Uint8Array(SEALED_BYTES);
  sealed.set(iv, 0);
  sealed.set(ciphertext, IV_BYTES);

  if (IV_BYTES + ciphertext.length !== SEALED_BYTES) {
    throw new Error(
      `sealed opening is ${IV_BYTES + ciphertext.length} bytes, expected ${SEALED_BYTES}`
    );
  }
  return sealed;
}

/** Decrypts one opening read back from chain. Throws on the wrong key. */
export async function openSealed(
  employerKey: Uint8Array,
  sealed: Uint8Array
): Promise<{ salaryMinor: bigint; nonce: Uint8Array }> {
  if (sealed.length !== SEALED_BYTES) {
    throw new Error(`sealed opening is ${sealed.length} bytes, expected ${SEALED_BYTES}`);
  }

  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sealed.subarray(0, IV_BYTES) as BufferSource, tagLength: 128 },
      await sealingKey(employerKey),
      sealed.subarray(IV_BYTES) as BufferSource
    )
  );

  return {
    salaryMinor: new DataView(
      plaintext.buffer,
      plaintext.byteOffset,
      plaintext.byteLength
    ).getBigUint64(0, false),
    nonce: plaintext.slice(SALARY_BYTES),
  };
}

/**
 * A fingerprint of the derived key, safe to keep in localStorage.
 *
 * Lets a later filing notice a mistyped passphrase before it writes a month
 * nobody can open. It is a hash of an already-derived key, not of the
 * passphrase, and it is one-way: recovering the passphrase from it would mean
 * both breaking SHA-256 and redoing the PBKDF2 work.
 */
export async function keyFingerprint(employerKey: Uint8Array): Promise<string> {
  return toHex(await sha256("polisZK/fingerprint/v1", employerKey));
}

/**
 * The seed for one employee's payment keypair. Mirrors the CLI exactly.
 *
 * Keyed by index only, never by period: a nonce changes every month, an
 * employee's key must not. See `src/utils/payroll-openings.ts` for why these
 * derived keys are custodial and what replacing them looks like.
 */
export async function deriveEmployeeSeed(
  employerKey: Uint8Array,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.employee, employerKey, String(index));
}

/**
 * The nonce of the coin that funds one slot.
 *
 * Derived so the coin can be rebuilt at payday. Distinct from the salary nonce
 * — that one opens a commitment, this one identifies a coin — hence a separate
 * domain tag, so the two can never collide.
 */
export async function sealedCoinNonce(
  employerKey: Uint8Array,
  period: number,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.coin, employerKey, `${period}:${index}`);
}
