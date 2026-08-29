// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import path from "path";
import { validateMnemonic } from "@midnight-ntwrk/wallet-sdk";
import type { NetworkConfig } from "../providers/midnight-providers.js";
import { masterSeedHex, type WalletSecret } from "./wallet.js";

/**
 * Devnet dev-preset account. The `CFG_PRESET: dev` node genesis pre-funds this
 * seed with NIGHT, so local runs need no faucet. Overridable with WALLET_SEED.
 */
export const LOCAL_DEV_SEED =
  "0000000000000000000000000000000000000000000000000000000000000001";

export class EnvironmentManager {
  static getNetwork(): string {
    return process.env.MIDNIGHT_NETWORK || "local";
  }

  static getNetworkConfig(): NetworkConfig {
    const network = EnvironmentManager.getNetwork();

    const networks = {
      // Ports match compose.yml. `undeployed` is the network id the standalone
      // indexer and the dev-preset node agree on; anything else makes addresses
      // encode differently and the indexer reject the transaction.
      local: {
        networkId: "undeployed",
        indexer: "http://127.0.0.1:8088/api/v4/graphql",
        indexerWS: "ws://127.0.0.1:8088/api/v4/graphql/ws",
        node: "http://127.0.0.1:9944",
        nodeWS: "ws://127.0.0.1:9944",
        proofServer: process.env.PROOF_SERVER_URL || "http://127.0.0.1:6300",
        faucet: "",
        name: "Local devnet",
      },
      preprod: {
        networkId: "preprod",
        indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
        indexerWS: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
        node: "https://rpc.preprod.midnight.network",
        nodeWS: "wss://rpc.preprod.midnight.network",
        proofServer: process.env.PROOF_SERVER_URL || "http://127.0.0.1:6300",
        faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
        name: "Preprod",
      },
      preview: {
        networkId: "preview",
        indexer: "https://indexer.preview.midnight.network/api/v4/graphql",
        indexerWS: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
        node: "https://rpc.preview.midnight.network",
        nodeWS: "wss://rpc.preview.midnight.network",
        proofServer: process.env.PROOF_SERVER_URL || "http://127.0.0.1:6300",
        faucet: "https://midnight-tmnight-preview.nethermind.dev/",
        name: "Preview",
      },
    };

    const config = networks[network as keyof typeof networks];
    if (!config) {
      throw new Error(
        `Unknown MIDNIGHT_NETWORK "${network}". Supported networks: ${Object.keys(
          networks
        ).join(", ")}`
      );
    }

    return config;
  }

  static isLocal(): boolean {
    return EnvironmentManager.getNetwork() === "local";
  }

  /**
   * How the wallet is identified, in priority order: an explicit mnemonic, an
   * explicit hex seed, or — on local devnet only — the pre-funded dev seed, so
   * a fresh clone runs with nothing configured.
   *
   * A recovery phrase is what browser wallets (Lace, IAM) actually give you;
   * they never export a raw key. Both forms end at the same HD derivation.
   */
  static getWalletSecret(): WalletSecret {
    const mnemonic = process.env.WALLET_MNEMONIC?.trim().replace(/\s+/g, " ");
    const seed = process.env.WALLET_SEED?.trim();

    if (mnemonic && seed) {
      throw new Error(
        "Set only one of WALLET_MNEMONIC or WALLET_SEED (both are defined)."
      );
    }
    if (mnemonic) return { kind: "mnemonic", value: mnemonic };
    if (seed) return { kind: "seed", value: seed };
    if (EnvironmentManager.isLocal()) {
      return { kind: "seed", value: LOCAL_DEV_SEED };
    }
    throw new Error(
      `WALLET_MNEMONIC or WALLET_SEED is required for network ` +
        `"${EnvironmentManager.getNetwork()}". Set one in .env.`
    );
  }

  /** Where the secret came from, for display. Never includes the secret. */
  static describeWalletSecret(): string {
    if (process.env.WALLET_MNEMONIC?.trim()) return "recovery phrase (.env)";
    if (process.env.WALLET_SEED?.trim()) return "seed (.env)";
    return "local devnet dev seed";
  }

  /** Stable per-wallet secret used to derive the private state password. */
  static getMasterSeedHex(): string {
    return masterSeedHex(EnvironmentManager.getWalletSecret());
  }

  static validateEnvironment(): void {
    const secret = EnvironmentManager.getWalletSecret();

    if (secret.kind === "mnemonic") {
      const words = secret.value.split(" ").length;
      if (!validateMnemonic(secret.value)) {
        throw new Error(
          `WALLET_MNEMONIC is not a valid BIP-39 phrase (${words} words read). ` +
            `Check for typos, extra quotes, or a missing word.`
        );
      }
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(secret.value)) {
      throw new Error("WALLET_SEED must be a 64-character hexadecimal string");
    }
  }

  static checkContractCompiled(contractName: string): boolean {
    const contractPath = path.join(
      process.cwd(),
      "contracts",
      "managed",
      contractName
    );
    const keysPath = path.join(contractPath, "keys");
    const contractModulePath = path.join(contractPath, "contract", "index.js");

    return fs.existsSync(keysPath) && fs.existsSync(contractModulePath);
  }

  /**
   * Guards against the failure mode where `contracts/managed` was produced by a
   * different compiler than the installed runtime: the contract module throws
   * `Version mismatch` only at import time, deep inside deploy.
   */
  static checkRuntimeVersion(contractName: string): {
    ok: boolean;
    compiled?: string;
    installed?: string;
  } {
    const infoPath = path.join(
      process.cwd(),
      "contracts",
      "managed",
      contractName,
      "compiler",
      "contract-info.json"
    );
    const runtimePkg = path.join(
      process.cwd(),
      "node_modules",
      "@midnight-ntwrk",
      "compact-runtime",
      "package.json"
    );
    if (!fs.existsSync(infoPath) || !fs.existsSync(runtimePkg)) return { ok: true };

    const compiled = JSON.parse(fs.readFileSync(infoPath, "utf8"))[
      "runtime-version"
    ] as string;
    const installed = JSON.parse(fs.readFileSync(runtimePkg, "utf8"))
      .version as string;

    return { ok: compiled === installed, compiled, installed };
  }
}
