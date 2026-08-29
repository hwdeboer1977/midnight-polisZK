// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import path from "path";
import { createHash } from "crypto";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { EnvironmentManager } from "../utils/environment.js";
import { managedPath } from "../utils/contract.js";
import { wasmProofProvider } from "../utils/wasm-proving.js";

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

  const seed = EnvironmentManager.getMasterSeedHex();
  const digest = createHash("sha256")
    .update(`midnight-private-state:${seed}`)
    .digest("base64");
  // Guarantees length and a mix of character classes for the strength policy.
  return `Ps1!${digest.slice(0, 28)}`;
}

/**
 * Where proofs are generated. `wasm` in this process, `http` at a proof server.
 *
 * Defaults to `wasm`, which is the choice that makes this deployable: a proof
 * server is a separate Rust service needing 4 GB of RAM by its own docs, and
 * requiring one turned "host the backend" into "host two things, one of them
 * large". Nothing about the proofs differs — `zkir-v2` is the same prover the
 * server wraps.
 *
 * `http` stays available and is worth keeping. It is the well-trodden path, it
 * moves the CPU and memory cost off this process, and if in-process proving
 * ever misbehaves the fix is one environment variable rather than a rollback.
 */
export type ProvingMode = "wasm" | "http";

export function provingMode(): ProvingMode {
  return process.env.PROVING_MODE === "http" ? "http" : "wasm";
}

/**
 * Chosen synchronously, resolved lazily.
 *
 * `MidnightProviders.create` is synchronous and called from a dozen places,
 * while building the WASM provider is async — it dynamically imports the prover
 * and the wallet SDK's key fetcher. Rather than make every caller async, the
 * returned provider defers construction to its first `proveTx`, which is the
 * moment something is actually going to be proved. The promise is kept, so the
 * import and the S3-backed caches happen once per provider rather than per
 * proof.
 */
function chooseProofProvider(config: ProviderConfig, zkConfigProvider: any): any {
  if (provingMode() === "http") {
    // The proof provider proves circuit-by-circuit, so it needs the ZK config
    // to look up keys and zkIR.
    return httpClientProofProvider(config.networkConfig.proofServer, zkConfigProvider);
  }

  let pending: Promise<any> | null = null;
  return {
    proveTx: async (unprovenTx: any, proveTxConfig?: any) => {
      pending ??= wasmProofProvider(config.contractName);
      const provider = await pending;
      return provider.proveTx(unprovenTx, proveTxConfig);
    },
  };
}

export class MidnightProviders {
  static create(config: ProviderConfig) {
    // Resolved rather than hardcoded, so a checkout without contracts/managed
    // falls back to the committed copies under frontend/public/zk.
    const zkConfigProvider = new NodeZkConfigProvider(managedPath(config.contractName));

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
      proofProvider: chooseProofProvider(config, zkConfigProvider),
      walletProvider: config.walletProvider,
      midnightProvider: config.midnightProvider,
    };
  }
}
