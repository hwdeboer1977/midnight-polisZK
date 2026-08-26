import fs from "fs";
import path from "path";

/**
 * Where this process keeps state it must not lose.
 *
 * Three files are written at run time and are not source: the record of what
 * has been deployed, which employer keys have signed up, and the wallet's sync
 * position. All three resolved from `process.cwd()`, which is the code
 * directory — and on a managed host the code directory is replaced on every
 * deploy.
 *
 * The consequence was not subtle. Onboarding deployed a real payroll contract,
 * wrote its address next to the source, and the next push wiped it: the contract
 * stays on chain and permanently bound to its employer, while nothing left
 * anywhere knows where it is. `assignEmployer` cannot be repeated, so an
 * orphaned address is not recoverable by redeploying — only by finding it again
 * on the chain.
 *
 * `DATA_DIR` moves all three onto storage that outlives a deploy. Unset, it is
 * the working directory and every local workflow behaves exactly as before —
 * `deployment.json` stays where the deploy scripts have always put it.
 *
 * NOT for `fund-pool.json`, `claims/` or `terminations/`. Those belong to
 * operator CLIs that run on a person's own machine, where cwd is already
 * durable; moving them would relocate files someone has on disk today for no
 * gain.
 */
export function dataDir(): string {
  return process.env.DATA_DIR?.trim() || process.cwd();
}

/**
 * A path inside it, with the directory created.
 *
 * Created eagerly rather than at write time because a mount that is missing or
 * unwritable should announce itself when the process starts using it, not
 * halfway through an onboarding that has already deployed a contract.
 */
export function dataPath(...parts: string[]): string {
  const base = dataDir();
  const target = path.join(base, ...parts);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
}
