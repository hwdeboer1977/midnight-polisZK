import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * A leaf module on purpose.
 *
 * `contract.ts` would be the natural home for both of these, but it imports
 * `deployments.ts` for `getDeployment`, and `deployments.ts` needs
 * `contractVersion` to decide which records still belong to this build. Putting
 * them here breaks the cycle instead of relying on ESM to tolerate one. Nothing
 * in this file imports anything of ours.
 */

/**
 * Path to a contract's ZK assets — the `keys/` and `zkir/` a prover needs.
 *
 * `contracts/managed` first, because that is what a local `npm run compile`
 * updates and a developer expects to be reading. It is gitignored, though, so a
 * fresh clone has none of it and cannot rebuild it without the Compact
 * compiler.
 *
 * `frontend/public/zk` is the fallback and is the reason a server can be
 * deployed at all: it carries byte-identical copies under the same
 * `<contract>/{keys,zkir}/` layout, committed on purpose because a Vercel build
 * cannot produce them either. `frontend-config.ts` keeps the two in step.
 */
export function managedPath(contractName: string): string {
  const compiled = path.join(process.cwd(), "contracts", "managed", contractName);
  if (fs.existsSync(path.join(compiled, "keys"))) return compiled;

  const committed = path.join(process.cwd(), "frontend", "public", "zk", contractName);
  if (fs.existsSync(path.join(committed, "keys"))) return committed;

  // Neither: report the one that a developer is most likely to be missing, and
  // say how to produce it, rather than failing later on an unreadable key file.
  throw new Error(
    `No ZK assets for "${contractName}". Run \`npm run compile\`, or check that ` +
      `frontend/public/zk/${contractName} shipped with this checkout.`
  );
}

/**
 * Where a contract's circuit manifest lives, in either tree.
 *
 * `contracts/managed` keeps it under `compiler/`; `frontend-config` publishes it
 * to the root of `frontend/public/zk/<contract>/`, because that is the only file
 * from `compiler/` anything needs.
 */
function contractInfoPath(root: string): string | undefined {
  for (const candidate of [
    path.join(root, "compiler", "contract-info.json"),
    path.join(root, "contract-info.json"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * A fingerprint of the compiled contract, as the chain sees it.
 *
 * Hashed over the VERIFIER KEYS of the circuits the contract declares, because
 * they are precisely what decides whether this build can transact with a given
 * deployment. A verifier key is written into the contract at deploy and never
 * changes; the prover keys and ZKIR are this side's business. Two deployments
 * share a version here exactly when a transaction proved by this build would
 * verify against either.
 *
 * ── Two earlier versions of this, and why each was wrong ───────────────────
 *
 * FIRST it hashed every `.verifier` file in the keys DIRECTORY. That made the
 * digest depend on the exact file set, so the two copies of the directory —
 * `contracts/managed` and the published `frontend/public/zk` — had to match
 * file-for-file, which meant deleting the surplus. `contracts/managed/fund` held
 * an interrupted compile, and pruning against it destroyed twelve committed fund
 * keys whose last copy was the one being pruned.
 *
 * SECOND it hashed the generated contract MODULE, one file, mirrored verbatim,
 * no deletion needed. That held until a COMMENT-ONLY edit to `payroll.compact`
 * changed the module hash while the verifier keys stayed byte-identical — so
 * every deployment would have been hidden as "old build" by a change that
 * altered nothing the chain can see. The module embeds source text; comments
 * move it.
 *
 * NOW it reads the circuit list from `contract-info.json` and hashes those
 * verifier keys by name. Extra files in the directory are ignored rather than
 * deleted, which is what the first version needed and could not do safely, and
 * comments cannot reach it, which is what the second version got wrong. Pure
 * circuits have no verifier key and are skipped — `bandsFor` and
 * `terminationCommitment` are in the manifest and produce no file.
 *
 * Sorted before hashing so the digest does not depend on manifest order, and the
 * circuit name goes in alongside its bytes so that renaming a circuit counts as
 * a change even if its key is identical.
 *
 * Truncated to 16 hex characters: a change detector, not a security boundary.
 */
export function contractVersion(contractName: string): string {
  const root = managedPath(contractName);
  const info = contractInfoPath(root);
  if (!info) throw new Error(`No contract-info.json for "${contractName}"`);

  const declared = JSON.parse(fs.readFileSync(info, "utf8")) as {
    circuits?: { name?: string }[];
  };
  const names = (declared.circuits ?? [])
    .map((circuit) => circuit?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0)
    .sort();

  const digest = crypto.createHash("sha256");
  for (const name of names) {
    const key = path.join(root, "keys", `${name}.verifier`);
    // A declared circuit with no verifier key is a pure circuit — it proves
    // nothing and there is nothing for a deployment to disagree about.
    if (!fs.existsSync(key)) continue;
    digest.update(name);
    digest.update(fs.readFileSync(key));
  }

  return digest.digest("hex").slice(0, 16);
}
