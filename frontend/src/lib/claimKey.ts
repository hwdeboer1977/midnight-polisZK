import { loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";

/**
 * The claimant's claim key: 32 random bytes she keeps in a file.
 *
 * What it is for: `claim` builds its nullifier from this key, so it is the one
 * secret that decides whether two benefit claims can be linked to the same
 * person. `fund.compact` is explicit about the alternative — a nullifier keyed
 * on a coin public key would be computable by everyone who has ever paid her,
 * and they could then read her entire benefit history off a public Set. Hence a
 * secret, and hence one she alone holds.
 *
 * ── Why a file, and not a passphrase ────────────────────────────────────────
 *
 * It was a passphrase until 2026-08-26: PBKDF2-SHA256 at 600,000 iterations,
 * salted with her coin public key. That had one virtue — nothing to store — and
 * one flaw that outweighed it.
 *
 * `claimKeyHash` is not secret. It travels in clear in her claim bundle and in
 * the employer's termination opening, and the salt is her coin public key,
 * which is an address she hands out to be paid. So anyone holding a bundle had
 * an offline grinding target: guess, PBKDF2, hash, compare. Money was never at
 * risk — `claim` also asserts `payeeBinding` against `ownPublicKey()`, so a
 * guessed key spends nothing — but the linkability the passphrase existed to
 * protect was recoverable at the strength of whatever words she chose. The
 * property was resting on passphrase entropy, and nothing in the UI ever told
 * her so.
 *
 * Random 32 bytes end that: `claimKeyHash` becomes the image of a uniform
 * secret and there is nothing to grind at any budget.
 *
 * The obvious objection is that she now has a file to lose. Two answers. She
 * already must keep files to claim at all — the final payslip is required, and
 * it carries her salary in clear, so the bar for "a file she looks after" was
 * already set higher than this. And a file can be copied, backed up and put in
 * a password manager, where a memorised passphrase can only be backed up by
 * writing it down, which makes it a worse-managed file.
 *
 * ── Why not sealed to her wallet, which would need no file at all ───────────
 *
 * Because nothing can open it again. The DApp connector exposes no decrypt
 * operation — verified against 4.0.1 and against the 4.1.0 canary of
 * 2026-08-19, which adds only proving surface — so a claim key encrypted to her
 * `shieldedEncryptionPublicKey` is ciphertext with no reader, forever. The same
 * wall rules out sealing it on chain: a seal needs a holder, her employer must
 * not be one, her wallet cannot be one, and a password brings back the thing
 * this change removes.
 *
 * Deriving from a wallet signature fails too, and that one was re-measured
 * rather than inherited: see `frontend/public/signdata-determinism.html` and
 * the record in README.md. 1AM returns different bytes for the same message.
 *
 * ── What did not change ─────────────────────────────────────────────────────
 *
 * The anchor is still write-once. Her employer writes `claimKeyHash` into a
 * termination attestation that can be made once, so a key created AFTER that
 * point is one no claim can use. Generating a fresh file is now a millisecond's
 * work rather than a decision, which makes that failure easier to walk into,
 * not harder — hence the guards in `ClaimKey.tsx`.
 */

/** Bumped only for a breaking layout change, so an old file fails loudly. */
export const CLAIM_KEY_FILE_VERSION = 1;

/**
 * What the file says it is.
 *
 * Present because three JSON files travel between the same people — a payslip,
 * a termination opening and a claim bundle — and they are told apart by their
 * fields rather than by their names. A `kind` makes the wrong-file error a
 * sentence instead of a missing-property failure.
 */
export const CLAIM_KEY_FILE_KIND = "polisZK/claim-key";

export interface ClaimKeyFile {
  v: number;
  kind: string;
  /** Hex. Whose wallet this key was made for — checked, never trusted. */
  coinPublicKey: string;
  /** Hex, 32 bytes. The nullifier secret. */
  claimKey: string;
  /** Hex, 32 bytes. Redundant, and checked against the key on load. */
  claimKeyHash: string;
  created: string;
}

/** 32 bytes from the platform CSPRNG. The whole of the new scheme. */
export function generateClaimKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
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
  /** Give this to the employer. Public, and useless without the key. */
  claimKeyHash: string;
  /** The secret itself. Held only as long as the caller holds it. */
  claimKey: Uint8Array;
}

/** A new identity: random key, and the hash to hand over. */
export async function createClaimIdentity(): Promise<ClaimIdentity> {
  const claimKey = generateClaimKey();
  return { claimKey, claimKeyHash: await claimKeyHash(claimKey) };
}

export async function buildClaimKeyFile(
  identity: ClaimIdentity,
  coinPublicKey: string
): Promise<ClaimKeyFile> {
  return {
    v: CLAIM_KEY_FILE_VERSION,
    kind: CLAIM_KEY_FILE_KIND,
    coinPublicKey: keyToHex(coinPublicKey),
    claimKey: bytesToHex(identity.claimKey),
    claimKeyHash: identity.claimKeyHash,
    created: new Date().toISOString(),
  };
}

/**
 * What the file is called.
 *
 * `claim-key-<wallet>.json`, matching `payee-cli.ts` — and that match is the
 * reason, so the history is worth keeping.
 *
 * It was `incomelayer-benefit-key-…` for a while, on the argument that a name
 * is the whole of the explanation for most people: "claim key" required knowing
 * what a claim key IS before the file meant anything, when the instruction is
 * only keep this, you will need it if you ever claim, nobody can replace it.
 * That argument is still true of the employee reading it cold, and it is why
 * the surrounding copy goes on calling this a benefit key file.
 *
 * What outweighed it: the CLI has always written `claim-key-…`, so the two
 * halves of one system handed the same 32 bytes to people under two names, and
 * an employer holding both a payslip and a key file had no word in common
 * between them. A file that two tools disagree about the name of is worse than
 * a file named in jargon — the jargon can be explained in the sentence next to
 * it, the disagreement cannot be explained at all.
 *
 * Not `identity` or `account`, both of which were considered and are wrong in
 * ways worth recording. There IS no account here — `steps_employee.md` opens on
 * that — and "account" imports the one promise this file cannot keep, that a
 * provider can reset it. "Identity" is worse: the WALLET is the identity, since
 * `claim` rebuilds `payeeBinding` from `ownPublicKey()`, so a file named for
 * her identity that cannot restore her wallet invites exactly the wrong
 * conclusion at exactly the wrong moment.
 *
 * Still tagged with the wallet. Someone holding files for two people needs to
 * tell them apart before opening either — and without it a second download
 * lands as `claim-key (1).json`, which is indistinguishable from the first in
 * the place it matters. Not tagged with a NAME, unlike the payslip and the
 * termination opening: this is written on the employee's own page, from their
 * wallet key alone, and there is no roster in scope to read a name from.
 */
export function claimKeyFilename(coinPublicKey: string): string {
  return `claim-key-${keyToHex(coinPublicKey).slice(0, 8)}.json`;
}

/**
 * Creates the file and hands it to the browser.
 *
 * Shared rather than written twice, because it is reachable from two places —
 * the prompt on Salary and the panel on Unemployment benefit — and those two
 * must produce a byte-identical file. Both only appear when no key is known, so
 * there is still exactly one moment at which 32 bytes come into existence.
 */
export async function downloadClaimKeyFile(
  identity: ClaimIdentity,
  coinPublicKey: string
): Promise<void> {
  const file = await buildClaimKeyFile(identity, coinPublicKey);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = claimKeyFilename(coinPublicKey);
  anchor.click();
  URL.revokeObjectURL(url);
}

const HEX_32 = /^[0-9a-f]{64}$/i;

/**
 * Reads a claim-key file, and re-derives the hash rather than believing it.
 *
 * The stored hash is a convenience for the employer-facing display; the one
 * that matters is the one the fund's circuit computes from the key. Checking
 * them against each other catches a truncated download or an edited file here,
 * where it can be named, instead of at the anchor comparison where it would
 * read as "wrong claim key".
 */
export async function parseClaimKeyFile(text: string): Promise<ClaimIdentity & { coinPublicKey: string }> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nothing to read");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      "That is not a claim-key file. Open the .json you downloaded when you set " +
        "up your claim key."
    );
  }

  const file = parsed as ClaimKeyFile;

  // Named before the field checks, because the three files that travel between
  // these people look alike and the useful error is which one this is.
  if (file?.kind !== CLAIM_KEY_FILE_KIND) {
    const other = parsed as { leaf?: unknown; nonce?: unknown; gross?: unknown };
    if (other?.leaf) {
      throw new Error("That is your claim bundle, not your claim key. Both are needed, in their own slots.");
    }
    if (other?.gross && other?.nonce) {
      throw new Error("That is a payslip, not your claim key. Both are needed, in their own slots.");
    }
    throw new Error("That file is not a claim key — it does not say it is one.");
  }

  if (file.v !== CLAIM_KEY_FILE_VERSION) {
    throw new Error(
      `That claim-key file is version ${file.v}, and this page reads version ${CLAIM_KEY_FILE_VERSION}.`
    );
  }
  if (typeof file.claimKey !== "string" || !HEX_32.test(file.claimKey)) {
    throw new Error("That claim-key file has no usable key in it.");
  }

  const claimKey = fromHex(file.claimKey);
  const recomputed = await claimKeyHash(claimKey);
  if (typeof file.claimKeyHash === "string" && file.claimKeyHash.toLowerCase() !== recomputed) {
    throw new Error(
      "That claim-key file is damaged — the key inside it does not produce the hash " +
        "recorded alongside it. Use another copy if you have one."
    );
  }

  return {
    claimKey,
    claimKeyHash: recomputed,
    coinPublicKey: String(file.coinPublicKey ?? ""),
  };
}

function fromHex(value: string): Uint8Array {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * LEGACY: the passphrase derivation, kept because anchors are write-once.
 *
 * Anyone whose employer already wrote a `claimKeyHash` derived this way must
 * still be able to claim — the attestation cannot be re-pointed at a new key,
 * so removing this would strand them permanently rather than inconvenience
 * them. It is offered on the claim form as a fallback and nowhere else: no new
 * claim key is created this way.
 *
 * The salt binds the key to her coin public key so two people who chose the
 * same passphrase did not derive the same claim key.
 */
export const KDF_ITERATIONS = 600_000;

export function claimKeySalt(coinPublicKeyHex: string): string {
  return `polisZK/claim-key/v1|${coinPublicKeyHex.toLowerCase()}`;
}

const encoder = new TextEncoder();

export async function deriveLegacyClaimKey(
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
