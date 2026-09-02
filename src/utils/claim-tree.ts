// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

// Imported from the COMMITTED copy under `frontend/`, not `contracts/managed/`.
//
// `contracts/managed/` is gitignored build output, so it does not exist on a
// managed host — and once the server started importing this module, `tsc -p
// tsconfig.server.json` failed the deploy with TS2307 on a path that is only
// ever present on a developer's machine. The README's DATA_DIR section names this
// exact trap and prescribes this fix: resolve the contract module the way
// `utils/contract.ts` does, falling back to the copies that ship with the code.
//
// The two files are the same build — `frontend:config` copies managed into
// generated — so this changes nothing at runtime. It does mean a recompile that
// is not followed by `npm run frontend:config` leaves this reading the previous
// module, which is the one way the two can disagree.
import * as fund from "../../frontend/src/generated/fund/index.js";

/**
 * The period claim tree, built off chain exactly as the circuit reads it.
 *
 * Every hash here comes from the contract's own pure circuits — `treeLeaf` is
 * its `degradeToTransient`, `treeNode` its `transientHash` over a pair. A
 * TypeScript reimplementation would be a second copy of a hash function that
 * has to agree byte for byte, and when it did not, the symptom would be a
 * claimant whose proof verifies against nothing, discovered at the moment they
 * try to claim. Calling the circuit removes the possibility rather than testing
 * for it.
 *
 * Depth is fixed at 16 to match `MerkleTreePath<16, …>` in the claim. That is
 * 65 536 leaves per period, and it costs nothing: measured, a depth-10 and a
 * depth-16 claim produce the same size prover key, because circuit size is
 * quantised into buckets well above what the path consumes.
 */
export const TREE_DEPTH = 16;

export interface ClaimLeafInput {
  commitment: Uint8Array;
  payeeBinding: Uint8Array;
  finalPeriod: bigint;
  monthsWorked: bigint;
  instance: Uint8Array;
}

/** One step of a path: the sibling, and whether WE are the left child. */
export interface PathEntry {
  sibling: bigint;
  goesLeft: boolean;
}

export interface ClaimPath {
  leaf: Uint8Array;
  path: PathEntry[];
}

export function leafDigest(leaf: ClaimLeafInput): Uint8Array {
  return (fund as any).pureCircuits.leafDigest(leaf);
}

const asField = (digest: Uint8Array): bigint =>
  (fund as any).pureCircuits.treeLeaf(digest);
const node = (left: bigint, right: bigint): bigint =>
  (fund as any).pureCircuits.treeNode(left, right);

/**
 * The digest of an empty subtree at each level.
 *
 * A full depth-16 tree is 65 536 leaves and a period will hold a handful, so
 * building it densely would be ~131 000 hash calls to place three real values.
 * Every empty subtree at a given level is identical, so one value per level
 * stands in for all of them and the build costs O(leaves x depth).
 */
function emptyRoots(): bigint[] {
  const empty = asField(new Uint8Array(32));
  const roots = [empty];
  for (let level = 0; level < TREE_DEPTH; level += 1) {
    roots.push(node(roots[level]!, roots[level]!));
  }
  return roots;
}

export interface BuiltTree {
  root: bigint;
  /** Leaf digests, in the order they were placed. */
  digests: Uint8Array[];
  pathFor(index: number): ClaimPath;
}

/**
 * Builds a period's tree over the given leaves, in order.
 *
 * Leaf ORDER is the claimant's index into the tree and has to be stable, so the
 * relay sorts before it builds and records the order it used — a tree rebuilt
 * with the leaves in a different order has a different root, and paths issued
 * against the first are worthless against the second.
 */
export function buildTree(leaves: ClaimLeafInput[]): BuiltTree {
  if (leaves.length > 2 ** TREE_DEPTH) {
    throw new Error(
      `${leaves.length} leaves exceeds the ${2 ** TREE_DEPTH} a depth-${TREE_DEPTH} tree holds`
    );
  }

  const digests = leaves.map(leafDigest);
  const blanks = emptyRoots();

  // Level 0 is the leaves as fields; each level up pairs the level below,
  // substituting the empty-subtree digest wherever a sibling is absent.
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

  const root = levels[TREE_DEPTH]![0] ?? blanks[TREE_DEPTH]!;

  return {
    root,
    digests,
    pathFor(index: number): ClaimPath {
      const digest = digests[index];
      if (!digest) throw new Error(`No leaf at index ${index}`);

      const path: PathEntry[] = [];
      let position = index;
      for (let level = 0; level < TREE_DEPTH; level += 1) {
        const siblingIndex = position % 2 === 0 ? position + 1 : position - 1;
        const sibling = levels[level]![siblingIndex] ?? blanks[level]!;
        // `goes_left` in the circuit asks whether OUR node is the left child,
        // because it decides which side the running digest is hashed on.
        path.push({ sibling, goesLeft: position % 2 === 0 });
        position = Math.floor(position / 2);
      }
      return { leaf: digest, path };
    },
  };
}

/** The shape the generated `claim` binding wants for a path argument. */
export function toCircuitPath(claimPath: ClaimPath) {
  return {
    leaf: claimPath.leaf,
    path: claimPath.path.map((entry) => ({
      sibling: { field: entry.sibling },
      goes_left: entry.goesLeft,
    })),
  };
}
