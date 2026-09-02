// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { loadContract } from "./contracts";

/**
 * Building a Merkle path in the browser, from digests alone.
 *
 * ── Why this can be here at all ────────────────────────────────────────────
 *
 * A path needs the claimant's own leaf digest and everybody else's, in the
 * order the relay placed them. It does NOT need anyone's leaf CONTENTS — the
 * tree is built over digests, and a digest is the hash of a leaf nobody can
 * invert. So `/api/claim-tree` serves digests and nothing is disclosed: the one
 * leaf field not already on chain is `monthsWorked`, which `payroll.compact`
 * keeps hashed because published per slot it is a tenure record.
 *
 * ── Why the whole list, and never "my path" ────────────────────────────────
 *
 * Asking the service for her path would tell it which leaf is hers, which is
 * precisely the anonymity `claim` provides by proving membership without
 * disclosing the leaf. Everyone fetches the identical list and finds their own
 * row locally, so there is nothing to correlate. A month of digests is a few
 * kilobytes.
 *
 * ── Byte-for-byte with the relay, deliberately ─────────────────────────────
 *
 * Mirrors `src/utils/claim-tree.ts`. Every hash comes from the fund's own pure
 * circuits — `treeLeaf` is its `degradeToTransient`, `treeNode` its
 * `transientHash` over a pair — for the reason that module gives: a TypeScript
 * reimplementation would be a second copy of a hash function that has to agree
 * byte for byte, and when it did not, the symptom would be a claimant whose
 * proof verifies against nothing, discovered at the moment they try to claim.
 *
 * The two copies must stay in step. If one is edited, the other is wrong, and
 * nothing here will say so — a rebuilt root simply fails to match `rootFor`.
 */
export const TREE_DEPTH = 16;

export interface PathEntry {
  sibling: bigint;
  goesLeft: boolean;
}

export interface ClaimPath {
  leaf: Uint8Array;
  path: PathEntry[];
}

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (value: string): Uint8Array => {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/** The leaf a claimant reconstructs for themselves, in the circuit's field order. */
export interface ClaimLeafInput {
  commitment: Uint8Array;
  payeeBinding: Uint8Array;
  finalPeriod: bigint;
  monthsWorked: bigint;
  instance: Uint8Array;
}

/**
 * Her own leaf digest, so she can find her row without being told which it is.
 *
 * Every field is reachable from the chain plus her wallet: the commitment from
 * `commitmentsFor`, the payee binding from `payeeHash(ownPublicKey, …)`, the
 * months worked by counting her own periods in `payeeFor`. Nobody has to
 * identify her, and she does not have to trust an answer about which leaf is
 * hers — she recomputes it and looks for the match.
 */
export async function ownLeafDigest(leaf: ClaimLeafInput): Promise<Uint8Array> {
  const fund = (await loadContract("fund")) as any;
  return fund.pureCircuits.leafDigest(leaf);
}

/**
 * Rebuilds the tree from the period's digests and returns one path.
 *
 * `digests` must be in the order the relay placed them — leaf ORDER is the
 * index into the tree, and a tree rebuilt in a different order has a different
 * root, so a path issued against one is worthless against the other. The
 * endpoint serves them in that order for exactly this reason.
 */
export async function pathFromDigests(
  digestsHex: string[],
  index: number
): Promise<{ path: ClaimPath; root: bigint }> {
  const fund = (await loadContract("fund")) as any;
  const asField = (digest: Uint8Array): bigint => fund.pureCircuits.treeLeaf(digest);
  const node = (left: bigint, right: bigint): bigint => fund.pureCircuits.treeNode(left, right);

  const digests = digestsHex.map(fromHex);
  if (!digests[index]) throw new Error(`No leaf at index ${index}`);

  // One value per level stands in for every empty subtree at that level, so a
  // depth-16 tree holding a handful of leaves costs O(leaves x depth) rather
  // than the ~131,000 hashes a dense build would.
  const empty = asField(new Uint8Array(32));
  const blanks = [empty];
  for (let level = 0; level < TREE_DEPTH; level += 1) {
    blanks.push(node(blanks[level]!, blanks[level]!));
  }

  const levels: bigint[][] = [digests.map(asField)];
  for (let level = 0; level < TREE_DEPTH; level += 1) {
    const below = levels[level]!;
    const above: bigint[] = [];
    for (let i = 0; i < below.length; i += 2) {
      const left = below[i]!;
      const right = i + 1 < below.length ? below[i + 1]! : blanks[level]!;
      above.push(node(left, right));
    }
    levels.push(above);
  }

  const path: PathEntry[] = [];
  let position = index;
  for (let level = 0; level < TREE_DEPTH; level += 1) {
    const siblingIndex = position % 2 === 0 ? position + 1 : position - 1;
    const sibling = levels[level]![siblingIndex] ?? blanks[level]!;
    // `goes_left` asks whether OUR node is the left child: it decides which
    // side the running digest is hashed on.
    path.push({ sibling, goesLeft: position % 2 === 0 });
    position = Math.floor(position / 2);
  }

  return {
    path: { leaf: digests[index]!, path },
    root: levels[TREE_DEPTH]![0] ?? blanks[TREE_DEPTH]!,
  };
}

/** Where her digest sits in the period's list, or -1 when it is not there. */
export function indexOfDigest(digestsHex: string[], own: Uint8Array): number {
  const target = hex(own).toLowerCase();
  return digestsHex.findIndex((d) => d.replace(/^0x/, "").toLowerCase() === target);
}
