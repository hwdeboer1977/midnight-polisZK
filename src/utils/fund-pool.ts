import crypto from "crypto";
import fs from "fs";
import {
  CompactTypeField,
  CompactTypeVector,
  convertBytesToField,
  degradeToTransient,
  transientHash,
  upgradeFromTransient,
} from "@midnight-ntwrk/compact-runtime";

/**
 * The fund's side of its own money.
 *
 * `fundBenefits` receives a shielded coin and the contract keeps only an
 * ordinal — `poolOrdinal`, which coin of its receipts the pool is. It does NOT
 * keep the nonce, and `fund.compact` says why: publishing a nonce alongside the
 * public coin commitment would let anyone try candidate values until one
 * matched, recovering the pool balance and with it every benefit ever paid,
 * from the differences between claims.
 *
 * The consequence is unavoidable and worth stating plainly: the nonce exists in
 * exactly one place, this file, and if it is lost the coin cannot be described
 * to `claim` again. The money stays in the contract and nothing can spend it.
 * There is no recovery path — a nonce is 32 random bytes, and the only thing
 * that could confirm a guess is the commitment, which is what makes guessing
 * infeasible in the first place.
 *
 * So the deposit is written here BEFORE the transaction is submitted, not
 * after. A crash between the two leaves a `pending` entry that may or may not
 * describe a real coin, which is recoverable by looking; the other order leaves
 * a real coin nobody can describe, which is not.
 */

const FILE = "fund-pool.json";

export interface DepositRecord {
  /**
   * The coin's nonce, hex. 32 random bytes, generated here, recorded nowhere
   * else — see the note above.
   */
  nonce: string;
  /** The token's colour, hex. pEUR, and fixed for the contract's lifetime. */
  color: string;
  /** Minor units, as a string: JSON has no bigint. */
  value: string;
  /**
   * Which of the contract's receipts this coin is, read back from `poolOrdinal`
   * after the call. `null` while pending — the ordinal only exists once the
   * transaction has landed.
   */
  ordinal: number | null;
  txHash: string | null;
  /**
   * `pending` means the record was written but the transaction was never
   * confirmed to this process. It may still have landed: check `fund pool`
   * against the contract's `coinsReceived` before assuming either way.
   */
  status: "pending" | "confirmed";
  depositedAt: string;
}

interface PoolEntry {
  networkId: string;
  contractAddress: string;
  deposits: DepositRecord[];
}

type PoolFile = Record<string, PoolEntry>;

/**
 * Keyed by contract address as well as network. A redeployed fund is a
 * different contract holding different coins, and merging the two records would
 * offer `claim` a nonce from a contract that never received it.
 */
function key(networkId: string, contractAddress: string): string {
  return `${networkId}/fund/${contractAddress}`;
}

function read(): PoolFile {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as PoolFile;
  } catch {
    // Overwriting a damaged file would destroy the only copy of every nonce in
    // it, so a parse failure stops the command rather than starting fresh.
    throw new Error(
      `${FILE} is not readable JSON. It holds the only copy of the fund's coin ` +
        `nonces — fix or move the file by hand rather than letting a deposit overwrite it.`
    );
  }
}

function write(all: PoolFile): void {
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
}

export function listDeposits(
  networkId: string,
  contractAddress: string
): DepositRecord[] {
  return read()[key(networkId, contractAddress)]?.deposits ?? [];
}

/** A fresh coin nonce. Nothing derives it: it is random and it is kept. */
export function freshNonce(): Uint8Array {
  return Uint8Array.from(crypto.randomBytes(32));
}

/**
 * Writes the deposit before it is submitted. Returns nothing useful — the point
 * is that it is on disk when the caller goes on to prove and submit.
 */
export function recordPending(
  networkId: string,
  contractAddress: string,
  deposit: { nonce: Uint8Array; color: Uint8Array; value: bigint }
): void {
  const all = read();
  const k = key(networkId, contractAddress);
  const entry: PoolEntry = all[k] ?? { networkId, contractAddress, deposits: [] };

  entry.deposits.push({
    nonce: Buffer.from(deposit.nonce).toString("hex"),
    color: Buffer.from(deposit.color).toString("hex"),
    value: deposit.value.toString(),
    ordinal: null,
    txHash: null,
    status: "pending",
    depositedAt: new Date().toISOString(),
  });

  all[k] = entry;
  write(all);
}

/** Fills in what only exists after the transaction landed. */
export function confirmDeposit(
  networkId: string,
  contractAddress: string,
  nonce: Uint8Array,
  landed: { txHash: string; ordinal: number }
): void {
  const all = read();
  const k = key(networkId, contractAddress);
  const hex = Buffer.from(nonce).toString("hex");
  const record = all[k]?.deposits.find((d) => d.nonce === hex);
  if (!record) throw new Error(`No deposit recorded for nonce ${hex.slice(0, 16)}…`);

  record.status = "confirmed";
  record.txHash = landed.txHash;
  record.ordinal = landed.ordinal;
  write(all);
}

/**
 * Records a coin the fund produced itself, rather than one that was deposited.
 *
 * A claim spends a pool coin and returns the remainder as a change coin whose
 * nonce is derived, not published — so it never passes through `recordPending`
 * and would otherwise exist nowhere. The caller must have VERIFIED it first:
 * `fund reconcile` reproduces the coin's on-chain commitment before calling
 * this, because a wrong entry here is indistinguishable from a right one until
 * someone tries to spend it.
 *
 * ⚠️ The value cannot be derived, only checked. The benefit a claim paid is
 * private, so the operator does not know what the change came to — they must be
 * told, or work it out. That is not an oversight in this file: it is the same
 * property that stops an observer reading the pool balance, seen from the
 * inside.
 */
export function recordDerived(
  networkId: string,
  contractAddress: string,
  coin: { nonce: Uint8Array; color: Uint8Array; value: bigint; ordinal: number }
): void {
  const all = read();
  const k = key(networkId, contractAddress);
  const entry: PoolEntry = all[k] ?? { networkId, contractAddress, deposits: [] };
  const nonce = Buffer.from(coin.nonce).toString("hex");
  if (entry.deposits.some((d) => d.nonce === nonce)) return;

  entry.deposits.push({
    nonce,
    color: Buffer.from(coin.color).toString("hex"),
    value: coin.value.toString(),
    ordinal: coin.ordinal,
    txHash: null,
    status: "confirmed",
    depositedAt: new Date().toISOString(),
  });
  all[k] = entry;
  write(all);
}

/** Where the nonces live, for messages that tell an operator to back it up. */
export function poolFile(): string {
  return FILE;
}

// ── Where the pool moves when a benefit is paid ──────────────────────────────

const FIELD_PAIR = new CompactTypeVector<bigint>(2, CompactTypeField);

/**
 * `sendShielded` splits the coin it spends and derives both halves' nonces from
 * the input's, under these two separators. Read off the compiled circuit in
 * `contracts/managed/fund/contract/index.js` rather than off documentation, so
 * it matches the code that actually runs.
 */
function evolve(nonce: Uint8Array, separator: string): Uint8Array {
  const bytes = new TextEncoder().encode(separator);
  return upgradeFromTransient(
    transientHash(FIELD_PAIR, [
      convertBytesToField(bytes.length, bytes, "<standard library>"),
      degradeToTransient(nonce),
    ])
  );
}

/** The nonce of the coin sent to the recipient. */
export function evolveSentNonce(nonce: Uint8Array): Uint8Array {
  return evolve(nonce, "midnight:kernel:nonce_evolve");
}

/**
 * The nonce of the change coin that comes back to the contract — the pool's
 * next nonce after a claim, and the reason a deposit record does not go stale
 * the moment somebody is paid.
 *
 * ⚠️ Derived from the compiled circuit and never yet exercised against a real
 * claim, because none has been made. The first claim is what confirms it: if
 * `fund pool` then reports a change coin whose commitment the indexer does not
 * show, this derivation is where to look before anything else.
 */
export function evolveChangeNonce(nonce: Uint8Array): Uint8Array {
  return evolve(nonce, "midnight:kernel:nonce_evolve/2");
}
