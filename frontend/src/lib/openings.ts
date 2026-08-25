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

const SEALED_BYTES = 100;
const IV_BYTES = 12;
const SALARY_BYTES = 8;
const NONCE_BYTES = 32;
/** Four 8-byte amounts, weeks padded to 8, and the 32-byte nonce. */
const AMOUNTS = 4;
const WEEKS_BYTES = 8;
const PLAINTEXT_BYTES = SALARY_BYTES * AMOUNTS + WEEKS_BYTES + NONCE_BYTES;

const DOMAIN = {
  nonce: "polisZK/nonce/v1",
  seal: "polisZK/seal/v1",
  employee: "polisZK/employee/v1",
  coin: "polisZK/coin/v1",
  termination: "polisZK/termination/v1",
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

/**
 * The blinding nonce for one employee's termination attestation.
 *
 * Byte-identical to `deriveTerminationNonce` in `src/utils/payroll-openings.ts`,
 * for the same reason the salary nonce is: an attestation made here must be
 * reopenable by the CLI and vice versa. A termination is signed once and
 * consumed months later by a relay, so a random nonce would have to survive in
 * a file nobody thought to keep.
 */
export async function deriveTerminationNonce(
  employerKey: Uint8Array,
  period: number,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.termination, employerKey, `${period}:${index}`);
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
export interface PayrollLine {
  grossMinor: bigint;
  taxMinor: bigint;
  socialMinor: bigint;
  netMinor: bigint;
  weeks: number;
}

export async function sealOpening(
  employerKey: Uint8Array,
  line: PayrollLine,
  nonce: Uint8Array
): Promise<Uint8Array> {
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`nonce must be ${NONCE_BYTES} bytes, got ${nonce.length}`);
  }

  const plaintext = new Uint8Array(PLAINTEXT_BYTES);
  const view = new DataView(plaintext.buffer);
  [line.grossMinor, line.taxMinor, line.socialMinor, line.netMinor].forEach(
    (amount, i) => view.setBigUint64(i * SALARY_BYTES, amount, false)
  );
  view.setBigUint64(SALARY_BYTES * AMOUNTS, BigInt(line.weeks), false);
  plaintext.set(nonce, SALARY_BYTES * AMOUNTS + WEEKS_BYTES);

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
): Promise<PayrollLine & { nonce: Uint8Array }> {
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

  const view = new DataView(plaintext.buffer, plaintext.byteOffset, plaintext.byteLength);
  return {
    grossMinor: view.getBigUint64(0, false),
    taxMinor: view.getBigUint64(SALARY_BYTES, false),
    socialMinor: view.getBigUint64(SALARY_BYTES * 2, false),
    netMinor: view.getBigUint64(SALARY_BYTES * 3, false),
    weeks: Number(view.getBigUint64(SALARY_BYTES * AMOUNTS, false)),
    nonce: plaintext.slice(SALARY_BYTES * AMOUNTS + WEEKS_BYTES),
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
export async function deriveEmployeeSeed(
  employerKey: Uint8Array,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.employee, employerKey, String(index));
}

/**
 * The nonce of the coin that funds one slot, for one filing round.
 *
 * Derived so the coin can be rebuilt at payday. Distinct from the salary nonce
 * — that one opens a commitment, this one identifies a coin — hence a separate
 * domain tag.
 *
 * The round matters: re-filing a period and funding it again would otherwise
 * rebuild the identical coin, and Zswap rejects a duplicate commitment. The
 * contract counts filings per period, so the round is read from chain and the
 * nonce stays reconstructible.
 */
/**
 * The nonces for a period's two withholding coins.
 *
 * `fundWithholding` receives one coin carrying the period's tax and one
 * carrying its contribution, and `remitTax`/`remitSocial` have to rebuild those
 * same coins later to spend them — possibly from the CLI, months afterwards.
 * So they are derived, like every other nonce here, rather than random.
 *
 * Labelled `tax` and `social` rather than numbered, which is what keeps them
 * clear of the per-employee coins: an employee slot produces `202601:0:3`, and
 * these produce `202601:0:tax`. A number would eventually collide with a roster
 * large enough, and the collision would be a duplicate Zswap commitment — a
 * failure at funding time with nothing pointing at the cause.
 *
 * Byte-identical to `withholdingCoinNonce` in `src/utils/payroll-openings.ts`.
 * The browser funds these coins and the CLI spends them, so a difference
 * between the two implementations means money the contract holds and neither
 * tool can describe.
 */
export async function withholdingCoinNonce(
  employerKey: Uint8Array,
  period: number,
  round: number,
  which: "tax" | "social"
): Promise<Uint8Array> {
  return sha256(DOMAIN.coin, employerKey, `${period}:${round}:${which}`);
}

export async function sealedCoinNonce(
  employerKey: Uint8Array,
  period: number,
  round: number,
  index: number
): Promise<Uint8Array> {
  return sha256(DOMAIN.coin, employerKey, `${period}:${round}:${index}`);
}
