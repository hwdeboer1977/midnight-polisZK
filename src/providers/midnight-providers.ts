import path from "path";
import { createHash } from "crypto";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { EnvironmentManager } from "../utils/environment.js";

export interface NetworkConfig {
  /** Network identifier used for address encoding and transaction binding. */
  networkId: string;
  indexer: string;
  indexerWS: string;
  node: string;
  /** Same node over WebSocket. The wallet's relay client requires ws://|wss://. */
  nodeWS: string;
  proofServer: string;
  /** Faucet that funds the unshielded address with tNIGHT. */
  faucet: string;
  name: string;
}

export interface ProviderConfig {
  contractName: string;
  walletProvider: any;
  midnightProvider: any;
  networkConfig: NetworkConfig;
  /** Scopes the private state store; use the wallet address. */
  accountId: string;
  privateStateStoreName?: string;
}

/**
 * The private state store is encrypted and requires a password meeting the
 * SDK's strength policy. It protects data that is already only as secret as
 * WALLET_SEED, so it is derived from the seed by default rather than being a
 * second secret to manage. PRIVATE_STATE_PASSWORD overrides it.
 */
function privateStatePassword(): string {
  const override = process.env.PRIVATE_STATE_PASSWORD;
  if (override) return override;

  const seed = EnvironmentManager.getWalletSeed();
  const digest = createHash("sha256")
    .update(`midnight-private-state:${seed}`)
    .digest("base64");
  // Guarantees length and a mix of character classes for the strength policy.
  return `Ps1!${digest.slice(0, 28)}`;
}

export class MidnightProviders {
  static create(config: ProviderConfig) {
    const zkConfigPath = path.join(
      process.cwd(),
      "contracts",
      "managed",
      config.contractName
    );

    const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

    return {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName:
          config.privateStateStoreName || `${config.contractName}-state`,
        accountId: config.accountId,
        privateStoragePasswordProvider: privateStatePassword,
      }),
      publicDataProvider: indexerPublicDataProvider(
        config.networkConfig.indexer,
        config.networkConfig.indexerWS
      ),
      zkConfigProvider,
      // The proof provider now proves circuit-by-circuit, so it needs the ZK
      // config to look up keys and zkIR.
      proofProvider: httpClientProofProvider(
        config.networkConfig.proofServer,
        zkConfigProvider
      ),
      walletProvider: config.walletProvider,
      midnightProvider: config.midnightProvider,
    };
  }
}
