import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
// Imported from the COMMITTED copy under `frontend/`, not `contracts/managed/`.
//
// `contracts/managed/` is gitignored build output, so it does not exist on a
// managed host — and once the server started importing this module, `tsc -p
// tsconfig.server.json` failed the deploy with TS2307 on a path that is only
// ever present on a developer's machine. `src/server/README.md` names this
// exact trap and prescribes this fix: resolve the contract module the way
// `utils/contract.ts` does, falling back to the copies that ship with the code.
//
// The two files are the same build — `frontend:config` copies managed into
// generated — so this changes nothing at runtime. It does mean a recompile that
// is not followed by `npm run frontend:config` leaves this reading the previous
// module, which is the one way the two can disagree.
import { EnvironmentManager } from "./environment.js";
import { deploymentKey, getDeployment, listDeployments } from "./deployments.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { contractLeaves, contractModulePath, loadCompiledContract } from "./contract.js";
import { buildTree, type ClaimLeafInput } from "./claim-tree.js";
import { PUBLISHED } from "./benefit-params.js";
import { listDeposits } from "./fund-pool.js";

/**
 * The relay's work, without a terminal around it.
 *
 * Extracted from `relay.ts` so the same code serves the CLI and the HTTP route
 * an employer drives from the browser — the pattern `payroll-run.ts` already
 * set. Nothing about building a claim tree needed a terminal; it reads public
 * payroll state, checks each opening against the attestation the employer
 * signed, and submits one transaction.
 *
 * What could NOT move to the browser, and why this is a server function rather
 * than a frontend one: `fund-pool.ts` is a file-backed record of the fund's
 * deposits, and every bundle carries one of those coins. A page cannot read it,
 * and the deposits are not on chain in a form a page could rebuild.
 *
 * The trust story is unchanged and is set out at length in `relay.ts`: a forged
 * root is not prevented, it is attributable and publicly checkable, and
 * `publishRoot` is permissionless so a relay that refuses to publish cannot
 * block a claim.
 */

export interface TerminationOpening {
  /**
   * The deployment this termination was written on, by name.
   *
   * A NAME, and therefore the weak half of this record — see `contractAddress`
   * below and the resolution in `runRelay`. Onboarding used to deploy one
   * contract per company and key it `payroll:<slug>`; it now assigns the single
   * `payroll` deployment, so the name an employer's page reports is plainly
   * `payroll` and there is nothing under `payroll:payroll` to find.
   */
  instance: string;
  /**
   * The contract this termination is on, hex, 32 bytes.
   *
   * Optional only because openings downloaded before this field existed do not
   * carry it. Written by every new one, and preferred over the name whenever it
   * is present: an address is what the leaf actually binds to, and it cannot go
   * stale when a naming convention changes underneath it — which is exactly how
   * `payroll:payroll` came to be looked up for a contract deployed as `payroll`.
   */
  contractAddress?: string;
  slot: number;
  finalPeriod: number;
  monthsWorked: number;
  /** Hex, 32 bytes. hash(claimKey), from the employee. */
  claimKeyHash: string;
  /** Hex, 32 bytes. The employer's blinding nonce for the attestation. */
  nonce: string;
}

/** One claimant's bundle, exactly as it is written to disk or returned. */
export interface ClaimBundle {
  period: number;
  instance: string;
  slot: number;
  root: string;
  leaf: {
    commitment: string;
    payeeBinding: string;
    claimKeyHash: string;
    finalPeriod: number;
    monthsWorked: number;
    instance: string;
  };
  leafDigest: string;
  path: { sibling: string; goesLeft: boolean }[];
  fund: string | null;
  paramsVersion: number | null;
  poolCoin: { nonce: string; color: string; value: string; mtIndex: number } | null;
}

export interface RelayResult {
  period: number;
  root: string | null;
  bundles: ClaimBundle[];
  /** Openings that were skipped or refused, and why. Never silently dropped. */
  skipped: { instance: string; slot: number; reason: string }[];
  /** Conditions a caller should surface but which do not stop the run. */
  warnings: string[];
  published: boolean;
  txHash: string | null;
}

/**
 * The payroll contract module, resolved the way every other server path
 * resolves one.
 *
 * ⚠️ This used to be a static `import * as payrollContract from
 * "../../frontend/src/generated/payroll/index.js"`, and it made the relay skip
 * EVERY opening with **"contract state unreadable, or it predates this build"**
 * — a message that named the contract as the suspect when the contract was
 * fine and the import was not.
 *
 * The same hazard `fund-deposit.ts` documents, in the same shape. Node resolves
 * a bare specifier from the importing FILE, so a module under
 * `frontend/src/generated/` finds `frontend/node_modules/@midnight-ntwrk/
 * compact-runtime` while this file finds the root one: two installs of the same
 * version, two WASM instances. A `ContractState` deserialized here is then not
 * an instance of THAT runtime's `ChargedState`, `ledger()` throws, and
 * `fetchLedger`'s catch — written for a contract that genuinely predates this
 * build — reports it as an old contract. Identical versions, so no lockfile
 * hints at it.
 *
 * `contractModulePath` prefers `contracts/managed/payroll/contract/index.js`,
 * which sits at the repo root and shares this file's runtime, and falls back to
 * the committed copy — correct on a managed host, where `frontend/node_modules`
 * does not exist and that copy resolves to the root runtime too. Either way
 * there is one runtime, which is the property that matters.
 */
let payrollModule: Promise<any> | null = null;
function payroll(): Promise<any> {
  payrollModule ??= import(contractModulePath("payroll"));
  return payrollModule;
}

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const fromHex = (s: string) => Uint8Array.from(Buffer.from(s.replace(/^0x/, ""), "hex"));

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      ... on ContractDeploy { state }
      ... on ContractCall { state }
      ... on ContractUpdate { state }
    }
  }
`;

async function fetchLedger(indexer: string, address: string): Promise<any | null> {
  const response = await fetch(indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: CONTRACT_STATE_QUERY, variables: { address } }),
  });
  const body: any = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  const encoded = body.data?.contractAction?.state;
  if (!encoded) return null;
  try {
    const ledger = (await payroll()).ledger(
      ContractState.deserialize(Buffer.from(encoded, "hex")).data
    );
    void ledger.employerAssigned;
    return ledger;
  } catch {
    // Predates this build of the contract. Skipped rather than fatal: one old
    // instance must not stop every other employer's claimants from claiming.
    return null;
  }
}

export async function runRelay(options: {
  period: number;
  /** The openings employers handed over. Passed in, not read from disk. */
  openings: TerminationOpening[];
  publish: boolean;
  log?: (line: string) => void;
}): Promise<RelayResult> {
  const { period, publish } = options;
  const log = options.log ?? (() => {});

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const skipped: RelayResult["skipped"] = [];
  const warnings: string[] = [];
  const openings = [...options.openings].filter(
    (o) => Number(o.finalPeriod) === period
  );

  if (openings.length === 0) {
    return { period, root: null, bundles: [], skipped, warnings, published: false, txHash: null };
  }

  // Sorted so the tree is reproducible: a rebuild in a different order is a
  // different root, and every path already issued against the first would then
  // verify against nothing.
  openings.sort((a, b) =>
    a.instance === b.instance ? a.slot - b.slot : a.instance.localeCompare(b.instance)
  );

  const deployments = Object.fromEntries(listDeployments());
  const leaves: ClaimLeafInput[] = [];
  const accepted: { instance: string; slot: number }[] = [];

  /**
   * Which deployment an opening refers to.
   *
   * Three ways, in decreasing order of how much they can be trusted:
   *
   *   1. **The address the opening carries**, matched against a payroll
   *      deployment on this network. Unambiguous — it is the value the leaf
   *      binds to — and the only one immune to a naming convention changing.
   *   2. **`payroll:<instance>`**, which is how per-company deployments are
   *      keyed and how every opening written before onboarding stopped
   *      deploying names its contract.
   *   3. **The bare `payroll` deployment**, and only when the opening literally
   *      names it. Onboarding now assigns that one contract, so an employer's
   *      page reports its instance as `payroll` and rule 2 looks for
   *      `payroll:payroll` — a key that has never existed. Every opening
   *      written since then was skipped as "not deployed on this network",
   *      which is a true statement about a key and a false one about a
   *      contract that is deployed and holds the attestation.
   *
   * The fallback is deliberately not "try the base contract whenever the name
   * misses": that would relay a typo'd instance against whichever payroll
   * happens to be the default, and the attestation check below would usually —
   * but not always — catch it. Naming the base contract is an exact match, not
   * a guess.
   */
  const resolve = (opening: TerminationOpening) => {
    const wanted = opening.contractAddress?.replace(/^0x/, "").toLowerCase();
    if (wanted) {
      const byAddress = Object.values(deployments).find(
        (record) =>
          record.networkId === network.networkId &&
          record.contractName === "payroll" &&
          record.contractAddress.replace(/^0x/, "").toLowerCase() === wanted
      );
      if (byAddress) return byAddress;
    }
    return (
      deployments[deploymentKey(network.networkId, "payroll", opening.instance)] ??
      (opening.instance === "payroll"
        ? deployments[deploymentKey(network.networkId, "payroll")]
        : undefined)
    );
  };

  for (const opening of openings) {
    const record = resolve(opening);
    const skip = (reason: string) => {
      skipped.push({ instance: opening.instance, slot: opening.slot, reason });
      log(`   skipped ${opening.instance} slot ${opening.slot}: ${reason}`);
    };

    if (!record) {
      skip(
        opening.contractAddress
          ? `no payroll deployment on ${network.networkId} at ${opening.contractAddress.slice(0, 16)}…`
          : `no payroll deployment on ${network.networkId} named "${opening.instance}"`
      );
      continue;
    }

    const ledger = await fetchLedger(network.indexer, record.contractAddress);
    if (!ledger) {
      skip("contract state unreadable, or it predates this build");
      continue;
    }

    const p = BigInt(opening.finalPeriod);
    const slot = BigInt(opening.slot);

    if (!ledger.terminationFor.member(p) || !ledger.terminationFor.lookup(p).member(slot)) {
      skip("no attestation on chain for that slot");
      continue;
    }

    // The opening must reproduce what the employer signed. Checked here rather
    // than trusted, because a relay that publishes a leaf the employer never
    // attested to would be publishing its own claim about someone's employment.
    const attested = hex(ledger.terminationFor.lookup(p).lookup(slot));
    const recomputed = hex(
      (await payroll()).pureCircuits.terminationCommitment(
        BigInt(opening.finalPeriod),
        BigInt(opening.monthsWorked),
        fromHex(opening.claimKeyHash),
        fromHex(opening.nonce)
      )
    );
    if (attested !== recomputed) {
      skip("REFUSED — the opening does not match the attestation on chain");
      continue;
    }

    leaves.push({
      commitment: ledger.commitmentsFor.lookup(p).lookup(slot),
      payeeBinding: ledger.payeeFor.lookup(p).lookup(slot),
      claimKeyHash: fromHex(opening.claimKeyHash),
      finalPeriod: BigInt(opening.finalPeriod),
      monthsWorked: BigInt(opening.monthsWorked),
      instance: fromHex(record.contractAddress),
    });
    accepted.push({ instance: opening.instance, slot: opening.slot });
    log(`   ✓ ${opening.instance} slot ${opening.slot} — ${opening.monthsWorked} months`);
  }

  if (leaves.length === 0) {
    return { period, root: null, bundles: [], skipped, warnings, published: false, txHash: null };
  }

  const tree = buildTree(leaves);
  log(`Root: ${tree.root.toString()} over ${leaves.length} leaf/leaves`);

  // The pool coin each bundle carries. `relay.ts` explains what handing one out
  // discloses and why two claimants must not share: she learns that coin's
  // value, and a shared coin makes them race for a spent input.
  const fundRecord = getDeployment(network.networkId, "fund");
  const recorded = fundRecord
    ? listDeposits(network.networkId, fundRecord.contractAddress)
        .filter((d) => d.status === "confirmed" && d.ordinal !== null)
        // Largest first, so the coins most likely to cover a benefit are handed
        // out; a claimant left with one too small is a deposit away from
        // claiming, not a rebuild away.
        .sort((a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : -1))
    : [];

  const fundLeaves = fundRecord
    ? await contractLeaves(
        indexerPublicDataProvider(network.indexer, network.indexerWS) as any,
        fundRecord.contractAddress
      )
    : [];

  const coins = recorded
    .map((d) => ({ deposit: d, mtIndex: fundLeaves[d.ordinal as number] }))
    .filter((c) => c.mtIndex !== undefined);

  if (recorded.length > coins.length) {
    warnings.push(
      `${recorded.length - coins.length} recorded fund coin(s) have no visible leaf — the indexer may be behind.`
    );
  }

  // The rule set to claim under: the newest published version that had taken
  // effect by the final period. Chosen here rather than by the claimant, so a
  // claim cannot be built under a version the fund would reject.
  const applicable = PUBLISHED.filter((v) => v.validFrom <= period).sort(
    (a, b) => b.version - a.version
  )[0];
  if (!applicable) {
    warnings.push(
      `No rule set in utils/benefit-params.ts applies to ${period}; bundles carry no version.`
    );
  }
  if (coins.length < accepted.length) {
    warnings.push(
      `${accepted.length} claimant(s) but only ${coins.length} recorded fund coin(s). ` +
        "Deposit more before they claim, or they will be handed the same coin and race."
    );
  }

  const bundles: ClaimBundle[] = accepted.map((entry, index) => {
    const claimPath = tree.pathFor(index);
    return {
      period,
      instance: entry.instance,
      slot: entry.slot,
      root: tree.root.toString(),
      leaf: {
        commitment: hex(leaves[index]!.commitment),
        payeeBinding: hex(leaves[index]!.payeeBinding),
        claimKeyHash: hex(leaves[index]!.claimKeyHash),
        finalPeriod: Number(leaves[index]!.finalPeriod),
        monthsWorked: Number(leaves[index]!.monthsWorked),
        instance: hex(leaves[index]!.instance),
      },
      leafDigest: hex(claimPath.leaf),
      path: claimPath.path.map((e) => ({ sibling: e.sibling.toString(), goesLeft: e.goesLeft })),
      fund: fundRecord?.contractAddress ?? null,
      paramsVersion: applicable?.version ?? null,
      // One distinct coin each, by position. With fewer coins than claimants
      // this repeats and they race — warned about above rather than wrapped
      // silently.
      poolCoin: coins.length
        ? {
            nonce: coins[index % coins.length]!.deposit.nonce,
            color: coins[index % coins.length]!.deposit.color,
            // Minor units as a string: JSON has no bigint, and a value rounded
            // through a float would be a coin that does not exist.
            value: coins[index % coins.length]!.deposit.value,
            mtIndex: coins[index % coins.length]!.mtIndex as number,
          }
        : null,
    };
  });

  if (!publish) {
    return { period, root: tree.root.toString(), bundles, skipped, warnings, published: false, txHash: null };
  }

  if (!fundRecord) throw new Error(`No fund deployed on ${network.networkId}`);

  log("Building wallet…");
  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  let txHash: string | null = null;
  try {
    await waitForSync(wallet, (line: string) => log(`   ${line}`));
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: "fund",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });

    const compiled = await loadCompiledContract("fund");
    const deployed: any = await findDeployedContract(providers as any, {
      contractAddress: fundRecord.contractAddress,
      compiledContract: compiled.compiledContract as any,
    } as any);

    log("Publishing the root — proving takes a few minutes…");
    const tx = await deployed.callTx.publishRoot(BigInt(period), tree.root);
    txHash = String(tx.public?.txHash ?? "");
    log(`Published: ${txHash}`);
  } finally {
    await wallet.facade.stop();
  }

  return { period, root: tree.root.toString(), bundles, skipped, warnings, published: true, txHash };
}
