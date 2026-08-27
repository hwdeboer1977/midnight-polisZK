import "dotenv/config";
import fs from "fs";
import path from "path";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { WebSocket } from "ws";
import { listDeployments } from "./utils/deployments.js";
import { managedPath } from "./utils/contract.js";

if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Writes the frontend's view of what is deployed. Reading public contract state
 * needs only the indexer — no wallet, no keys — so this is safe to run in CI or
 * a build step.
 */
const INDEXERS: Record<string, string> = {
  undeployed: "http://127.0.0.1:8088/api/v4/graphql",
  preview: "https://indexer.preview.midnight.network/api/v4/graphql",
  preprod: "https://indexer.preprod.midnight.network/api/v4/graphql",
};

const OUT = path.join(process.cwd(), "frontend", "public", "deployments.json");

/**
 * The browser decodes contract state with the generated contract module, so the
 * module is copied into the frontend rather than imported across package
 * boundaries. Importing it in place would resolve `@midnight-ntwrk/compact-runtime`
 * from the root node_modules, giving the browser a second copy of the runtime
 * WASM — and two copies mean two distinct StateValue classes and decoding fails.
 */
const GENERATED = path.join(process.cwd(), "frontend", "src", "generated");
const PUBLIC = path.join(process.cwd(), "frontend", "public");

/**
 * The roster parser is shared with the browser rather than reimplemented there:
 * two copies of validation logic drift, and a payroll file that parses
 * differently in the UI than in the CLI is the worst kind of bug.
 */
/**
 * Modules the browser and the CLI must agree on byte for byte.
 *
 * The roster parser decides what a salary cell means, and constructor-args
 * decides what a minor unit is. Two copies of either would be free to drift, and
 * the drift would show up as money — a salary parsed at one scale and paid at
 * another — so they are copied rather than reimplemented.
 */
const SHARED = ["roster.ts", "constructor-args.ts", "tax-params.ts", "benefit-params.ts"];

function copySharedSource(): void {
  fs.mkdirSync(GENERATED, { recursive: true });
  for (const file of SHARED) {
    fs.copyFileSync(
      path.join(process.cwd(), "src", "utils", file),
      path.join(GENERATED, file)
    );
  }
  console.log(`copied ${SHARED.join(", ")} -> frontend/src/generated`);
}

function copyContractModule(contractName: string): void {
  const from = path.join(managedPath(contractName), "contract");
  const to = path.join(GENERATED, contractName);
  if (!fs.existsSync(from)) return;

  fs.mkdirSync(to, { recursive: true });
  for (const file of ["index.js", "index.d.ts", "index.js.map"]) {
    const source = path.join(from, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(to, file));
  }
  console.log(`copied ${contractName} contract module -> frontend/src/generated`);
}

/**
 * Copies the compiled ZK assets so the browser can fetch them.
 *
 * Submitting payroll from the page means proving in the browser, and proving
 * needs the prover key and ZKIR that `compact compile` produced. The Node
 * provider reads them off disk; a browser has to be served them, so the same
 * `keys/` and `zkir/` layout is mirrored under `public/zk/<contract>/`.
 *
 * These are large — `setPayroll.prover` is around 10 MB — and they are build
 * artifacts, so `public/zk` is gitignored rather than committed.
 */
function copyZkAssets(contractName: string): void {
  const from = managedPath(contractName);
  const to = path.join(PUBLIC, "zk", contractName);

  let copied = 0;
  for (const kind of ["keys", "zkir"]) {
    const sourceDir = path.join(from, kind);
    if (!fs.existsSync(sourceDir)) continue;
    const targetDir = path.join(to, kind);
    fs.mkdirSync(targetDir, { recursive: true });
    for (const file of fs.readdirSync(sourceDir)) {
      // Only what the prover actually asks for: the verifier keys are already
      // on chain, and shipping them would double the payload for nothing.
      if (!/\.(prover|verifier|bzkir)$/.test(file)) continue;
      fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
      copied += 1;
    }
  }
  if (copied > 0) {
    console.log(`copied ${copied} ${contractName} ZK assets -> frontend/public/zk`);
  }
}

interface Entry {
  contractAddress: string;
  contractName: string;
  networkId: string;
  instance?: string;
  /** pEUR only: the token type its coins carry, so the UI can label balances. */
  tokenId?: string;
  /** Carried through, or a regeneration would silently un-retire them. */
  retired?: boolean;
}

async function peurTokenId(
  networkId: string,
  contractAddress: string
): Promise<string | undefined> {
  const indexer = INDEXERS[networkId];
  if (!indexer) return undefined;

  try {
    setNetworkId(networkId);
    const provider = indexerPublicDataProvider(
      indexer,
      indexer.replace(/^http/, "ws") + "/ws"
    );
    const state = await provider.queryContractState(contractAddress);
    if (!state) return undefined;

    const contractModule = await import(
      path.join(managedPath("peur"), "contract", "index.js")
    );
    const tokenId = contractModule.ledger(state.data).tokenId as Uint8Array;
    const hex = Buffer.from(tokenId).toString("hex");
    // Zero until the first mint records it.
    return /^0+$/.test(hex) ? undefined : hex;
  } catch {
    return undefined;
  }
}

copySharedSource();

const out: Record<string, Entry> = {};

for (const [key, record] of listDeployments()) {
  const entry: Entry = {
    contractAddress: record.contractAddress,
    contractName: record.contractName,
    networkId: record.networkId,
    ...(record.instance ? { instance: record.instance } : {}),
    ...(record.retired ? { retired: true } : {}),
  };

  if (record.contractName === "peur") {
    const tokenId = await peurTokenId(record.networkId, record.contractAddress);
    if (tokenId) entry.tokenId = tokenId;
  }

  copyContractModule(record.contractName);
  copyZkAssets(record.contractName);
  out[key] = entry;
  console.log(`${key}  ${record.contractAddress}${entry.tokenId ? `  token ${entry.tokenId}` : ""}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(out).length} deployment(s) to ${OUT}`);
process.exit(0);
