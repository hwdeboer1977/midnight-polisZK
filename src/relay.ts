import "dotenv/config";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import * as payrollContract from "../contracts/managed/payroll/contract/index.js";
import * as fundContract from "../contracts/managed/fund/contract/index.js";
import { EnvironmentManager } from "./utils/environment.js";
import { getDeployment, listDeployments } from "./utils/deployments.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { contractLeaves, loadCompiledContract } from "./utils/contract.js";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { buildTree, type ClaimLeafInput } from "./utils/claim-tree.js";
import { PUBLISHED } from "./utils/benefit-params.js";
import { listDeposits } from "./utils/fund-pool.js";

/**
 * The relay: publishes one period's claim tree to the fund.
 *
 * It exists because of a wall, not a preference. A fund contract cannot read a
 * payroll ledger and a payroll contract cannot call the fund — both probed, both
 * settled — so the fund cannot check a claim against the commitment that backs
 * it. Something has to carry public payroll state across, and that something is
 * trusted to carry it faithfully.
 *
 * Be precise about what that trust is. A forged root is not prevented: nothing
 * in the fund can tell a true copy from an invented one. It is ATTRIBUTABLE and
 * publicly checkable — every input is public payroll state, so anyone with an
 * indexer can rebuild the tree and compare. And `publishRoot` is permissionless,
 * so a relay that declines to publish cannot silently block a claim; someone
 * else can publish the same root.
 *
 * What the relay never sees: any salary. Leaves are built from commitments and
 * payee bindings, both already public and both opaque. The one non-public input
 * is the termination opening, which carries months worked and a claim-key hash —
 * not an amount.
 *
 *   npm run relay -- <period>              build and write claim bundles
 *   npm run relay -- <period> --publish    and publish the root to the fund
 */

interface TerminationOpening {
  instance: string;
  slot: number;
  finalPeriod: number;
  monthsWorked: number;
  /** Hex, 32 bytes. hash(claimKey), from the employee. */
  claimKeyHash: string;
  /** Hex, 32 bytes. The employer's blinding nonce for the attestation. */
  nonce: string;
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
    const ledger = (payrollContract as any).ledger(
      ContractState.deserialize(Buffer.from(encoded, "hex")).data
    );
    void ledger.employerAssigned;
    return ledger;
  } catch {
    // Predates this build of the contract. Skipped rather than fatal: one old
    // instance must not stop every other employer's claimants from being able
    // to claim.
    return null;
  }
}

/** Openings the employers have handed over, for this period. */
function readOpenings(period: number): TerminationOpening[] {
  const dir = path.join(process.cwd(), "terminations");
  if (!fs.existsSync(dir)) return [];
  const openings: TerminationOpening[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      if (Number(entry.finalPeriod) === period) openings.push(entry);
    }
  }
  return openings;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const publish = args.includes("--publish");
  const periodArg = args.find((a) => !a.startsWith("--"));
  if (!periodArg) throw new Error("Usage: npm run relay -- <period> [--publish]");
  const period = Number(periodArg);

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  console.log();
  console.log(chalk.blue.bold("🌙  IncomeLayerZK — claim tree relay"));
  console.log(chalk.gray(`   period ${period} on ${network.name}`));
  console.log();

  const openings = readOpenings(period);
  if (openings.length === 0) {
    console.log(chalk.yellow("No termination openings for that period in ./terminations."));
    console.log(
      chalk.gray(
        "   Each employer writes one file per terminated employee. Without the\n" +
          "   opening the attestation on chain is an opaque hash and no leaf can\n" +
          "   be built from it — which is the point: the relay is given what it\n" +
          "   needs and nothing else."
      )
    );
    console.log();
    return;
  }

  const deployments = Object.fromEntries(listDeployments());
  const leaves: ClaimLeafInput[] = [];
  const bundles: any[] = [];

  // Sorted so the tree is reproducible: a rebuild in a different order is a
  // different root, and every path already issued against the first would then
  // verify against nothing.
  openings.sort((a, b) =>
    a.instance === b.instance ? a.slot - b.slot : a.instance.localeCompare(b.instance)
  );

  for (const opening of openings) {
    const record = deployments[`${network.networkId}/payroll:${opening.instance}`];
    if (!record) {
      console.log(chalk.yellow(`   skipped ${opening.instance}: not deployed here`));
      continue;
    }

    const ledger = await fetchLedger(network.indexer, record.contractAddress);
    if (!ledger) {
      console.log(chalk.yellow(`   skipped ${opening.instance}: state unreadable`));
      continue;
    }

    const p = BigInt(opening.finalPeriod);
    const slot = BigInt(opening.slot);

    if (!ledger.terminationFor.member(p) || !ledger.terminationFor.lookup(p).member(slot)) {
      console.log(
        chalk.yellow(`   skipped ${opening.instance} slot ${opening.slot}: no attestation on chain`)
      );
      continue;
    }

    // The opening must reproduce what the employer signed. Checked here rather
    // than trusted, because a relay that publishes a leaf the employer never
    // attested to would be publishing its own claim about someone's employment.
    const attested = hex(ledger.terminationFor.lookup(p).lookup(slot));
    const recomputed = hex(
      (payrollContract as any).pureCircuits.terminationCommitment(
        BigInt(opening.finalPeriod),
        BigInt(opening.monthsWorked),
        fromHex(opening.claimKeyHash),
        fromHex(opening.nonce)
      )
    );
    if (attested !== recomputed) {
      console.log(
        chalk.red(`   REFUSED ${opening.instance} slot ${opening.slot}: opening does not match the attestation on chain`)
      );
      continue;
    }

    const leaf: ClaimLeafInput = {
      commitment: ledger.commitmentsFor.lookup(p).lookup(slot),
      payeeBinding: ledger.payeeFor.lookup(p).lookup(slot),
      claimKeyHash: fromHex(opening.claimKeyHash),
      finalPeriod: BigInt(opening.finalPeriod),
      monthsWorked: BigInt(opening.monthsWorked),
      instance: fromHex(record.contractAddress),
    };
    leaves.push(leaf);
    bundles.push({ instance: opening.instance, slot: opening.slot });
    console.log(
      chalk.green(`   ✓ ${opening.instance} slot ${opening.slot} — ${opening.monthsWorked} months`)
    );
  }

  if (leaves.length === 0) {
    console.log();
    console.log(chalk.yellow("Nothing to publish."));
    return;
  }

  const tree = buildTree(leaves);
  console.log();
  console.log(chalk.cyan.bold("Root: ") + chalk.white(tree.root.toString()));
  console.log(chalk.gray(`   over ${leaves.length} leaf/leaves`));

  // One bundle per claimant: the leaf they prove membership of, and the path.
  // Written out because only they can finish the claim — it needs their wallet
  // key and their claim key, neither of which the relay has or should have.
  //
  // The bundle also carries a POOL COIN, and that deserves stating rather than
  // slipping past. `claim` takes the fund's coin as an argument — nonce, value
  // and leaf — so a claimant cannot claim without being handed one. Two
  // consequences follow and neither is fixable from here: she learns that
  // coin's value, and two claimants given the same coin would race, with the
  // second losing to a spent input. So each gets a distinct one.
  //
  // The relay cannot size them. It sees commitments, never salaries, so it has
  // no idea what any benefit comes to — an undersized coin surfaces as a claim
  // that will not prove, and the fix is a deposit, not a change here.
  const fundRecordForBundles = getDeployment(network.networkId, "fund");
  const recorded = fundRecordForBundles
    ? listDeposits(network.networkId, fundRecordForBundles.contractAddress)
        .filter((d) => d.status === "confirmed" && d.ordinal !== null)
        // Largest first, so the coins most likely to cover a benefit are the
        // ones handed out; a claimant left with a coin too small is a deposit
        // away from claiming, not a rebuild away.
        .sort((a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : -1))
    : [];

  // The coin's leaf index, which `claim` needs and no local file records: the
  // contract keeps an ordinal into its own receipts, and only the indexer knows
  // which zswap leaf that ordinal landed on.
  const fundLeaves = fundRecordForBundles
    ? await contractLeaves(
        indexerPublicDataProvider(network.indexer, network.indexerWS) as any,
        fundRecordForBundles.contractAddress
      )
    : [];
  const coins = recorded
    .map((d) => ({ deposit: d, mtIndex: fundLeaves[d.ordinal as number] }))
    .filter((c) => c.mtIndex !== undefined);
  if (recorded.length > coins.length) {
    console.log(
      chalk.yellow(
        `   ⚠️  ${recorded.length - coins.length} recorded fund coin(s) have no visible leaf — the indexer may be behind.`
      )
    );
  }

  // The rule set to claim under: the newest published version that had taken
  // effect by the final period. Chosen here rather than by the claimant, so a
  // claim cannot be built under a version the fund would reject.
  const applicable = PUBLISHED.filter((p) => p.validFrom <= period).sort(
    (a, b) => b.version - a.version
  )[0];
  if (!applicable) {
    console.log(
      chalk.yellow(
        `   ⚠️  No rule set in utils/benefit-params.ts applies to ${period}; bundles will carry no version.`
      )
    );
  }
  if (coins.length < bundles.length) {
    console.log(
      chalk.yellow(
        `   ⚠️  ${bundles.length} claimant(s) but only ${coins.length} recorded fund coin(s). ` +
          "Deposit more before they claim, or they will be handed the same coin and race."
      )
    );
  }

  const outDir = path.join(process.cwd(), "claims", String(period));
  fs.mkdirSync(outDir, { recursive: true });
  bundles.forEach((bundle, index) => {
    const claimPath = tree.pathFor(index);
    // Named `claim-bundle-…` rather than `<instance>-slot-N`, because the
    // employer's termination opening for the same person is
    // `<instance>-<period>-slot-N.json` and the two were one character apart in
    // practice. They travel in opposite directions and neither is usable in the
    // other's place.
    const file = path.join(
      outDir,
      `claim-bundle-${bundle.instance}-${period}-slot-${bundle.slot + 1}.json`
    );
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          period,
          instance: bundle.instance,
          slot: bundle.slot,
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
          path: claimPath.path.map((entry) => ({
            sibling: entry.sibling.toString(),
            goesLeft: entry.goesLeft,
          })),
          fund: fundRecordForBundles?.contractAddress ?? null,
          paramsVersion: applicable?.version ?? null,
          // Minor units as a string: JSON has no bigint, and a value silently
          // rounded through a float would be a coin that does not exist.
          // One distinct coin each, by position. With fewer coins than
          // claimants this repeats and they race — which is why the count is
          // checked and warned about above rather than silently wrapped.
          poolCoin: coins.length
            ? {
                nonce: coins[index % coins.length]!.deposit.nonce,
                color: coins[index % coins.length]!.deposit.color,
                value: coins[index % coins.length]!.deposit.value,
                mtIndex: coins[index % coins.length]!.mtIndex,
              }
            : null,
        },
        null,
        2
      )
    );
    console.log(chalk.gray(`   wrote ${path.relative(process.cwd(), file)}`));
  });

  if (!publish) {
    console.log();
    console.log(chalk.gray("Not published — pass --publish to write the root to the fund."));
    console.log();
    return;
  }

  const fundRecord = getDeployment(network.networkId, "fund");
  if (!fundRecord) throw new Error(`No fund deployed on ${network.networkId}`);

  console.log();
  console.log(chalk.gray("Building wallet..."));
  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    await waitForSync(wallet, (l) => console.log(chalk.gray(`   ${l}`)));
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

    console.log(chalk.blue("Publishing the root (proving takes a few minutes)..."));
    const tx = await deployed.callTx.publishRoot(BigInt(period), tree.root);
    console.log(chalk.green(`   ✅ ${tx.public?.txHash ?? ""}`));
  } finally {
    await wallet.facade.stop();
  }
  console.log();
}

main().catch((error) => {
  console.log();
  console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
  console.log();
  process.exit(1);
});
