import fs from "fs";

const FILE = "deployment.json";

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
  if (!fs.existsSync(FILE)) return {};
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));

  const records: DeploymentRecord[] =
    typeof raw?.contractAddress === "string"
      ? [raw as DeploymentRecord]
      : Object.values(raw as DeploymentFile);

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

export function saveDeployment(record: DeploymentRecord): void {
  const all = read();
  all[deploymentKey(record.networkId, record.contractName, record.instance)] =
    record;
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
}

export function listDeployments(): [string, DeploymentRecord][] {
  return Object.entries(read());
}
