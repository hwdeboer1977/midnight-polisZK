import path from "path";
import chalk from "chalk";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { pipe } from "effect";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { currentInstance, deploymentKey, getDeployment } from "./deployments.js";
import { buildWallet, makeWalletProviders, waitForSync, type BuiltWallet } from "./wallet.js";

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

/** Path to a contract's compiled artifacts. */
export function managedPath(contractName: string): string {
  return path.join(process.cwd(), "contracts", "managed", contractName);
}

/**
 * Loads a compiled contract and binds it to its ZK assets. Shared by deploy and
 * by the per-contract CLIs so the binding is defined in exactly one place.
 */
export async function loadCompiledContract(contractName: string) {
  const dir = managedPath(contractName);
  const contractModule = await import(path.join(dir, "contract", "index.js"));
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
