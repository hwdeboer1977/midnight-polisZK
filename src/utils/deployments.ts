import fs from "fs";
import path from "path";

const FILE = "deployment.json";

/**
 * The committed copy, and why reading it is not optional.
 *
 * `deployment.json` is gitignored — it is a local record written by the deploy
 * scripts — so a fresh clone has none of it. That is fine for a developer who
 * deploys their own contracts and fatal for a server that must USE contracts
 * someone else deployed: onboarding needs the shared `taxparams` registry, and
 * with no record of it the only honest thing it can say is "deploy it first",
 * which is wrong. The registry exists; this process simply could not see it.
 *
 * `frontend/public/zk` solved the same problem for ZK assets and this is its
 * twin: `frontend-config.ts` already writes every deployment to
 * `frontend/public/deployments.json`, that file IS committed (a Vercel build
 * cannot produce it either), and it carries the addresses in a compatible
 * shape. So the baseline ships with the repo and nothing new has to.
 *
 * Merged rather than chosen between, with the local file winning: a server that
 * deploys a contract must see its own work immediately, while still knowing
 * about the shared ones it inherited.
 */
const COMMITTED = path.join("frontend", "public", "deployments.json");

export interface DeploymentRecord {
  contractAddress: string;
  deployedAt: string;
  network: string;
  networkId: string;
  contractName: string;
  /** Which instance of that contract, when one is deployed per tenant. */
  instance?: string;
}

type DeploymentFile = Record<string, DeploymentRecord>;

/**
 * Keys carry the network as well as the contract, because the same contract is
 * routinely deployed to the local devnet and to preview, and those are entirely
 * different chains. One payroll contract is also deployed per employer, so the
 * contract name alone is not unique either — instances are addressed as
 * `preview/payroll:acme`.
 */
export function deploymentKey(
  networkId: string,
  contractName: string,
  instance?: string
): string {
  return `${networkId}/${contractName}${instance ? `:${instance}` : ""}`;
}

/**
 * One file's records, tolerating absence and the older single-record layout.
 *
 * A malformed file is skipped rather than thrown on: the committed baseline is
 * a convenience, and letting a bad copy of it take down every deployment lookup
 * would trade a missing contract for no contracts at all.
 */
function recordsIn(file: string): DeploymentRecord[] {
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return typeof raw?.contractAddress === "string"
      ? [raw as DeploymentRecord]
      : Object.values(raw as DeploymentFile);
  } catch {
    return [];
  }
}

/** The instance label for this run, from INSTANCE in the environment. */
export function currentInstance(): string | undefined {
  const value = process.env.INSTANCE?.trim();
  return value ? value : undefined;
}

/**
 * Reads the file, upgrading older layouts in memory: a single record at the top
 * level (one contract, no key), and network-less keys. Both are re-keyed from
 * the record's own `networkId`, so nothing is lost and the file is rewritten in
 * the current shape on the next deploy.
 */
function read(): DeploymentFile {
  const records: DeploymentRecord[] = [
    // Baseline first, local second, so the local record overwrites on collision.
    ...recordsIn(COMMITTED),
    ...recordsIn(FILE),
  ];

  const out: DeploymentFile = {};
  for (const record of records) {
    if (!record?.contractAddress || !record.networkId) continue;
    out[
      deploymentKey(record.networkId, record.contractName, record.instance)
    ] = record;
  }
  return out;
}

export function getDeployment(
  networkId: string,
  contractName: string,
  instance?: string
): DeploymentRecord | undefined {
  return read()[deploymentKey(networkId, contractName, instance)];
}


/**
 * Mirrors one record into the copy the browser fetches as a static asset.
 *
 * Without this, a self-service registration deploys the employer's contract and
 * records it here, but the frontend keeps serving the file as it stood before —
 * so the employer who just registered is told they have no contract until
 * someone remembers to re-run `npm run frontend:config`.
 *
 * Only the fields the browser needs are written, and an untouched entry keeps
 * whatever `frontend:config` enriched it with: pEUR carries a `tokenId` read off
 * chain, which cannot be derived here. A redeployed contract starts fresh
 * instead, since that enrichment described the previous address.
 */
function publishToFrontend(record: DeploymentRecord): void {
  const dir = path.join("frontend", "public");
  if (!fs.existsSync(dir)) return;

  const file = path.join(dir, "deployments.json");
  let all: Record<string, Record<string, unknown>> = {};
  if (fs.existsSync(file)) {
    try {
      all = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      // A corrupt cache must not fail a deploy that already succeeded on chain.
      all = {};
    }
  }

  const key = deploymentKey(record.networkId, record.contractName, record.instance);
  const previous = all[key];
  const carried =
    previous && previous.contractAddress === record.contractAddress ? previous : {};

  all[key] = {
    ...carried,
    contractAddress: record.contractAddress,
    contractName: record.contractName,
    networkId: record.networkId,
    ...(record.instance ? { instance: record.instance } : {}),
  };

  fs.writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
}

export function saveDeployment(record: DeploymentRecord): void {
  const all = read();
  all[deploymentKey(record.networkId, record.contractName, record.instance)] =
    record;
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
  publishToFrontend(record);
}

export function listDeployments(): [string, DeploymentRecord][] {
  return Object.entries(read());
}
