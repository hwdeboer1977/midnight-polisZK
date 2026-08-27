import { findDeployedContract, submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { MAX_PEUR_AMOUNT, PEUR_SCALE, formatPeur } from "./constructor-args.js";
import { contractModulePath, loadCompiledContract } from "./contract.js";
import { getClaim, saveClaim } from "./claims.js";
import { deploymentKey, getDeployment, listDeployments } from "./deployments.js";
import { EnvironmentManager } from "./environment.js";
import { hex, toPublicKey } from "./keys.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";

/** The starter allowance a registered employer may draw once: 100,000 pEUR. */
export const EMPLOYER_ALLOWANCE = 100_000n * PEUR_SCALE;

export interface FundResult {
  instance: string;
  coinPublicKey: string;
  amount: string;
  txHash: string;
}

export interface MintResult {
  amount: string;
  totalSupply: string;
  txHash: string;
}

type Log = (line: string) => void;

function normalizeHex(input: string, label: string, exactChars?: number): string {
  const value = input.trim().replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(value) || value.length % 2 !== 0) {
    throw new Error(`The ${label} must be hex`);
  }
  if (exactChars && value.length !== exactChars) {
    throw new Error(`A ${label} is ${exactChars} hex characters`);
  }
  return value;
}

function checkAmount(amount: bigint): void {
  if (amount <= 0n) throw new Error("Amount must be greater than zero");
  if (amount > MAX_PEUR_AMOUNT) {
    throw new Error(
      `Amount exceeds the contract's Uint<48> bound (${MAX_PEUR_AMOUNT} minor units)`
    );
  }
}

/**
 * Which payroll instance this key is the assigned employer of, if any.
 *
 * Asked of the contracts rather than of `deployment.json`, which only records
 * that an instance exists. Being listed there is not a claim to anything: the
 * key that may draw an allowance is the one the contract itself names as
 * employer, and that is the only thing worth checking before issuing money.
 *
 * Needs no wallet — reading public state is an indexer query — so it runs before
 * the multi-minute wallet sync and rejects an unregistered key immediately.
 *
 * Every record is tried even when an earlier one cannot be read, and that is the
 * whole design of the loop rather than defensive habit. `deployment.json`
 * accumulates: it holds contracts from every version of `payroll.compact` this
 * project has ever deployed, and an older layout decoded with today's module
 * throws `expected a cell, received map`. Unhandled, the FIRST such record ended
 * the scan — so three contracts from a build nobody uses hid four live ones, and
 * the employer was told the claim failed rather than that their own contract was
 * never looked at.
 *
 * Skipping is also the right answer on the merits, not just the pragmatic one: a
 * contract this build cannot read is not one it could pay against either.
 */
export async function findEmployerInstance(
  coinPublicKey: string,
  log: Log = () => {}
): Promise<string | null> {
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const provider = indexerPublicDataProvider(network.indexer, network.indexerWS);
  // `contractModulePath`, NOT `managedPath` + "contract/index.js". The two
  // resolve differently on a checkout with no `contracts/managed`: the ZK assets
  // fall back to `frontend/public/zk/<n>/{keys,zkir}`, which has no `contract/`
  // in it, while the module falls back to `frontend/src/generated/<n>/index.js`.
  // Joining the first path to the second's filename works on a machine that has
  // compiled the contracts and cannot work anywhere else — so it passed locally
  // and broke the moment this ran on a deploy target, on the one route an
  // employer needs.
  const payroll = await import(contractModulePath("payroll"));

  const unreadable: string[] = [];

  for (const [key, record] of listDeployments()) {
    if (record.networkId !== network.networkId) continue;
    if (record.contractName !== "payroll") continue;
    // Known unreadable, so the catch below would take it anyway — skipping here
    // saves the indexer round trip and keeps it out of the `unreadable` list,
    // which is for records nobody has classified yet.
    if (record.retired) continue;

    try {
      const state = await provider.queryContractState(record.contractAddress);
      if (!state) continue;

      const ledger = payroll.ledger(state.data);
      if (ledger.employerAssigned && hex(ledger.employer.bytes) === coinPublicKey) {
        return record.instance ?? key;
      }
    } catch {
      // The address, not the reason. A decode failure means an older contract
      // layout and an indexer failure means a bad address or a pruned one, and
      // neither is actionable per-record — what the operator needs is the list,
      // so `deployment.json` can be pruned once instead of read as noise here.
      unreadable.push(record.instance ?? key);
    }
  }

  // After the loop, so a skipped record never looks like the reason a claim was
  // refused — by this point the answer is already known to be no.
  if (unreadable.length > 0) {
    log(
      `Skipped ${unreadable.length} payroll contract(s) this build cannot read ` +
        `(older layout, or no longer on the indexer): ${unreadable.join(", ")}`
    );
  }
  return null;
}

/**
 * Opens a session against the deployed pEUR contract as the issuer.
 *
 * Both operations here mint, and minting is issuer-only in the circuit, so a
 * wallet that is not the issuer would spend minutes syncing only to have the
 * proof rejected. The check is made explicit and up front so the failure names
 * the actual problem.
 */
async function connectAsIssuer(log: Log) {
  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const key = deploymentKey(network.networkId, "peur");
  const deployment = getDeployment(network.networkId, "peur");
  if (!deployment) {
    throw new Error(`No pEUR deployment for "${key}" — run: npm run deploy:peur`);
  }

  const runtime = EnvironmentManager.checkRuntimeVersion("peur");
  if (!runtime.ok) {
    throw new Error(
      `contracts/managed was compiled for compact-runtime ${runtime.compiled}, ` +
        `but ${runtime.installed} is installed — run: npm run reset`
    );
  }

  log("Building wallet…");
  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);

  try {
    log(wallet.resumed ? "Syncing (resuming from cache)…" : "Syncing…");
    await waitForSync(wallet, log);

    const { contractModule, compiledContract } = await loadCompiledContract("peur");
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: "peur",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: `${key.replace(/[/:]/g, "-")}-state`,
    });

    const deployed: any = await findDeployedContract(providers as any, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.contractAddress,
    });

    const state = await providers.publicDataProvider.queryContractState(
      deployment.contractAddress
    );
    const ledger = state ? contractModule.ledger(state.data) : null;
    const me = String(wallet.shieldedSecretKeys.coinPublicKey);
    if (ledger && hex(ledger.issuer.bytes) !== me) {
      throw new Error(
        "The platform wallet is not the pEUR issuer on this network — only the " +
          "wallet that deployed pEUR can mint"
      );
    }

    return {
      wallet,
      network,
      providers,
      contractModule,
      compiledContract,
      deployed,
      contractAddress: deployment.contractAddress,
      ledger,
    };
  } catch (cause) {
    await wallet.facade.stop();
    throw cause;
  }
}

/**
 * Issues the starter allowance to a registered employer.
 *
 * `mintTo` names the recipient by coin public key, but that alone does not make
 * the coin usable: a shielded coin can only be found by someone whose encryption
 * key the transaction was built with. Supplying only the first mints a coin that
 * nobody can ever detect or spend, with no error — so both keys are required
 * here, and the mapping is why this uses `submitCallTx` rather than the `callTx`
 * shorthand, which cannot carry it.
 *
 * Naming the wrong recipient cannot steal anything: the coin belongs to whoever
 * holds the secret key behind that coin public key, and a mismatched encryption
 * key only makes it undetectable. The exposure is issuing supply that no one
 * asked for, which is what the once-per-employer record bounds.
 */
export async function fundEmployer(
  coinPublicKey: string,
  encryptionPublicKey: string,
  amount: bigint = EMPLOYER_ALLOWANCE,
  log: Log = () => {}
): Promise<FundResult> {
  const cpk = normalizeHex(coinPublicKey, "coin public key", 64);
  const epk = normalizeHex(encryptionPublicKey, "encryption public key");
  checkAmount(amount);

  const network = EnvironmentManager.getNetworkConfig();

  log("Checking this key owns a payroll contract…");
  const instance = await findEmployerInstance(cpk, log);
  if (!instance) {
    throw new Error(
      `This signing key is not the employer of any payroll contract on ${network.networkId} — register first`
    );
  }
  log(`Registered as "${instance}"`);

  const already = getClaim(network.networkId, cpk);
  if (already) {
    throw new Error(
      `This key already claimed ${formatPeur(BigInt(already.amount))} pEUR on ${already.claimedAt.slice(0, 10)} (tx ${already.txHash.slice(0, 16)}…)`
    );
  }

  const conn = await connectAsIssuer(log);
  try {
    log(`Minting ${formatPeur(amount)} pEUR to ${cpk.slice(0, 16)}…`);
    const tx: any = await submitCallTx(conn.providers as any, {
      compiledContract: conn.compiledContract,
      contractAddress: conn.contractAddress,
      circuitId: "mintTo",
      args: [amount, toPublicKey(cpk)],
      additionalCoinEncPublicKeyMappings: new Map([[cpk, epk]]),
    } as any);

    const txHash = String(tx.public.txHash);
    saveClaim({
      networkId: network.networkId,
      coinPublicKey: cpk,
      instance,
      amount: amount.toString(),
      txHash,
      claimedAt: new Date().toISOString(),
    });

    log(`Sent — tx ${txHash}`);
    return { instance, coinPublicKey: cpk, amount: amount.toString(), txHash };
  } finally {
    await conn.wallet.facade.stop();
  }
}

/**
 * Mints pEUR to whoever asks, in whatever amount they ask for.
 *
 * ⚠️  DEMO ONLY, and the contract agrees: the issuer check is gone from `mintTo`,
 * so this endpoint gives away nothing the chain was protecting. It exists so a
 * demo can self-serve payroll funds without an operator in the loop.
 *
 * Deliberately not `fundEmployer`: that one is the registered employer's
 * once-only starter allowance and its restrictions are the point. Routing an
 * open faucet through it would quietly consume that claim and make the two
 * indistinguishable in the claims record.
 *
 * Both keys are required for the same reason as there — a coin minted against a
 * wrong encryption key is undetectable by its owner and cannot be recovered.
 */
export async function mintToRecipient(
  coinPublicKey: string,
  encryptionPublicKey: string,
  amount: bigint,
  log: Log = () => {}
): Promise<FundResult> {
  const cpk = normalizeHex(coinPublicKey, "coin public key", 64);
  const epk = normalizeHex(encryptionPublicKey, "encryption public key");
  checkAmount(amount);

  const conn = await connectAsIssuer(log);
  try {
    log(`Minting ${formatPeur(amount)} pEUR to ${cpk.slice(0, 16)}…`);
    const tx: any = await submitCallTx(conn.providers as any, {
      compiledContract: conn.compiledContract,
      contractAddress: conn.contractAddress,
      circuitId: "mintTo",
      args: [amount, toPublicKey(cpk)],
      additionalCoinEncPublicKeyMappings: new Map([[cpk, epk]]),
    } as any);

    const txHash = String(tx.public.txHash);
    log(`Sent — tx ${txHash}`);
    // No instance: this is not tied to a payroll contract, which is the whole
    // difference between it and the employer allowance.
    return { instance: "", coinPublicKey: cpk, amount: amount.toString(), txHash };
  } finally {
    await conn.wallet.facade.stop();
  }
}

/**
 * Tops up the issuer's own holding. The recipient is `ownPublicKey()` in the
 * circuit, so no encryption-key mapping is needed and the plain `callTx`
 * shorthand is enough.
 */
export async function mintExtra(
  amount: bigint,
  log: Log = () => {}
): Promise<MintResult> {
  checkAmount(amount);

  const conn = await connectAsIssuer(log);
  try {
    log(`Minting ${formatPeur(amount)} pEUR to the issuer…`);
    const tx: any = await conn.deployed.callTx.mint(amount);

    const state = await conn.providers.publicDataProvider.queryContractState(
      conn.contractAddress
    );
    const ledger = state ? conn.contractModule.ledger(state.data) : null;
    const txHash = String(tx.public.txHash);

    log(`Minted — tx ${txHash}`);
    return {
      amount: amount.toString(),
      totalSupply: String(ledger?.totalSupply ?? 0n),
      txHash,
    };
  } finally {
    await conn.wallet.facade.stop();
  }
}
