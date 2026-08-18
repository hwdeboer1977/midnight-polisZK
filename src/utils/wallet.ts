import {
  HDWallet,
  Roles,
  createKeystore,
  type UnshieldedKeystore,
  PublicKey,
  WalletFacade,
  ShieldedWallet,
  UnshieldedWallet,
  DustWallet,
  WalletEntrySchema,
  mergeWalletEntries,
  InMemoryTransactionHistoryStorage,
} from "@midnight-ntwrk/wallet-sdk";
import {
  LedgerParameters,
  ZswapSecretKeys,
  DustSecretKey,
} from "@midnight-ntwrk/ledger-v8";
import * as Rx from "rxjs";
import { WebSocket } from "ws";
import type { NetworkConfig } from "../providers/midnight-providers.js";

// The indexer's GraphQL subscriptions need a WebSocket implementation on the
// global. Node 22 ships one, but the graphql-ws client the provider uses only
// picks up the `ws` implementation reliably when it is set explicitly.
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Keys for the three wallets the facade composes. Each comes from its own HD
 * role, which is what `Roles` exists to separate.
 */
export interface DerivedKeys {
  unshieldedKeystore: UnshieldedKeystore;
  shieldedSeed: Uint8Array;
  dustSeed: Uint8Array;
}

const ROLES = [Roles.NightExternal, Roles.Zswap, Roles.Dust] as const;

export function deriveKeys(seedHex: string, networkId: string): DerivedKeys {
  const seed = Buffer.from(seedHex, "hex");

  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== "seedOk") {
    throw new Error(`Could not derive HD wallet from WALLET_SEED: ${hd.error}`);
  }

  const derived = hd.hdWallet
    .selectAccount(0)
    .selectRoles(ROLES)
    .deriveKeysAt(0);
  if (derived.type !== "keysDerived") {
    throw new Error(
      `Key derivation out of bounds for roles: ${derived.roles.join(", ")}`
    );
  }
  hd.hdWallet.clear();

  return {
    unshieldedKeystore: createKeystore(
      derived.keys[Roles.NightExternal],
      networkId
    ),
    shieldedSeed: derived.keys[Roles.Zswap],
    dustSeed: derived.keys[Roles.Dust],
  };
}

/**
 * The address the faucet funds. Derivable offline — no indexer round-trip — so
 * it stays available even when the network is unreachable.
 */
export function getUnshieldedAddress(seedHex: string, networkId: string): string {
  return deriveKeys(seedHex, networkId).unshieldedKeystore.getBech32Address().toString();
}

export function buildConfiguration(network: NetworkConfig) {
  return {
    networkId: network.networkId,
    indexerClientConnection: {
      indexerHttpUrl: network.indexer,
      indexerWsUrl: network.indexerWS,
    },
    relayURL: new URL(network.nodeWS),
    provingServerUrl: new URL(network.proofServer),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(
      WalletEntrySchema,
      mergeWalletEntries
    ),
    // The dust wallet's fee dry-run needs the ledger's cost model. Without
    // `ledgerParams` the estimator never converges: balancing a call spins in
    // `dryRunFee`/`addIntent` inside the ledger WASM instead of returning.
    costParameters: {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    },
  };
}

export interface BuiltWallet {
  facade: WalletFacade;
  keys: DerivedKeys;
  shieldedSecretKeys: ZswapSecretKeys;
  dustSecretKey: DustSecretKey;
  unshieldedAddress: string;
}

/** Builds and starts the three-wallet facade. Caller is responsible for stop(). */
export async function buildWallet(
  seedHex: string,
  network: NetworkConfig
): Promise<BuiltWallet> {
  const keys = deriveKeys(seedHex, network.networkId);
  const configuration = buildConfiguration(network);
  const dustParameters = LedgerParameters.initialParameters().dust;

  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) => ShieldedWallet(config).startWithSeed(keys.shieldedSeed),
    unshielded: (config) =>
      UnshieldedWallet(config).startWithPublicKey(
        PublicKey.fromKeyStore(keys.unshieldedKeystore)
      ),
    dust: (config) =>
      DustWallet(config).startWithSeed(keys.dustSeed, dustParameters),
  });

  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(keys.shieldedSeed);
  const dustSecretKey = DustSecretKey.fromSeed(keys.dustSeed);

  await facade.start(shieldedSecretKeys, dustSecretKey);

  return {
    facade,
    keys,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedAddress: keys.unshieldedKeystore.getBech32Address().toString(),
  };
}

/**
 * Waits for a synced state while reporting progress. A fresh wallet syncs from
 * genesis, which is slow and silent otherwise.
 */
export async function waitForSync(
  wallet: BuiltWallet,
  onProgress?: (line: string) => void
) {
  const sub = wallet.facade
    .state()
    .pipe(Rx.throttleTime(5000, undefined, { leading: true, trailing: true }))
    .subscribe((state) => {
      const p = state.unshielded.progress;
      const pct =
        p.highestTransactionId > 0n
          ? Number((p.appliedId * 100n) / p.highestTransactionId)
          : 0;
      onProgress?.(
        `sync ${pct}%  (tx ${p.appliedId}/${p.highestTransactionId}, connected=${p.isConnected})`
      );
    });

  try {
    return await wallet.facade.waitForSyncedState();
  } finally {
    sub.unsubscribe();
  }
}

/** Default transaction time-to-live. */
const TTL_MS = 60 * 60 * 1000;

/**
 * Adapts the wallet facade to the midnight-js provider interfaces. Balancing is
 * now a two-step recipe: balance against the wallet's coins, then finalize.
 */
export function makeWalletProviders(wallet: BuiltWallet) {
  const secretKeys = {
    shieldedSecretKeys: wallet.shieldedSecretKeys,
    dustSecretKey: wallet.dustSecretKey,
  };

  const walletProvider = {
    balanceTx: async (tx: any, ttl?: Date) => {
      const recipe = await wallet.facade.balanceUnboundTransaction(
        tx,
        secretKeys,
        { ttl: ttl ?? new Date(Date.now() + TTL_MS) }
      );
      return wallet.facade.finalizeRecipe(recipe);
    },
    getCoinPublicKey: () => wallet.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => wallet.shieldedSecretKeys.encryptionPublicKey,
  };

  const midnightProvider = {
    submitTx: (tx: any) => wallet.facade.submitTransaction(tx),
  };

  return { walletProvider, midnightProvider };
}
