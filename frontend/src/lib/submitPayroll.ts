import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction } from "@midnight-ntwrk/ledger-v8";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { createProofProvider, ZKConfigProvider } from "@midnight-ntwrk/midnight-js-types";
import { pipe } from "effect";
import { fetchContractState, INDEXERS, INDEXER_WS, PROOF_SERVERS } from "./chain";
import {
  deriveEmployerKey,
  deriveNonce,
  keyFingerprint,
  openSealed,
  sealOpening,
} from "./openings";

/**
 * Submitting payroll from the browser.
 *
 * This is not a convenience over the CLI — for most instances it is the only
 * route. `setPayroll` asserts `ownPublicKey() == employer`, and the employer's
 * key lives in their browser wallet. The CLI signs with whatever is in `.env`,
 * which is the platform's wallet, so the CLI cannot file payroll for any
 * employer other than the operator themselves.
 *
 * Three parties do the work, and none of them sees everything:
 *
 *   - the proof server (localhost) proves the circuit, and never learns which
 *     wallet is submitting;
 *   - the wallet balances, signs, and submits, and never sees the salaries;
 *   - this page holds the salaries and forgets them when it navigates away.
 */

/**
 * Where the compiled ZK assets are served from. Written by `frontend:config`.
 *
 * The official `FetchZkConfigProvider` appends `keys/<circuit>.prover`,
 * `keys/<circuit>.verifier` and `zkir/<circuit>.bzkir` to this base, which is
 * the layout `copyZkAssets` already produces.
 */
const zkBaseUrl = (contractName: string) =>
  `${window.location.origin}/zk/${contractName}`;

/**
 * Private state that is never written.
 *
 * `payroll.compact` declares no witnesses — every input to `setPayroll` is a
 * circuit argument, not a witness — so the contract has no private state to
 * keep. An in-memory stub is the honest implementation: persisting an empty
 * object to IndexedDB would only add a failure mode.
 */
function emptyPrivateStateProvider(): any {
  const states = new Map<string, unknown>();
  const signingKeys = new Map<string, unknown>();

  return {
    setContractAddress: () => {},
    set: async (id: string, state: unknown) => void states.set(id, state),
    get: async (id: string) => states.get(id) ?? null,
    remove: async (id: string) => void states.delete(id),
    clear: async () => void states.clear(),
    setSigningKey: async (address: string, key: unknown) =>
      void signingKeys.set(address, key),
    getSigningKey: async (address: string) => signingKeys.get(address) ?? null,
    removeSigningKey: async (address: string) => void signingKeys.delete(address),
    clearSigningKeys: async () => void signingKeys.clear(),
    // Present because the interface has them, and an ephemeral store has
    // nothing meaningful to export. Throwing beats returning empty: a caller
    // that means to back something up should hear that it cannot.
    exportPrivateStates: async () => {
      throw new Error("not supported in-memory");
    },
    importPrivateStates: async () => {
      throw new Error("not supported in-memory");
    },
    exportSigningKeys: async () => {
      throw new Error("not supported in-memory");
    },
    importSigningKeys: async () => {
      throw new Error("not supported in-memory");
    },
  };
}

export interface SubmitProgress {
  (step: string): void;
}

export interface SubmitResult {
  txHash: string;
  blockHeight: number | null;
  period: number;
  totalMinor: bigint;
}

/**
 * Derives the employer's key from the passphrase, and refuses if it is wrong.
 *
 * The check is done against evidence rather than a second prompt: if the
 * contract already holds a sealed opening, the derived key is used to open one.
 * That tests the property that actually matters — "can this key still open what
 * it sealed?" — and it catches a mistyped passphrase before it writes a month
 * nobody could ever decrypt.
 *
 * On an empty contract there is nothing on chain to check against, so a
 * fingerprint kept in localStorage catches a typo between sessions. The UI asks
 * for confirmation in that case too.
 */
async function deriveKeyAndVerify(
  passphrase: string,
  contractAddress: string,
  networkId: string,
  onProgress: SubmitProgress
): Promise<Uint8Array> {
  onProgress("Deriving your key (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  onProgress("Checking the key against what is already on chain…");
  const existing = await anySealedOpening(networkId, contractAddress);

  if (existing) {
    try {
      await openSealed(employerKey, existing);
    } catch {
      throw new Error(
        "That passphrase cannot open the salary openings already stored on this " +
          "contract, so it is not the one used to file them. Submitting would add " +
          "a month nobody could ever decrypt. Nothing was sent."
      );
    }
  } else {
    const previous = localStorage.getItem(fingerprintKey(contractAddress));
    if (previous && previous !== (await keyFingerprint(employerKey))) {
      throw new Error(
        "That is a different passphrase than the one this browser filed with " +
          "last time, and the contract state has not caught up yet. Wait for the " +
          "previous transaction to be indexed, or check the passphrase. Nothing " +
          "was sent."
      );
    }
  }

  return employerKey;
}

/**
 * Where the fingerprint of a successfully-used key lives.
 *
 * Namespaced by derivation scheme. An earlier build derived the root from a
 * wallet signature and stored a fingerprint under an unversioned key; when the
 * root became a passphrase, that stale value made every correct passphrase look
 * wrong. A scheme tag means the next change cannot repeat that.
 */
function fingerprintKey(contractAddress: string): string {
  return `polisZK/fingerprint/pbkdf2-v1/${contractAddress.toLowerCase()}`;
}

/**
 * Records the key that actually filed a period.
 *
 * Written only AFTER a successful submission, which is the whole correction
 * here. Storing it at derivation time meant that merely *trying* a passphrase
 * bound the browser to it — so changing your mind before anything was on chain
 * was reported as a mismatch, even though there was nothing to be inconsistent
 * with. A passphrase only becomes binding once a commitment depends on it.
 */
async function rememberKey(
  contractAddress: string,
  employerKey: Uint8Array
): Promise<void> {
  try {
    localStorage.setItem(
      fingerprintKey(contractAddress),
      await keyFingerprint(employerKey)
    );
    // The unversioned key from the signature-derived build is meaningless now.
    localStorage.removeItem(`polisZK/fingerprint/${contractAddress.toLowerCase()}`);
  } catch {
    // A browser refusing localStorage is not a reason to fail a filed payroll:
    // the authoritative check reads the sealed openings off chain anyway.
  }
}

/**
 * One sealed opening already on chain, or null if the contract has none.
 *
 * Any single blob is enough — they all descend from the same key — so this
 * stops at the first one rather than reading the whole history.
 */
async function anySealedOpening(
  networkId: string,
  contractAddress: string
): Promise<Uint8Array | null> {
  const state = await fetchContractState(networkId, contractAddress);
  if (!state) return null;

  const { ledger } = await import("../generated/payroll/index.js");
  const readable = (ledger as any)(state.data);

  for (const period of readable.periods as Iterable<bigint>) {
    if (!readable.sealedFor.member(period)) continue;
    for (const [, blob] of readable.sealedFor.lookup(period) as Iterable<
      [bigint, Uint8Array]
    >) {
      // All-zero would mean a slot written before sealing existed.
      if (blob.some((byte: number) => byte !== 0)) return blob;
    }
  }
  return null;
}

/**
 * Wraps the proof provider so a rejection says what was rejected.
 *
 * `httpClientProofProvider` reports only `code="400"` and discards the response
 * body, which is where the proof server explains itself — leaving a failure
 * that names neither the circuit nor the reason. This re-requests the same
 * endpoint on failure purely to read the body, and puts the circuit id in the
 * message.
 */
function loggingProofProvider(inner: any): any {
  return {
    ...inner,
    proveTx: async (tx: any, options?: any) => {
      try {
        return await inner.proveTx(tx, options);
      } catch (cause) {
        // The circuit id is not where it was guessed to be; log the whole
        // options shape so the next failure names it without another round.
        console.error("[proof] proveTx failed. options keys:", Object.keys(options ?? {}));
        console.error("[proof] options:", options);
        console.error("[proof] cause:", cause);
        const circuit =
          options?.circuitId ?? options?.zkConfig?.circuitId ?? "see [proof] options above";
        throw new Error(
          `Proving failed for circuit "${circuit}": ` +
            (cause instanceof Error ? cause.message : String(cause))
        );
      }
    },
  };
}

/**
 * Builds providers and binds to a deployed contract.
 *
 * Shared by filing, funding, and paying: all three need the same proof server,
 * indexer, and wallet adapters, and having one copy is what stops them drifting
 * into three subtly different provider stacks.
 */
export type ProvingMode = "local" | "wallet";

/**
 * Whether this wallet can generate proofs itself.
 *
 * Coverage varies and the connector does not guarantee it: 1AM implements
 * `getProvingProvider` and proves in-tab with a WASM prover, Lace does not and
 * requires a local proof server. Feature-detect rather than assume, or a Lace
 * user gets a crash where they should get the local path.
 */
export function walletCanProve(api: ConnectedAPI): boolean {
  return typeof (api as any)?.getProvingProvider === "function";
}

export async function connectContract(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  contractName?: string;
  /**
   * Where proofs are generated.
   *
   * `local` posts to the proof server this machine runs. `wallet` hands the job
   * to the wallet via `getProvingProvider` — the direction the SDK is moving,
   * since `Configuration.proverServerUri` is deprecated in its favour.
   *
   * ⚠️ Proving consumes the witness, and the witness here is the salaries. With
   * `local` they reach a server on this machine and nowhere else. With `wallet`
   * they reach the wallet, and where the wallet proves is its choice, not ours
   * — possibly in-process, possibly a remote service. That is a privacy
   * decision, not a performance one, and it cannot be made from this side.
   */
  provingMode?: ProvingMode;
  onProgress?: SubmitProgress;
}): Promise<{
  deployed: any;
  contractModule: any;
  providers: any;
  compiledContract: any;
}> {
  const {
    api,
    networkId,
    contractAddress,
    contractName = "payroll",
    provingMode = "local",
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  // Endpoints and network id come from the wallet, so the transaction is built
  // for the network the user actually has selected in it. Reading them from a
  // local table instead is how a page ends up proving against one network while
  // the wallet signs for another.
  const config = await api.getConfiguration();
  setNetworkId(config.networkId);

  const indexer = config.indexerUri ?? INDEXERS[networkId];
  const indexerWs = config.indexerWsUri ?? INDEXER_WS[networkId];
  const proofServer = PROOF_SERVERS[networkId];
  if (!indexer || !indexerWs) throw new Error(`No indexer configured for "${networkId}"`);
  if (!proofServer) throw new Error(`No proof server configured for "${networkId}"`);

  onProgress("Loading the compiled contract…");
  const contractModule = await import("../generated/payroll/index.js");
  const compiledContract = pipe(
    CompiledContract.make(contractName, (contractModule as any).Contract),
    CompiledContract.withVacantWitnesses
  );

  const zkConfigProvider = new FetchZkConfigProvider(
    zkBaseUrl(contractName),
    fetch.bind(window)
  );
  const shielded = await api.getShieldedAddresses();

  const walletProvider = {
    balanceTx: async (tx: any) => {
      onProgress("Waiting for your wallet to balance and sign…");
      const { tx: balanced } = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(balanced)
      ) as any;
    },
    // Passed through exactly as the connector returns them — Bech32m. An
    // earlier version converted these to hex, on the reasoning that the ledger
    // works in hex; the documented browser-provider pattern does not convert,
    // and converting is a divergence with nothing behind it.
    getCoinPublicKey: () => shielded.shieldedCoinPublicKey as any,
    getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey as any,
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      onProgress("Submitting to the network…");
      await api.submitTransaction(toHex(tx.serialize()));
      const identifiers: string[] = tx.identifiers?.() ?? [];
      if (identifiers.length === 0) {
        throw new Error(
          "The transaction was submitted but reported no identifier, so its " +
            "confirmation cannot be followed. Check the contract state directly."
        );
      }
      return identifiers[0] as any;
    },
  };

  const providers: any = {
    privateStateProvider: emptyPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(indexer, indexerWs),
    zkConfigProvider,
    proofProvider: loggingProofProvider(
      provingMode === "wallet" && walletCanProve(api)
        ? // The wallet proves. `getProvingProvider` returns the ledger-level
          // interface ({check, prove}); `createProofProvider` adapts it to the
          // {proveTx} shape midnight-js expects.
          createProofProvider(
            await api.getProvingProvider(zkConfigProvider.asKeyMaterialProvider())
          )
        : httpClientProofProvider(proofServer, zkConfigProvider as any)
    ),
    walletProvider,
    midnightProvider,
  };

  onProgress("Connecting to the contract…");
  const deployed: any = await findDeployedContract(providers, {
    compiledContract: compiledContract as any,
    contractAddress,
  });

  // `providers` and `compiledContract` come back too: paying needs
  // `submitCallTx`, because the `callTx` shorthand cannot carry the
  // encryption-key mapping a shielded payment requires.
  return { deployed, contractModule, providers, compiledContract };
}

/**
 * Whether this contract already holds sealed openings.
 *
 * Drives whether the UI asks for the passphrase twice: a retype is only worth
 * asking for while there is nothing on chain able to check the answer.
 */
export async function hasBeenFiled(
  networkId: string,
  contractAddress: string
): Promise<boolean> {
  return (await anySealedOpening(networkId, contractAddress)) !== null;
}

/**
 * Builds and submits one `setPayroll` call.
 *
 * Salaries never leave this function as plaintext: they enter the circuit as
 * arguments and are sealed under the employer's key before anything is sent.
 */
export async function submitPayroll(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  contractName?: string;
  provingMode?: ProvingMode;
  passphrase: string;
  period: number;
  salaries: bigint[];
  /**
   * Each employee's coin public key, hex, in roster order. These used to be
   * derived from the employer's own passphrase, which meant the employer held
   * every employee's spending key — the salaries were paid to the employer
   * wearing ten hats. Real keys come from the roster, so the money lands
   * somewhere only the employee can spend from.
   */
  payees: string[];
  onProgress?: SubmitProgress;
}): Promise<SubmitResult> {
  const {
    api,
    networkId,
    contractAddress,
    contractName = "payroll",
    provingMode = "local",
    passphrase,
    period,
    salaries,
    payees: payeeKeys,
  } = options;

  if (payeeKeys.length !== salaries.length) {
    throw new Error(
      `${salaries.length} salaries but ${payeeKeys.length} payee keys — the roster is inconsistent`
    );
  }
  const onProgress = options.onProgress ?? (() => {});

  const indexer = INDEXERS[networkId];
  const indexerWs = INDEXER_WS[networkId];
  const proofServer = PROOF_SERVERS[networkId];
  if (!indexer || !indexerWs) throw new Error(`No indexer configured for "${networkId}"`);
  if (!proofServer) throw new Error(`No proof server configured for "${networkId}"`);

  setNetworkId(networkId);

  const employerKey = await deriveKeyAndVerify(
    passphrase,
    contractAddress,
    networkId,
    onProgress
  );

  onProgress("Deriving nonces and sealing openings…");
  const nonces: Uint8Array[] = [];
  const sealedOpenings: Uint8Array[] = [];
  for (let index = 0; index < salaries.length; index += 1) {
    const nonce = await deriveNonce(employerKey, period, index);
    nonces.push(nonce);
    sealedOpenings.push(await sealOpening(employerKey, salaries[index]!, nonce));
  }

  // One provider stack, built in one place. This used to be a second copy of
  // connectContract's body, and it drifted: a fix applied to one was missing
  // from the other more than once.
  const { deployed, contractModule } = await connectContract({
    api,
    networkId,
    contractAddress,
    contractName,
    provingMode,
    onProgress,
  });

  // Who each slot is payable to, as the hash the circuit will check against.
  // Computed with the contract's own pure circuit rather than reimplementing
  // the struct encoding here, for the same reason commitments are.
  const payees: Uint8Array[] = payeeKeys.map((key) =>
    (contractModule as any).pureCircuits.payeeHash({ bytes: fromHex(key) })
  );

  onProgress("Proving the circuit — this takes a few minutes…");
  // BigInt, not the plain number: `period` is a Uint<32> in the circuit and the
  // generated binding types it as bigint. A JS number is rejected at the
  // runtime type check rather than coerced.
  const tx = await deployed.callTx.setPayroll(
    BigInt(period),
    salaries,
    nonces,
    sealedOpenings,
    payees
  );

  // Only now is the passphrase binding: a commitment on chain depends on it.
  await rememberKey(contractAddress, employerKey);

  return {
    txHash: tx.public?.txHash ?? "",
    blockHeight: tx.public?.blockHeight ?? null,
    period,
    totalMinor: salaries.reduce((sum, salary) => sum + salary, 0n),
  };
}
