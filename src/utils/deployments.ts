import fs from "fs";
import { contractVersion } from "./contract-version.js";
import { EnvironmentManager } from "./environment.js";
import { dataPath } from "./data-dir.js";

/**
 * Resolved through `dataDir()`, so a managed host can point it at storage that
 * survives a deploy. Locally it is `./deployment.json`, exactly as before.
 */
const FILE = dataPath("deployment.json");

/**
 * The baseline, and why reading one is not optional.
 *
 * `deployment.json` is gitignored — it is a local record written by the deploy
 * scripts — so a fresh clone has none of it. That is fine for a developer who
 * deploys their own contracts and fatal for a server that must USE contracts
 * someone else deployed: onboarding needs the shared `taxparams` registry, and
 * with no record of it the only honest thing it can say is "deploy it first",
 * which is wrong. The registry exists; this process simply could not see it.
 *
 * This used to be solved by committing `frontend/public/deployments.json` and
 * reading it back here. That file was an append-only address book: every
 * contract ever deployed stayed in it, retired ones included, and pruning it
 * meant editing JSON by hand in two places that had to agree. The shared
 * contracts it existed to carry are four addresses that change about never, and
 * `.env` is already where this project keeps things that are true about the
 * deployment — so they live there now and the file is gone.
 *
 * Read fresh on every call rather than cached, because `read()` already is: a
 * long-running server that deploys a contract must see its own work on the next
 * lookup, and an env var edited between two CLI invocations must take effect.
 *
 * Absence is not an error. A machine with no `.env` — a CI job, a container
 * given only `DATABASE_URL` — gets an empty baseline and whatever
 * `deployment.json` holds, which is exactly the old behaviour of a fresh clone.
 */
const BASELINE: { env: string; contractName: string }[] = [
  { env: "payroll_address", contractName: "payroll" },
  { env: "peur_address", contractName: "peur" },
  { env: "taxparams_address", contractName: "taxparams" },
  { env: "fund_address", contractName: "fund" },
  // ⚠️ Missing until 2026-08-29, and only harmless locally. `deployment.json`
  // is gitignored and, on a managed host, lives under DATA_DIR — so a fresh
  // disk has no record of any contract and this table is the ONLY source of
  // addresses there. Every other contract could be recovered from the
  // environment and the tax vault could not: `fund-deposit.ts` resolves it with
  // `getDeployment(networkId, "taxvault")` and would report "No fund deployed
  // on preview" for a vault that is deployed and holds money.
  { env: "taxvault_address", contractName: "taxvault" },
];

/**
 * Which chain the baseline addresses are on.
 *
 * Taken from `MIDNIGHT_NETWORK` rather than recorded per address, because a
 * contract address is only meaningful on the chain it was deployed to and this
 * project already scopes everything else the same way. The consequence to know:
 * pointing `MIDNIGHT_NETWORK` at a different network without changing the
 * addresses claims preview contracts exist on the local devnet. Lookups then
 * fail at the indexer rather than here, which is later than ideal but is the
 * same failure a stale `deployment.json` always produced.
 *
 * An unset or unrecognised network yields no baseline instead of throwing —
 * `getNetworkConfig()` is the right place for that error, and raising it from a
 * deployment lookup would turn a bad env var into a stack trace far from its
 * cause.
 */
function baselineNetworkId(): string | undefined {
  try {
    return EnvironmentManager.getNetworkConfig().networkId;
  } catch {
    return undefined;
  }
}

function baselineRecords(): DeploymentRecord[] {
  const networkId = baselineNetworkId();
  if (!networkId) return [];

  const network = EnvironmentManager.getNetworkConfig().name;
  const out: DeploymentRecord[] = [];
  for (const { env, contractName } of BASELINE) {
    const contractAddress = process.env[env]?.trim();
    if (!contractAddress) continue;
    out.push({
      contractAddress,
      // No deploy happened here, and inventing a timestamp would put a lie in
      // the one field that is meant to say when. The epoch reads as "before
      // anything this process did", which is what a baseline is.
      deployedAt: new Date(0).toISOString(),
      network,
      networkId,
      contractName,
    });
  }
  return out;
}

export interface DeploymentRecord {
  contractAddress: string;
  deployedAt: string;
  network: string;
  networkId: string;
  contractName: string;
  /** Which instance of that contract, when one is deployed per tenant. */
  instance?: string;
  /**
   * Fingerprint of the compiled contract this was deployed from.
   *
   * Stamped at deploy so a later recompile can tell its own deployments from
   * the ones it can no longer transact with, without anyone having to notice
   * and mark them by hand. Absent on records written before this existed, and
   * absent from the `.env` baseline — both are treated as current, since the
   * alternative is a build that hides the only contract it was told about.
   */
  contractVersion?: string;
  /**
   * Deployed from a contract version this build can no longer read.
   *
   * Kept rather than deleted. The contract is still on chain and still bound to
   * its employer — `assignEmployer` cannot be repeated — so the address is the
   * only thing that can still find it, and dropping the record would be
   * permanent. This marks it unqueryable, not nonexistent.
   *
   * Every scan already detects these from their state and skips them; the flag
   * only moves that answer to before the request instead of after it.
   */
  retired?: boolean;
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
 * A malformed file is skipped rather than thrown on: the `.env` baseline covers
 * the shared contracts on its own, and letting a half-written `deployment.json`
 * take down every lookup would trade a missing contract for no contracts at all.
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
 * Says so when `deployment.json` overrides an address set in `.env`.
 *
 * The merge order is deliberate — a server that just deployed something must see
 * its own work rather than a stale baseline — but it has one bad consequence:
 * editing `payroll_address` to point somewhere else does nothing at all if the
 * file still carries a record under the same key, and there is no symptom. The
 * app simply keeps using the old contract, which is indistinguishable from the
 * edit not having been saved.
 *
 * Warned rather than resolved, because either resolution is wrong somewhere. The
 * file winning is right after a deploy; `.env` winning is right after a hand
 * edit. Only the person who made the change knows which this is, so the honest
 * move is to tell them the two sources disagree and let them delete whichever is
 * stale.
 *
 * Silent when the addresses match, which is the normal state right after
 * deploying and copying the address across.
 */
function warnOnShadowedBaseline(
  baseline: DeploymentRecord[],
  all: DeploymentRecord[]
): void {
  for (const base of baseline) {
    const key = deploymentKey(base.networkId, base.contractName, base.instance);
    const winner = all
      .filter((r) => deploymentKey(r.networkId, r.contractName, r.instance) === key)
      .pop();
    if (!winner || winner.contractAddress === base.contractAddress) continue;
    console.warn(
      `⚠️  deployment.json overrides ${key} from .env: using ` +
        `${winner.contractAddress}, not ${base.contractAddress}. ` +
        `Delete the record from deployment.json to use the .env address.`
    );
  }
}

/** The file's own records, keyed, with nothing merged in and nothing dropped. */
function readFile(): DeploymentFile {
  const out: DeploymentFile = {};
  for (const record of recordsIn(FILE)) {
    if (!record?.contractAddress || !record.networkId) continue;
    out[deploymentKey(record.networkId, record.contractName, record.instance)] = record;
  }
  return out;
}

/**
 * This build's fingerprint per contract, computed once per `read()`.
 *
 * Memoised across the loop rather than per record because it hashes key files
 * off disk and a deployment file holds many records of the same contract.
 *
 * A contract with no compiled assets present yields no entry, and records of it
 * are then all kept. That is the right way to fail: a server running from a
 * checkout without `contracts/managed` can still look up addresses, and it was
 * never going to prove anything anyway.
 */
function currentVersions(names: Iterable<string>): Map<string, string> {
  const versions = new Map<string, string>();
  for (const name of names) {
    if (versions.has(name)) continue;
    try {
      versions.set(name, contractVersion(name));
    } catch {
      // No compiled assets for it here. Nothing to compare against, so nothing
      // is dropped — see above.
    }
  }
  return versions;
}

/**
 * Reads the file, upgrading older layouts in memory: a single record at the top
 * level (one contract, no key), and network-less keys. Both are re-keyed from
 * the record's own `networkId`, so nothing is lost and the file is rewritten in
 * the current shape on the next deploy.
 */
function read(): DeploymentFile {
  const baseline = baselineRecords();
  const records: DeploymentRecord[] = [
    // Baseline first, local second, so the local record overwrites on collision.
    ...baseline,
    ...recordsIn(FILE),
  ];

  warnOnShadowedBaseline(baseline, records);

  const current = currentVersions(records.map((record) => record?.contractName));

  const out: DeploymentFile = {};
  for (const record of records) {
    if (!record?.contractAddress || !record.networkId) continue;
    // Deployed from source this build can no longer transact with. Dropped
    // rather than flagged: `retired` had to be written by hand and so was
    // usually written late, while this is decided by the keys themselves.
    const expected = current.get(record.contractName);
    if (record.contractVersion && expected && record.contractVersion !== expected) continue;
    const key = deploymentKey(record.networkId, record.contractName, record.instance);
    // `retired` survives the overwrite, and only `retired`.
    //
    // The local file winning is right for every other field — a contract this
    // process deployed a minute ago must not be shadowed by a stale baseline.
    // It is wrong for this one, because the two files are written by different
    // people at different times: the baseline names current contracts and cannot
    // express retirement at all, while the local file is appended to by
    // onboarding and never revisited. A contract onboarded on the server is
    // therefore present WITHOUT the flag, and a wholesale overwrite silently
    // un-retires it — on the deployment where the flag matters most, since the
    // frontend merges the API over its baseline and the API wins there too.
    //
    // Sticky in one direction only. There is no un-retire flow, so a record
    // that has ever been marked stays marked, and the fix is to edit the
    // baseline rather than to hope the merge order falls the right way.
    const retired = out[key]?.retired || record.retired;
    out[key] = retired ? { ...record, retired: true } : record;
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
 * Note for anyone looking for `publishToFrontend`.
 *
 * A deploy used to mirror its record into `frontend/public/deployments.json` so
 * a self-service registration would not leave the employer who just registered
 * being told they have no contract. That file is gone, and the need it met is
 * met better: the browser already merges `/api/deployments` over its static
 * list, and that endpoint reads THIS file — so a contract deployed a second ago
 * is visible on the next page load without anything being copied anywhere.
 *
 * What is lost is the case with no backend reachable, where the static list was
 * all the browser had. That is what the `.env` baseline now covers, for the
 * shared contracts; a per-employer contract deployed at run time was never in a
 * committed file at the moment it mattered anyway.
 */

/**
 * Records a deployment, stamping it with the build that produced it.
 *
 * Stamped here rather than at each call site so no deploy path can forget:
 * `deploy.ts`, `deploy-tax.ts` and self-service onboarding all land here, and a
 * record without a version is indistinguishable from one written before
 * versions existed — which `read()` keeps rather than drops.
 *
 * A caller that already set one wins, so a record can be re-saved without
 * silently re-stamping it as current.
 */
export function saveDeployment(record: DeploymentRecord): void {
  if (!record.contractVersion) {
    try {
      record = { ...record, contractVersion: contractVersion(record.contractName) };
    } catch {
      // Deployed without local assets. Unstamped is honest; pretending to know
      // which build it came from would be worse than not saying.
    }
  }

  // The file's OWN records, not `read()`. Writing the merged view back would
  // copy the `.env` baseline into the file — and since the file wins on
  // collision, every later edit to `peur_address` and friends would then be
  // silently ignored in favour of the copy taken the last time anything was
  // deployed. One deploy of an unrelated contract is enough to do it.
  //
  // Unfiltered, too. `read()` hides records from other builds, which is right
  // for a lookup and wrong here: writing the filtered set back would turn
  // "hidden until you recompile the old source" into "deleted", and deleting an
  // address is the one loss this file cannot recover from.
  const all = readFile();
  all[deploymentKey(record.networkId, record.contractName, record.instance)] =
    record;
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
}

/**
 * Every deployment this process will offer, payroll narrowed to the pinned one.
 *
 * `payroll_address` names the payroll contract this deployment is running. The
 * narrowing is what makes that mean something: without it a stale record in
 * `deployment.json`, or a contract onboarded under an earlier version, is still
 * listed by `/api/deployments`, still reaches the browser, and is still offered
 * as somewhere to file payroll. `contractVersion` already hides the ones this
 * build cannot transact with at all; this is the tighter statement — not "can I
 * talk to it" but "is it the one I was told to use".
 *
 * Only payroll is narrowed. pEUR, taxparams and fund are single-deployment and
 * there is nothing to choose between.
 *
 * `PAYROLL_CONTRACT` overrides it with a comma-separated list, for the case this
 * shape does not cover: running one service across several employer contracts.
 * Setting it replaces the pin rather than adding to it, so `payroll_address` has
 * to be in the list to survive.
 *
 * ── What this does NOT do ──────────────────────────────────────────────────
 *
 * `getDeployment` is untouched, so a CLI invoked with an explicit INSTANCE still
 * finds that contract, and self-service onboarding still records what it
 * deployed. Listing is about what gets offered; a lookup by name is somebody who
 * already knows which contract they mean, and refusing them would break the
 * per-employer flows for no gain.
 */
export function listDeployments(): [string, DeploymentRecord][] {
  const allowed = pinnedPayroll();
  return Object.entries(read()).filter(
    ([, record]) =>
      record.contractName !== "payroll" ||
      !allowed ||
      allowed.has(record.contractAddress.trim().toLowerCase())
  );
}

/** The payroll addresses this deployment may offer, or null when unset. */
function pinnedPayroll(): Set<string> | null {
  const raw = (process.env.PAYROLL_CONTRACT ?? process.env.payroll_address ?? "").trim();
  if (!raw) return null;
  const allowed = new Set(
    raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  );
  return allowed.size > 0 ? allowed : null;
}
