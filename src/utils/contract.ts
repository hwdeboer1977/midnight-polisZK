// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { pipe } from "effect";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { managedPath } from "./contract-version.js";
import { currentInstance, deploymentKey, getDeployment } from "./deployments.js";
import { buildWallet, makeWalletProviders, waitForSync, type BuiltWallet } from "./wallet.js";

// Re-exported from its leaf module so every existing `from "./contract.js"`
// import keeps working; see contract-version.ts for why it moved.
export { managedPath };

export interface Connection {
  wallet: BuiltWallet;
  /** Hex coin public key of the wallet driving this session. */
  myPublicKey: string;
  providers: ReturnType<typeof MidnightProviders.create>;
  /** The generated module for this contract: `Contract`, `ledger`, etc. */
  contractModule: any;
  /** Needed by submitCallTx, which takes options the callTx shorthand cannot. */
  compiledContract: any;
  deployed: any;
  contractAddress: string;
}

/**
 * Path to a contract's generated JS module.
 *
 * Resolved separately from the ZK assets because the two do not travel
 * together: `contracts/managed/<n>/contract/index.js` is gitignored alongside
 * the rest of `managed`, while the committed copy lives under
 * `frontend/src/generated/<n>/index.js` — a different layout, put there for the
 * browser and equally usable here.
 */
export function contractModulePath(contractName: string): string {
  const compiled = path.join(
    process.cwd(), "contracts", "managed", contractName, "contract", "index.js"
  );
  if (fs.existsSync(compiled)) return compiled;

  const committed = path.join(
    process.cwd(), "frontend", "src", "generated", contractName, "index.js"
  );
  if (fs.existsSync(committed)) return committed;

  throw new Error(
    `No compiled module for "${contractName}". Run \`npm run compile\`, or check that ` +
      `frontend/src/generated/${contractName} shipped with this checkout.`
  );
}

/**
 * Loads a compiled contract and binds it to its ZK assets. Shared by deploy and
 * by the per-contract CLIs so the binding is defined in exactly one place.
 */
export async function loadCompiledContract(contractName: string) {
  const dir = managedPath(contractName);
  const contractModule = await import(contractModulePath(contractName));
  const compiledContract = pipe(
    CompiledContract.make(contractName, contractModule.Contract),
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(dir)
  );
  return { contractModule, compiledContract };
}

/**
 * Everything a CLI needs to talk to an already-deployed contract: a synced
 * wallet, providers, and the contract handle. Callers must stop the wallet.
 */
export async function connect(
  contractName: string,
  /**
   * `null` means "this contract is not instanced" — passing `undefined` would
   * fall through to the default and pick up INSTANCE, which scopes payroll and
   * must not leak into single-deployment contracts like pEUR.
   */
  instance: string | null = currentInstance() ?? null
): Promise<Connection> {
  const scope = instance ?? undefined;
  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();

  const key = deploymentKey(network.networkId, contractName, scope);
  const deployment = getDeployment(network.networkId, contractName, scope);
  if (!deployment) {
    throw new Error(
      `No deployment for "${key}". Run: ` +
        `${scope ? `INSTANCE=${scope} ` : ""}CONTRACT_NAME=${contractName} npm run deploy`
    );
  }

  const secret = EnvironmentManager.getWalletSecret();
  setNetworkId(network.networkId);

  console.log(chalk.gray("Building wallet..."));
  const wallet = await buildWallet(secret, network);

  console.log(
    chalk.gray(
      wallet.resumed
        ? "Syncing (resuming from cached state)..."
        : "Syncing (no cached state — this can take a while)..."
    )
  );
  await waitForSync(wallet, (line) => console.log(chalk.gray(`   ${line}`)));

  const { contractModule, compiledContract } = await loadCompiledContract(contractName);

  const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
  const providers = MidnightProviders.create({
    contractName,
    walletProvider,
    midnightProvider,
    networkConfig: network,
    accountId: wallet.unshieldedAddress,
    // Instances must not share a private state store.
    privateStateStoreName: `${key.replace(/[/:]/g, "-")}-state`,
  });

  const deployed: any = await findDeployedContract(providers as any, {
    compiledContract: compiledContract as any,
    contractAddress: deployment.contractAddress,
  });

  return {
    wallet,
    myPublicKey: String(wallet.shieldedSecretKeys.coinPublicKey),
    providers,
    contractModule,
    compiledContract,
    deployed,
    contractAddress: deployment.contractAddress,
  };
}

/** Reads the contract's public ledger state, or null if it has none yet. */
export async function readLedger(conn: Connection): Promise<any | null> {
  const state = await conn.providers.publicDataProvider.queryContractState(
    conn.contractAddress
  );
  return state ? conn.contractModule.ledger(state.data) : null;
}

/**
 * The leaf indices of the coins a contract owns, ascending.
 *
 * The contract stores nothing about its own coins — storing a
 * `QualifiedShieldedCoinInfo` would publish its value in cleartext — so the
 * indexer is the only place this exists. `filter(address)` reports every coin
 * the contract ever received, spent ones included; there is no unspent view.
 * That is why callers match leaves to a contract's own `coinsReceived` ordinal
 * rather than counting positions from zero.
 */
export async function contractLeaves(
  publicDataProvider: { queryZSwapAndContractState: (address: string) => Promise<unknown> },
  contractAddress: string
): Promise<number[]> {
  const result = await publicDataProvider.queryZSwapAndContractState(contractAddress);
  if (!result) return [];
  const [zswap] = result as any;
  const text = String(zswap.filter(contractAddress).toString(true));
  return [...text.matchAll(/(\d+): \([0-9a-f]{64}, Some\(ContractAddress/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}
