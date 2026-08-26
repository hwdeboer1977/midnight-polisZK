import fs from "fs";
import path from "path";
import { createProofProvider, type ProofProvider } from "@midnight-ntwrk/midnight-js-types";

/**
 * Proving inside this process, with no proof server.
 *
 * Every Node path here proved through `httpClientProofProvider` at
 * PROOF_SERVER_URL — a separate Rust service needing 4 GB of RAM by its own
 * configuration docs, plus 2-5 minutes of parameter fetching at startup. That
 * is a second thing to deploy, watch and pay for, and it is the single reason
 * this backend looked too heavy to host.
 *
 * It turns out not to be necessary. `@midnight-ntwrk/zkir-v2` ships the prover
 * as WASM and `provingProvider(kmProvider)` wraps it in the same
 * `ProvingProvider` shape the ledger consumes — the same machinery a wallet
 * uses to prove in-tab. `createProofProvider` then adapts it to the midnight-js
 * `ProofProvider` the rest of the stack expects.
 *
 * ── Where the key material comes from, and why it is already in the repo ────
 *
 * A KeyMaterialProvider answers two questions, and they have different answers:
 *
 *   lookupKey('midnight/zswap/spend')  — built into the protocol, NOT produced
 *     by compiling our contracts, and not in contracts/managed. The wallet SDK
 *     fetches these and the public parameters from S3, cached in memory.
 *
 *   lookupKey('claim')                 — our own circuit, produced by
 *     `compact compile`, which a deployment must not have to run.
 *
 * The second is the interesting one. `contracts/managed/` is gitignored, so a
 * fresh clone has none of it and cannot rebuild it without the Compact
 * compiler. But `frontend/public/zk/` carries byte-identical copies of the same
 * prover keys, verifier keys and ZKIR — committed on purpose, because a Vercel
 * build cannot produce them either — under the same `<contract>/{keys,zkir}/`
 * layout. So the artifacts a server needs already ship with the repository, and
 * looking there is what makes `git clone && npm ci` a sufficient deployment.
 *
 * Local checkouts still prefer `contracts/managed`, which is what a rebuild
 * updates first; the committed copy is the fallback, and `frontend-config.ts`
 * is what keeps the two in step.
 */

/** What `zkir-v2` and the wallet SDK both mean by key material. */
export interface ProvingKeyMaterial {
  proverKey: Uint8Array;
  verifierKey: Uint8Array;
  ir: Uint8Array;
}

export interface KeyMaterialProvider {
  lookupKey(keyLocation: string): Promise<ProvingKeyMaterial | undefined>;
  getParams(k: number): Promise<Uint8Array>;
}

/**
 * Where a circuit's artifacts might be, most authoritative first.
 *
 * Both are checked per lookup rather than one being chosen at startup: a
 * developer who recompiles mid-session should get the new keys without
 * restarting, and a deployment simply never has the first directory.
 */
function candidateRoots(): string[] {
  return [
    path.join(process.cwd(), "contracts", "managed"),
    path.join(process.cwd(), "frontend", "public", "zk"),
  ];
}

/**
 * Finds one circuit's material on disk.
 *
 * A circuit id carries no contract name, so every contract directory is
 * searched. Ambiguity is possible in principle — two contracts with a circuit
 * of the same name — and is resolved by `contractName`, which the caller knows
 * and passes. Without it the first match wins, which is right for the built-in
 * lookups and wrong for nothing we currently have.
 */
function readCircuit(circuitId: string, contractName?: string): ProvingKeyMaterial | undefined {
  // Traversal guard. `circuitId` reaches here from a contract module rather
  // than from a request, but this reads paths off it and the cost of being
  // certain is one regex.
  if (!/^[A-Za-z0-9_-]+$/.test(circuitId)) return undefined;

  for (const root of candidateRoots()) {
    if (!fs.existsSync(root)) continue;
    const contracts = contractName
      ? [contractName]
      : fs.readdirSync(root).filter((name) => !name.startsWith("."));

    for (const contract of contracts) {
      const prover = path.join(root, contract, "keys", `${circuitId}.prover`);
      const verifier = path.join(root, contract, "keys", `${circuitId}.verifier`);
      const ir = path.join(root, contract, "zkir", `${circuitId}.bzkir`);
      if (fs.existsSync(prover) && fs.existsSync(verifier) && fs.existsSync(ir)) {
        return {
          proverKey: new Uint8Array(fs.readFileSync(prover)),
          verifierKey: new Uint8Array(fs.readFileSync(verifier)),
          ir: new Uint8Array(fs.readFileSync(ir)),
        };
      }
    }
  }
  return undefined;
}

/**
 * Disk for our circuits, the SDK's fetcher for everything built in.
 *
 * Ours are checked FIRST. The fallback goes to the network, so asking it about
 * a circuit it will never have means a wasted round trip per proof — and it
 * answers `undefined` for those rather than erroring, which would turn a
 * missing local file into a silent "no such circuit" far from the cause.
 */
export async function makeKeyMaterialProvider(
  contractName?: string
): Promise<KeyMaterialProvider> {
  // Imported through a variable, not a literal.
  //
  // The package exposes only "." and "./effect" in its export map, and this
  // project's `moduleResolution` predates export maps — so TypeScript cannot
  // resolve the subpath even though Node can. Bumping moduleResolution to
  // node16 would fix it and would also change resolution for every other
  // import in the project, which is a larger change than this deserves. A
  // non-literal specifier is opaque to the checker and correct at runtime.
  //
  // The cost is that this one import is untyped; the shape it must satisfy is
  // `KeyMaterialProvider` above, and `makeKeyMaterialProvider` returns that.
  const specifier = "@midnight-ntwrk/wallet-sdk-prover-client/effect";
  const { WasmProver } = (await import(specifier)) as any;
  const builtin: KeyMaterialProvider = WasmProver.makeDefaultKeyMaterialProvider();

  const cache = new Map<string, ProvingKeyMaterial>();

  return {
    async lookupKey(keyLocation: string) {
      const cached = cache.get(keyLocation);
      if (cached) return cached;

      const local = readCircuit(keyLocation, contractName);
      if (local) {
        cache.set(keyLocation, local);
        return local;
      }
      return builtin.lookupKey(keyLocation);
    },
    getParams: (k: number) => builtin.getParams(k),
  };
}

/**
 * A `ProofProvider` that proves here rather than over HTTP.
 *
 * ⚠️ Proving is CPU-bound and holds the keys in memory while it runs — a single
 * circuit's prover key is ~18 MB and the zswap spend key is ~10 MB. Moving it
 * in-process does not make it cheaper, it removes a service. The instance still
 * needs the memory, and a proof still occupies a core for its duration, which
 * is why `jobs.ts` runs one operation at a time.
 */
export async function wasmProofProvider(contractName?: string): Promise<ProofProvider> {
  const zkir = await import("@midnight-ntwrk/zkir-v2");
  const kmProvider = await makeKeyMaterialProvider(contractName);
  return createProofProvider(zkir.provingProvider(kmProvider as any) as any);
}
