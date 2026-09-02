// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import { dataPath } from "./data-dir.js";

/**
 * A period's claim-tree leaf DIGESTS, and nothing else.
 *
 * ── Why digests rather than the leaves ─────────────────────────────────────
 *
 * A claimant needs two things to build their Merkle path: their own leaf, and
 * the digests of everybody else's. Only the second has to come from anywhere —
 * the first they can reconstruct entirely on their own, because every field of
 * it is either public or theirs:
 *
 *   commitment, finalPeriod, instance  → on chain
 *   payeeBinding                       → payeeHash(ownPublicKey, period, instance)
 *   monthsWorked                       → count their own periods in `payeeFor`
 *
 * So serving the leaf PREIMAGES would hand out `monthsWorked`, which the chain
 * keeps inside a hash because published per slot it is a tenure record for a
 * worker. A digest discloses none of it. It is the hash of a leaf nobody can
 * invert, and it is all the path needs.
 *
 * ── Why the whole period, never one leaf ───────────────────────────────────
 *
 * Serving a single claimant "their" sibling set would tell this service which
 * leaf is theirs, which is the anonymity the claim is built to have: `claim`
 * proves membership without disclosing the leaf, so a request that names one
 * would give away off chain what the circuit protects on chain. Everyone gets
 * the same list, and which row matters stays with the claimant.
 *
 * ── What this is not ───────────────────────────────────────────────────────
 *
 * Not authoritative. The root on chain is, and a claimant rebuilding a path
 * against a tampered list simply fails to reproduce it — `claim` checks the
 * path against `rootFor`, so a wrong list costs an attempt, not a payment.
 */
export interface ClaimDigests {
  networkId: string;
  period: number;
  /** Decimal string — the root is a Field, and JSON has no bigint. */
  root: string;
  /** Leaf digests in tree order. The claimant's index is their position. */
  leafDigests: string[];
  updatedAt: string;
}

type DigestFile = Record<string, ClaimDigests>;

/**
 * Resolved through `DATA_DIR`, like `claims.json` and for the same reason: on a
 * managed host the code directory is replaced on every push, and a digest list
 * lost is a claimant who cannot build a path against a root that is still on
 * chain and still valid.
 */
function file(): string {
  return dataPath("claim-digests.json");
}

function key(networkId: string, period: number): string {
  return `${networkId}/${period}`;
}

function read(): DigestFile {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8")) as DigestFile;
  } catch {
    return {};
  }
}

/**
 * Records the digests a relay run built.
 *
 * Overwrites, because re-running the relay for a period is how a correction is
 * made: the tree that stands is the one whose root is on chain, and a stale
 * list beside a fresh root would only produce paths that fail to verify.
 */
export function putClaimDigests(
  networkId: string,
  period: number,
  root: bigint,
  digests: Uint8Array[]
): void {
  const hex = (bytes: Uint8Array): string =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const all = read();
  all[key(networkId, period)] = {
    networkId,
    period,
    root: root.toString(),
    leafDigests: digests.map(hex),
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(file(), JSON.stringify(all, null, 2));
  } catch {
    // A relay run that published a root must not fail because a convenience
    // file could not be written. The root is on chain either way, and the
    // employer's openings still rebuild the tree.
  }
}

/** One period's digests, or null when no relay run has recorded any. */
export function getClaimDigests(networkId: string, period: number): ClaimDigests | null {
  return read()[key(networkId, period)] ?? null;
}
