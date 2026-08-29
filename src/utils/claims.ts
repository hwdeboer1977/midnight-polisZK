// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import { dataPath } from "./data-dir.js";

/**
 * Where the allowance ledger lives.
 *
 * Resolved through DATA_DIR rather than sitting in the working directory, and
 * this is not tidiness. `/api/claim` is public — bounded by "this key has not
 * claimed before" rather than by a token — and THIS FILE is where that bound is
 * remembered. On a managed host the code directory is replaced on every push,
 * so a cwd-relative ledger means every deploy silently re-opens the allowance
 * to everyone who already drew it.
 *
 * Deliberately not the `claims/` directory next door: that belongs to the
 * employee claim CLIs, which run on an operator's own machine where cwd is
 * already durable. Same word, different thing.
 *
 * Resolved per call rather than at import, so the directory is only created by
 * a process that actually issues or checks an allowance.
 */
function file(): string {
  return dataPath("claims.json");
}

export interface ClaimRecord {
  networkId: string;
  /** Hex coin public key of the employer who claimed. */
  coinPublicKey: string;
  instance: string;
  /** Minor units, as a string — JSON has no bigint. */
  amount: string;
  txHash: string;
  claimedAt: string;
}

type ClaimFile = Record<string, ClaimRecord>;

/**
 * Who has already drawn their starter allowance.
 *
 * This is the only thing bounding what the demo service will issue. The employer
 * check answers "may this key be funded at all", but on its own it would let one
 * employer claim on a loop and inflate supply without limit, so the answer has to
 * be remembered. Keyed by network as well as key, because the same wallet is
 * routinely used on the devnet and on preview and those are different chains.
 */
export function claimKey(networkId: string, coinPublicKey: string): string {
  return `${networkId}/${coinPublicKey.toLowerCase()}`;
}

function read(): ClaimFile {
  const path = file();
  if (!fs.existsSync(path)) return {};
  try {
    return JSON.parse(fs.readFileSync(path, "utf8")) as ClaimFile;
  } catch {
    // Losing the ledger of who has claimed would silently re-open the allowance
    // to everyone, so a damaged file is a hard stop rather than an empty object.
    throw new Error(`${path} is not readable JSON — refusing to issue against it`);
  }
}

export function getClaim(
  networkId: string,
  coinPublicKey: string
): ClaimRecord | undefined {
  return read()[claimKey(networkId, coinPublicKey)];
}

export function saveClaim(record: ClaimRecord): void {
  const all = read();
  all[claimKey(record.networkId, record.coinPublicKey)] = record;
  fs.writeFileSync(file(), JSON.stringify(all, null, 2) + "\n");
}
