/**
 * The relay's Merkle tree against the circuit's.
 *
 * A tree builder that hashes even slightly differently from `merkleTreePathRoot`
 * produces paths that verify against nothing — and the failure appears at a
 * claimant's claim, months later, with no indication of which side is wrong.
 * So every path this builder issues is checked here against the contract's own
 * `pathRoot`, which is the identical fold the claim circuit runs.
 *
 *   npm run test:tree
 */
import * as fund from "../contracts/managed/fund/contract/index.js";
import { buildTree, toCircuitPath, TREE_DEPTH } from "../dist/utils/claim-tree.js";

const bytes = (seed) => Uint8Array.from({ length: 32 }, (_, i) => (seed * 31 + i * 7) % 256);

const leafFor = (n) => ({
  commitment: bytes(n + 1),
  payeeBinding: bytes(n + 100),
  claimKeyHash: bytes(n + 200),
  finalPeriod: 202611n,
  monthsWorked: BigInt(12 + n),
  instance: bytes(7),
});

let failures = 0;
const check = (name, ok) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}`);
};

console.log(`\nclaim tree (depth ${TREE_DEPTH})\n`);

// Sizes chosen for the shapes that break naive builders: a lone leaf with no
// sibling anywhere, an odd count so one level pairs against an empty subtree,
// and an exact power of two where none does.
for (const count of [1, 2, 3, 5, 8, 17]) {
  const leaves = Array.from({ length: count }, (_, i) => leafFor(i));
  const tree = buildTree(leaves);

  let allMatch = true;
  for (let i = 0; i < count; i += 1) {
    const root = fund.pureCircuits.pathRoot(toCircuitPath(tree.pathFor(i)));
    if (root !== tree.root) allMatch = false;
  }
  check(`${String(count).padStart(2)} leaves: every path folds to the root`, allMatch);
}

// A path is a membership proof, so it must fail for a leaf that is not in it.
{
  const tree = buildTree([leafFor(0), leafFor(1), leafFor(2)]);
  const forged = toCircuitPath(tree.pathFor(1));
  forged.leaf = fund.pureCircuits.leafDigest(leafFor(99));
  check("a substituted leaf does not fold to the root",
    fund.pureCircuits.pathRoot(forged) !== tree.root);
}

// And the sibling side matters: flipping it is the classic off-by-one that
// still produces a plausible-looking root.
{
  const tree = buildTree([leafFor(0), leafFor(1), leafFor(2), leafFor(3)]);
  const flipped = toCircuitPath(tree.pathFor(2));
  flipped.path[0].goes_left = !flipped.path[0].goes_left;
  check("flipping a sibling's side breaks the path",
    fund.pureCircuits.pathRoot(flipped) !== tree.root);
}

// Order defines the tree, so the relay must record the order it used.
{
  const a = buildTree([leafFor(0), leafFor(1)]);
  const b = buildTree([leafFor(1), leafFor(0)]);
  check("leaf order changes the root", a.root !== b.root);
}

console.log();
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all claim-tree checks passed\n");
