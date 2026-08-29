// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

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
 * `claims.json` is here too, and for a sharper reason than the other three: it
 * is the only bound on a PUBLIC route. `/api/claim` issues the starter
 * allowance to any registered employer who has not drawn it, and that "has not"
 * is read out of this file — so losing it on a push does not cost a record, it
 * re-opens the allowance.
 *
 * NOT for `fund-pool.json`, the `claims/` DIRECTORY or `terminations/`. Those
 * belong to operator CLIs that run on a person's own machine, where cwd is
 * already durable; moving them would relocate files someone has on disk today
 * for no gain. `claims/` and `claims.json` share a word and nothing else.
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
