/**
 * Can this process prove without a proof server?
 *
 * The question decides how a hosted deployment is shaped. Today every proving
 * path on the Node side goes through `httpClientProofProvider` at
 * PROOF_SERVER_URL, which means a separate Rust service — 4 GB of RAM minimum
 * per its own configuration docs, and a second thing to deploy and watch.
 *
 * Two packages already in node_modules suggest that is avoidable:
 *
 *   @midnight-ntwrk/zkir-v2                 provingProvider(kmProvider)
 *   @midnight-ntwrk/wallet-sdk-prover-client makeDefaultKeyMaterialProvider()
 *
 * The second is the interesting one. A KeyMaterialProvider has to answer two
 * questions — `lookupKey(location)` for a circuit's prover/verifier/IR, and
 * `getParams(k)` for the public parameters — and the built-in zswap and dust
 * keys are NOT in contracts/managed. They ship with the proof server, which is
 * exactly what we are trying not to run. The SDK's default provider fetches
 * both from S3 with caching and retry, which is the missing half.
 *
 * So this probe checks, in order, the things that have to be true:
 *
 *   1. the public parameters are reachable and fetchable
 *   2. the built-in zswap/dust key material is reachable
 *   3. a real contract circuit's key material can be read from contracts/managed
 *   4. the WASM prover loads in Node and accepts a provider
 *
 * What it does NOT do is generate a proof. That needs a real unproven
 * transaction, which needs a funded wallet, and is the next step rather than
 * this one. Everything above failing is decisive; everything above passing is
 * necessary and not sufficient — say so rather than declaring victory.
 *
 *   node probe/wasm-prover.mjs
 */
import fs from "fs";
import path from "path";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${detail ? `  ${detail}` : ""}`);
};

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

console.log("\nin-process WASM proving\n");

// ── 1. The packages load at all ─────────────────────────────────────────────
let zkir;
let makeDefaultKeyMaterialProvider;
try {
  zkir = await import("@midnight-ntwrk/zkir-v2");
  check("zkir-v2 imports", typeof zkir.provingProvider === "function");
} catch (cause) {
  check("zkir-v2 imports", false, String(cause?.message ?? cause));
}
try {
  // Via the "./effect" subpath. The package's export map exposes only "." and
  // "./effect", so reaching into dist/ directly is refused by Node's resolver —
  // worth noting, because it means a deployment depends on WasmProver staying
  // re-exported from that barrel rather than on a file path.
  const effect = await import("@midnight-ntwrk/wallet-sdk-prover-client/effect");
  ({ makeDefaultKeyMaterialProvider } = effect.WasmProver);
  check("wallet-sdk WasmProver imports", typeof makeDefaultKeyMaterialProvider === "function");
} catch (cause) {
  check("wallet-sdk WasmProver imports", false, String(cause?.message ?? cause));
}

if (failures > 0) {
  console.log("\nCannot continue — the prover packages did not load.\n");
  process.exit(1);
}

const base = makeDefaultKeyMaterialProvider();

// ── 2. Public parameters ────────────────────────────────────────────────────
//
// k=10..15 is what the proof server pre-fetches on startup. Only the smallest
// is fetched here: it answers "is S3 reachable and is the URL still right",
// and pulling all six would move megabytes to learn nothing more.
let params;
try {
  const started = Date.now();
  params = await base.getParams(10);
  check(
    "getParams(10) fetches",
    params instanceof Uint8Array && params.length > 0,
    `${mb(params.length)} in ${Date.now() - started}ms`
  );
} catch (cause) {
  check("getParams(10) fetches", false, String(cause?.message ?? cause));
}

// Cached rather than refetched — this runs per proof, so a provider that went
// to the network every time would be a per-proof network round trip.
try {
  const started = Date.now();
  await base.getParams(10);
  const elapsed = Date.now() - started;
  check("getParams is cached", elapsed < 50, `${elapsed}ms on second call`);
} catch (cause) {
  check("getParams is cached", false, String(cause?.message ?? cause));
}

// ── 3. The built-in keys, which contracts/managed does not contain ──────────
for (const location of [
  "midnight/zswap/spend",
  "midnight/zswap/output",
  "midnight/zswap/sign",
  "midnight/dust/spend",
]) {
  try {
    const material = await base.lookupKey(location);
    check(
      `lookupKey ${location}`,
      !!material?.proverKey?.length && !!material?.verifierKey?.length && !!material?.ir?.length,
      material ? `prover ${mb(material.proverKey.length)}` : "not found"
    );
  } catch (cause) {
    check(`lookupKey ${location}`, false, String(cause?.message ?? cause));
  }
}

// ── 4. A real contract circuit, from disk ───────────────────────────────────
//
// The default provider returns undefined for anything that is not a built-in,
// so this is the half a deployment has to supply itself. Reading it here proves
// the files are where a merged provider would look.
const managed = path.join(process.cwd(), "contracts", "managed");
const contracts = fs.existsSync(managed)
  ? fs.readdirSync(managed).filter((name) => fs.existsSync(path.join(managed, name, "keys")))
  : [];
check("contracts/managed present", contracts.length > 0, contracts.join(", ") || "none");

/** Reads one circuit's material the way a merged provider would. */
function fromDisk(contract, circuit) {
  const dir = path.join(managed, contract);
  return {
    proverKey: new Uint8Array(fs.readFileSync(path.join(dir, "keys", `${circuit}.prover`))),
    verifierKey: new Uint8Array(fs.readFileSync(path.join(dir, "keys", `${circuit}.verifier`))),
    ir: new Uint8Array(fs.readFileSync(path.join(dir, "zkir", `${circuit}.bzkir`))),
  };
}

let sample = null;
if (contracts.length > 0) {
  const contract = contracts.includes("fund") ? "fund" : contracts[0];
  const circuits = fs
    .readdirSync(path.join(managed, contract, "keys"))
    .filter((f) => f.endsWith(".prover"))
    .map((f) => f.replace(/\.prover$/, ""));
  const circuit = circuits.includes("claim") ? "claim" : circuits[0];
  try {
    const material = fromDisk(contract, circuit);
    sample = { contract, circuit, material };
    check(
      `contract circuit ${contract}/${circuit}`,
      material.proverKey.length > 0 && material.ir.length > 0,
      `prover ${mb(material.proverKey.length)}, ir ${mb(material.ir.length)}`
    );
  } catch (cause) {
    check(`contract circuit ${contract}`, false, String(cause?.message ?? cause));
  }
}

// ── 5. A merged provider, and the WASM prover on top of it ──────────────────
//
// This is the shape a deployment would use: disk first for the contract's own
// circuits, S3 for everything built in.
const merged = {
  async lookupKey(location) {
    if (sample && location === sample.circuit) return sample.material;
    return base.lookupKey(location);
  },
  getParams: (k) => base.getParams(k),
};

try {
  const provider = zkir.provingProvider(merged);
  check(
    "provingProvider constructs",
    typeof provider?.prove === "function" && typeof provider?.check === "function"
  );
} catch (cause) {
  check("provingProvider constructs", false, String(cause?.message ?? cause));
}

console.log(
  failures === 0
    ? "\nAll preconditions hold. A proof has NOT been generated — that needs a real\n" +
        "unproven transaction, and is the next probe.\n"
    : `\n${failures} check(s) FAILED — see above.\n`
);
process.exit(failures === 0 ? 0 : 1);
