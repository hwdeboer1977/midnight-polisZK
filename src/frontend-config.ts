import "dotenv/config";
import fs from "fs";
import path from "path";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { WebSocket } from "ws";
import { EnvironmentManager } from "./utils/environment.js";
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

  // The circuit manifest, published next to the keys it names.
  //
  // `contractVersion()` hashes the verifier keys of the circuits this contract
  // declares, and needs the declaration to know which files those are. It lives
  // under `compiler/` in `contracts/managed` and nowhere else, so a checkout
  // without that directory — a server, a hosted build — could not compute a
  // version at all. Copied to the root of the published tree rather than into a
  // `compiler/` subdirectory, since it is the only file from there anyone needs.
  const info = path.join(from, "compiler", "contract-info.json");
  if (fs.existsSync(info)) {
    fs.mkdirSync(to, { recursive: true });
    fs.copyFileSync(info, path.join(to, "contract-info.json"));
  }

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

    // Copies, never deletes. A renamed circuit therefore leaves its old key
    // behind here, which is untidy and harmless — the browser fetches these by
    // name and never enumerates them.
    //
    // Deleting the surplus was tried and reverted. `contracts/managed` can hold
    // an interrupted compile (fund's had an empty `keys/`), and pruning against
    // one destroyed twelve committed keys whose only remaining copy was the one
    // being pruned. Nothing needs the two trees to match file-for-file:
    // `contractVersion()` hashes the contract module, precisely so this build
    // step never has to delete anything to stay correct.
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

/**
 * The pEUR token id, if a pEUR contract is known and has minted.
 *
 * Carried out of the loop because it is the one field the browser needs that
 * cannot be read from an address: the token type is decided at the first mint
 * and recorded in contract state. Everything else in the frontend's view of a
 * deployment is a string already sitting in `.env`.
 */
let peurToken: string | undefined;

for (const [key, record] of listDeployments()) {
  if (record.contractName === "peur") {
    peurToken = await peurTokenId(record.networkId, record.contractAddress);
  }

  copyContractModule(record.contractName);
  copyZkAssets(record.contractName);
  console.log(`${key}  ${record.contractAddress}`);
}

/**
 * Carries `PAYROLL_CONTRACT` from the root `.env` into Vite's namespace.
 *
 * Vite only exposes variables prefixed `VITE_`, and only from `frontend/`, so
 * the value has to be copied rather than read where it is written. Copying it
 * keeps one source of truth in the root `.env` next to `WALLET_MNEMONIC` and
 * the treasury keys, instead of a second file that drifts.
 *
 * `.env.local` rather than `.env`: Vite ranks it above `.env`, it is
 * conventionally gitignored, and it is generated output — a developer editing
 * it would lose the edit on the next `frontend:config`.
 *
 * On a hosted build the root `.env` does not exist, so nothing is written and
 * the variable has to be set in the host's own environment (Vercel's project
 * settings). Unset in both places, the frontend filters nothing.
 */
/**
 * The treasuries' encryption public keys, carried through to Vite.
 *
 * Published deliberately, and only these two. A shielded coin can only be found
 * by someone whose encryption key the sender built the transaction with, so a
 * browser remitting withholding needs them — `payPayroll.ts` records that this
 * is exactly why remitting used to be CLI-only. They are public keys: they
 * address a coin and cannot spend one, and the seeds they were derived from are
 * not recoverable from them.
 *
 * Read from `*_TREASURY_ENC_KEY` rather than derived here, so a frontend build
 * never needs the seeds. On a host that sets only the seeds this writes nothing
 * and the remit control stays unavailable rather than sending to a key nobody
 * can decrypt with.
 */
const encKeys = {
  tax: (process.env.TAX_TREASURY_ENC_KEY ?? "").trim(),
  social: (process.env.SOCIAL_TREASURY_ENC_KEY ?? "").trim(),
};

/**
 * The deployment baseline, carried from the root `.env` into Vite's namespace.
 *
 * This is what `frontend/public/deployments.json` used to be. That file was a
 * committed address book the browser fetched at run time; it accumulated every
 * contract ever deployed and had to be pruned by hand alongside
 * `deployment.json`. The browser needs four addresses and a token id, all of
 * which are now single lines in the root `.env` — so they are copied here for
 * the same reason the treasury keys are: Vite exposes only `VITE_`-prefixed
 * variables, and only from `frontend/`.
 *
 * The network id is emitted too, because an address means nothing without the
 * chain it is on and the browser has no `MIDNIGHT_NETWORK` to read.
 *
 * Contracts deployed at run time are deliberately absent — no build-time file
 * can hold them. The browser merges `/api/deployments` over this, which is
 * where a freshly onboarded employer's contract has always actually come from.
 */
const networkId = EnvironmentManager.getNetworkConfig().networkId;

const baseline: [string, string | undefined][] = [
  ["VITE_NETWORK_ID", networkId],
  ["VITE_PAYROLL_ADDRESS", process.env.payroll_address],
  ["VITE_PEUR_ADDRESS", process.env.peur_address],
  // Prefers what was just read off the contract, since a token id recorded by
  // hand in `.env` can describe a pEUR contract that has since been redeployed.
  ["VITE_PEUR_TOKEN_ID", peurToken ?? process.env.peur_token_id],
  ["VITE_TAXPARAMS_ADDRESS", process.env.taxparams_address],
  ["VITE_FUND_ADDRESS", process.env.fund_address],
  ["VITE_TAXVAULT_ADDRESS", process.env.taxvault_address],
];

/**
 * An explicit override of which payroll contracts the browser may offer, and
 * only that — written out solely when `PAYROLL_CONTRACT` is set.
 *
 * The default is not written here, because it would be `payroll_address` copied
 * into a second variable holding the identical string. `pinnedContracts()` falls
 * back to `VITE_PAYROLL_ADDRESS` instead, so the common case emits one line and
 * there is no pair of variables to drift apart.
 *
 * Set, it replaces rather than extends: a service running several employer
 * contracts lists all of them, base address included or it disappears too.
 */
const pin = (process.env.PAYROLL_CONTRACT ?? "").trim();
const envLocal = path.join(process.cwd(), "frontend", ".env.local");
const lines: string[] = [];
for (const [name, value] of baseline) {
  const trimmed = (value ?? "").trim();
  if (trimmed) lines.push(`${name}=${trimmed}`);
}
if (pin) lines.push(`VITE_PAYROLL_CONTRACTS=${pin}`);
if (encKeys.tax) lines.push(`VITE_TAX_TREASURY_ENC_KEY=${encKeys.tax}`);
if (encKeys.social) lines.push(`VITE_SOCIAL_TREASURY_ENC_KEY=${encKeys.social}`);

if (lines.length > 0) {
  fs.writeFileSync(
    envLocal,
    `# Generated by \`npm run frontend:config\` from the root .env. Do not edit.\n` +
      lines.join("\n") +
      "\n"
  );
  console.log(`Deployment baseline -> ${lines.length} variable(s)`);
  if (pin) console.log(`Pinned payroll contracts -> ${pin}`);
  if (encKeys.tax && encKeys.social) console.log("Treasury encryption keys -> frontend");
} else if (fs.existsSync(envLocal)) {
  // Removed when everything it carried is cleared, so unsetting a variable
  // actually takes effect rather than leaving a stale file behind.
  fs.unlinkSync(envLocal);
  console.log("Cleared the generated frontend env");
}
process.exit(0);
