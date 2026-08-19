import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction } from "@midnight-ntwrk/ledger-v8";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ZKConfigProvider } from "@midnight-ntwrk/midnight-js-types";
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

/** Where the compiled ZK assets are served from. Written by `frontend:config`. */
const ZK_BASE = "/zk";

/**
 * Fetches prover keys, verifier keys, and ZKIR over HTTP.
 *
 * The Node provider reads these off disk; a browser has no disk, so the same
 * `contracts/managed/<name>/{keys,zkir}` layout is copied into `public/zk` and
 * fetched instead. The prover key for `setPayroll` is roughly 10 MB, so it is
 * requested only when a proof is actually being built — which is exactly why
 * this interface separates the three getters.
 */
class FetchZkConfigProvider extends ZKConfigProvider<string> {
  constructor(private readonly contractName: string) {
    super();
  }

  private async fetchBytes(path: string): Promise<Uint8Array> {
    const url = `${ZK_BASE}/${this.contractName}/${path}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Could not load ${url} (${response.status}). Run \`npm run frontend:config\` ` +
          "to copy the compiled ZK assets into the frontend."
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async getProverKey(circuitId: string) {
    return (await this.fetchBytes(`keys/${circuitId}.prover`)) as never;
  }

  async getVerifierKey(circuitId: string) {
    return (await this.fetchBytes(`keys/${circuitId}.verifier`)) as never;
  }

  async getZKIR(circuitId: string) {
    return (await this.fetchBytes(`zkir/${circuitId}.bzkir`)) as never;
  }
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Private state that is never written.
 *
 * `payroll.compact` declares no witnesses — every input to `setPayroll` is a
 * circuit argument, not a witness — so the contract has no private state to
 * keep. An in-memory stub is the honest implementation: persisting an empty
 * object to IndexedDB would only add a failure mode.
 */
function emptyPrivateStateProvider(): any {
  const store = new Map<string, unknown>();
  return {
    setContractAddress: () => {},
    set: async (id: string, state: unknown) => void store.set(id, state),
    get: async (id: string) => store.get(id) ?? null,
    remove: async (id: string) => void store.delete(id),
    clear: async () => void store.clear(),
    setSigningKey: async () => {},
    getSigningKey: async () => null,
    removeSigningKey: async () => {},
    clearSigningKeys: async () => {},
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
  passphrase: string;
  period: number;
  salaries: bigint[];
  onProgress?: SubmitProgress;
}): Promise<SubmitResult> {
  const {
    api,
    networkId,
    contractAddress,
    contractName = "payroll",
    passphrase,
    period,
    salaries,
  } = options;
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

  onProgress("Loading the compiled contract…");
  const contractModule = await import("../generated/payroll/index.js");
  const compiledContract = pipe(
    CompiledContract.make(contractName, (contractModule as any).Contract),
    CompiledContract.withVacantWitnesses
  );

  const zkConfigProvider = new FetchZkConfigProvider(contractName);

  const shielded = await api.getShieldedAddresses();
  const coinPublicKey = shielded.shieldedCoinPublicKey;
  const encryptionPublicKey = shielded.shieldedEncryptionPublicKey;

  /**
   * The wallet balances and submits; it is the only party holding the keys that
   * can. midnight-js works in ledger objects while the connector speaks
   * serialized hex, so this adapter is purely translation.
   */
  const walletProvider = {
    balanceTx: async (tx: any) => {
      onProgress("Waiting for your wallet to balance and sign…");
      const { tx: balanced } = await api.balanceUnsealedTransaction(
        toHex(tx.serialize())
      );
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(balanced)
      ) as any;
    },
    getCoinPublicKey: () => coinPublicKey as any,
    getEncryptionPublicKey: () => encryptionPublicKey as any,
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      onProgress("Submitting to the network…");
      await api.submitTransaction(toHex(tx.serialize()));

      // What is returned here is not cosmetic: midnight-js immediately calls
      // `watchForTxData(txId)` with it and waits for that id to be indexed. An
      // id the indexer will never see does not fail — it hangs forever, while
      // the transaction itself confirms perfectly well on chain. That is a
      // uniquely unhelpful failure, so take the identifier the ledger reports
      // rather than deriving one.
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
    proofProvider: httpClientProofProvider(proofServer, zkConfigProvider as any),
    walletProvider,
    midnightProvider,
  };

  onProgress("Connecting to the contract…");
  const deployed: any = await findDeployedContract(providers, {
    compiledContract: compiledContract as any,
    contractAddress,
  });

  onProgress("Proving the circuit — this takes a few minutes…");
  // BigInt, not the plain number: `period` is a Uint<32> in the circuit and the
  // generated binding types it as bigint. A JS number is rejected at the
  // runtime type check rather than coerced.
  const tx = await deployed.callTx.setPayroll(
    BigInt(period),
    salaries,
    nonces,
    sealedOpenings
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
