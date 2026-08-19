import fs from "fs";

const FILE = "claims.json";

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
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as ClaimFile;
  } catch {
    // Losing the ledger of who has claimed would silently re-open the allowance
    // to everyone, so a damaged file is a hard stop rather than an empty object.
    throw new Error(`${FILE} is not readable JSON — refusing to issue against it`);
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
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
}
