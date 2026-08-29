// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { EnvironmentManager } from "./environment.js";
import { getDeployment } from "./deployments.js";
import { buildWallet, currentState, makeWalletProviders, waitForSync } from "./wallet.js";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { contractModulePath, loadCompiledContract } from "./contract.js";
import { confirmDeposit, freshNonce, poolFile, recordPending } from "./fund-pool.js";
import { formatPeur } from "./constructor-args.js";

/**
 * Depositing into the benefit fund, from a wallet the caller names.
 *
 * Extracted from `fund-cli.ts` for the HTTP route, and it gained one thing in
 * the move: the wallet is a parameter.
 *
 * That is the whole point of this module. `fund-cli.ts` deposits through
 * `connect("fund")`, which builds the wallet from `WALLET_MNEMONIC` — the
 * PLATFORM's. So every deposit the fund has ever received came out of the
 * platform's pocket, while the tax and social contributions `remitTax` and
 * `remitSocial` send onward accumulate in the treasury wallets and are spent by
 * nothing. The loop the design describes — contributions fund the benefits —
 * was not closed in code.
 *
 * Passing the secret closes it: the social treasury deposits what it was sent.
 *
 * ⚠️ The caller is handing over a spending key. Only ever read it from the
 * server's own environment — `SOCIAL_TREASURY_SEED` — never from a request.
 */

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      ... on ContractDeploy { state }
      ... on ContractCall { state }
      ... on ContractUpdate { state }
    }
  }
`;

async function readState(indexer: string, address: string): Promise<any | null> {
  const response = await fetch(indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: CONTRACT_STATE_QUERY, variables: { address } }),
  });
  const body: any = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  const encoded = body.data?.contractAction?.state;
  if (!encoded) return null;
  return ContractState.deserialize(Buffer.from(encoded, "hex")).data;
}

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

/**
 * A generated contract module, resolved the way every other server path
 * resolves one.
 *
 * ⚠️ This used to be a static `import * as fundContract from
 * "../../frontend/src/generated/fund/index.js"`, and it made every deposit and
 * every balance read fail with **`expected instance of ChargedState`**.
 *
 * Node resolves a bare specifier from the importing FILE. A module sitting in
 * `frontend/src/generated/` finds `frontend/node_modules/@midnight-ntwrk/
 * compact-runtime`, while this file finds the root one — two installs of the
 * same version, and therefore two separate WASM instances. `ContractState`
 * deserialized by the root runtime is then not an instance of the frontend
 * runtime's `ChargedState`, and `ledger()` rejects it. Identical versions, so
 * nothing in a lockfile hints at it.
 *
 * `contractModulePath` prefers `contracts/managed/<name>/contract/index.js`,
 * which sits at the repo root and so shares this file's runtime. It falls back
 * to the committed copy under `frontend/src/generated` — correct on a managed
 * host, where `frontend/node_modules` does not exist and that copy resolves to
 * the root runtime too. Either way there is one runtime, which is the property
 * that matters.
 *
 * Cached because `import()` of a WASM-backed module is not cheap and both the
 * deposit and the balance read want the same two modules.
 */
const modules = new Map<string, Promise<any>>();
function contractModule(contractName: string): Promise<any> {
  let pending = modules.get(contractName);
  if (!pending) {
    pending = import(contractModulePath(contractName));
    modules.set(contractName, pending);
  }
  return pending;
}

/** The token benefits are paid in, read off the deployed pEUR contract. */
export async function benefitTokenColour(network: {
  networkId: string;
  indexer: string;
}): Promise<Uint8Array> {
  const peur = getDeployment(network.networkId, "peur");
  if (!peur) {
    throw new Error(
      `No pEUR deployed on ${network.networkId} — benefits are paid in pEUR.`
    );
  }
  const state = await readState(network.indexer, peur.contractAddress);
  if (!state) throw new Error("The pEUR contract has no state on chain");
  return (await contractModule("peur")).ledger(state).tokenId as Uint8Array;
}

/**
 * Which environment secret a named wallet resolves to.
 *
 * Resolved from the environment by name, so a request can choose WHICH wallet
 * but can never supply one. Shared with the balance reader so that "the wallet
 * the deposit will spend" and "the wallet whose balance was shown" cannot come
 * apart — two copies of this rule would eventually disagree, and the way they
 * would disagree is by offering a Max drawn from a different wallet than the
 * one that pays.
 */
export function treasurySecret(from: TreasuryName) {
  if (from === "platform") return EnvironmentManager.getWalletSecret();
  const label = from === "social-treasury" ? "SOCIAL" : "TAX";
  const seed = process.env[`${label}_TREASURY_SEED`]?.trim();
  if (!seed) {
    throw new Error(
      `${label}_TREASURY_SEED is not set on this service, so it cannot spend what ` +
        "that treasury was remitted. Set it in the backend's environment."
    );
  }
  return { kind: "seed" as const, value: seed };
}

export type TreasuryName = "social-treasury" | "tax-treasury" | "platform";

export interface DepositResult {
  amountMinor: string;
  txHash: string;
  /** The contract's own ordinal for the coin it just received. */
  ordinal: number;
  /** Which wallet paid, for the operator's record. Never the secret itself. */
  from: "social-treasury" | "tax-treasury" | "platform";
}

export async function depositToFund(options: {
  amountMinor: bigint;
  /**
   * The period these contributions were withheld for, YYYYMM.
   *
   * Recorded on the fund so `contributedFor[period]` can be compared against the
   * payroll contract's `totalSocialFor[period]`. Without it a deposit is an
   * unattributed increase in a pool and "did September's contributions arrive"
   * has no answer on chain.
   */
  period: number;
  /**
   * The payroll contract the money came from, as claimed by the depositor.
   *
   * Gives the comparison above an address to be made against. The fund cannot
   * verify it — a contract cannot read another's ledger — so this states where
   * the money came from rather than proving it.
   */
  source: string;
  /** Which environment secret to sign with. Resolved here, never passed in. */
  from: "social-treasury" | "tax-treasury" | "platform";
  /**
   * Which national contract receives it.
   *
   * `fund` takes contributions and pays unemployment benefit from them;
   * `taxvault` takes wage tax and holds it under a frozen withdrawal authority.
   * One function serves both because their receiving circuits take the SAME
   * four arguments — period, source, amount, coin — which was the point of
   * changing `fundBenefits` to match `deposit` rather than leaving the two
   * sides asymmetric.
   */
  target?: "fund" | "taxvault";
  log?: (line: string) => void;
}): Promise<DepositResult> {
  const { amountMinor, from, period, source } = options;
  const target = options.target ?? "fund";
  // `fundBenefits` on the fund, `deposit` on the vault. Same arguments either
  // way; only the name differs.
  const circuitId = target === "fund" ? "fundBenefits" : "deposit";
  const log = options.log ?? (() => {});

  if (amountMinor <= 0n) throw new Error("amount must be greater than zero");

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, target);
  if (!record) throw new Error(`No fund deployed on ${network.networkId}`);
  const contractAddress = record.contractAddress;

  const secret = treasurySecret(from);

  const colour = await benefitTokenColour(network);
  const colourHex = hex(colour);

  // The RECEIVING contract's module, not always the fund's: `taxvault` has its
  // own ledger shape, and decoding a vault's state with the fund's decoder is
  // the kind of mistake that reads a field that happens to exist.
  const receiving = await contractModule(target);
  const before = await readState(network.indexer, contractAddress);
  if (!before) throw new Error(`The ${target} has no state on chain`);
  const beforeLedger = receiving.ledger(before);

  // Named differently on the two contracts and meaning the same thing:
  // `fund.compact` calls it `benefitToken` because that is what benefits are
  // paid in, `taxvault.compact` simply `token`. Reading only the fund's name
  // made this check silently pass on the vault — the branch that says "this
  // deposit fixes the token permanently" would fire on every vault deposit,
  // including the ones after the first.
  const tokenSet = beforeLedger.benefitTokenSet ?? beforeLedger.tokenSet;
  const tokenHeld = beforeLedger.benefitToken ?? beforeLedger.token;
  if (tokenSet) {
    const fixed = hex(tokenHeld);
    if (fixed !== colourHex) {
      throw new Error(
        `This ${target} holds token ${fixed}, but the pEUR deployed on ` +
          `${network.networkId} is ${colourHex}. Its token was fixed by its ` +
          "first deposit and cannot be changed."
      );
    }
  } else {
    log(`⚠️  This is the first deposit, and it fixes the ${target}'s token permanently.`);
  }

  log(`Depositing €${formatPeur(amountMinor)} from the ${from} wallet…`);
  const wallet = await buildWallet(secret, network);
  let recorded = false;
  try {
    await waitForSync(wallet, (line: string) => log(`   ${line}`));

    // Checked before proving rather than after: an underfunded wallet otherwise
    // fails in the balancer minutes later, with an error about the transaction
    // rather than about the balance.
    const state = await currentState(wallet);
    const balances = (state.shielded as any).balances as Record<string, bigint>;
    const held = balances[colourHex] ?? balances[`0x${colourHex}`] ?? 0n;
    if (held < amountMinor) {
      throw new Error(
        `The ${from} wallet holds €${formatPeur(held)} pEUR, which does not cover ` +
          `€${formatPeur(amountMinor)}. Remit more into it first, or mint.`
      );
    }

    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      // Follows the target: this decides where prover keys are looked up, so a
      // taxvault deposit proved against the fund's key set fails at `check`
      // with "failed to resolve key", naming nothing about the contract.
      contractName: target,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });
    const compiled = await loadCompiledContract(target);
    const deployed: any = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: compiled.compiledContract as any,
    } as any);

    // The nonce is written BEFORE the transaction, deliberately: it is the only
    // record of the coin, and a coin that lands without one is money the fund
    // holds and cannot describe to `claim`.
    const nonce = freshNonce();
    recordPending(network.networkId, contractAddress, { nonce, color: colour, value: amountMinor });
    recorded = true;
    log(`   coin nonce recorded in ${poolFile()} before submitting`);

    log("Proving — a minute or two…");
    const tx: any = await deployed.callTx[circuitId](
      BigInt(period),
      Uint8Array.from(Buffer.from(source.replace(/^0x/, ""), "hex")),
      amountMinor,
      { nonce, color: colour, value: amountMinor }
    );
    const txHash = String(tx.public?.txHash ?? "");

    // The ordinal comes from the chain rather than a count kept here.
    //
    // `poolOrdinal` on the fund is the ordinal of the coin THIS call received,
    // written by `fundBenefits` before the counter moves. The vault keeps no
    // such field, so its receipt order is `coinsReceived - 1` after the call —
    // and either way this is a receipt ordinal, never a position in the Zswap
    // tree; see the warning on `coinsReceived` in taxvault.compact.
    const afterState = await readState(network.indexer, contractAddress);
    const afterLedger = afterState ? receiving.ledger(afterState) : null;
    const ordinal = afterLedger
      ? Number(afterLedger.poolOrdinal ?? BigInt(afterLedger.coinsReceived) - 1n)
      : Number(beforeLedger.coinsReceived);
    confirmDeposit(network.networkId, contractAddress, nonce, { txHash, ordinal });

    log(`Deposited: ${txHash} — pool coin #${ordinal}`);
    return { amountMinor: amountMinor.toString(), txHash, ordinal, from };
  } catch (error) {
    if (recorded) {
      log(
        `A deposit was written to ${poolFile()} as "pending" before this failed. If the ` +
          "transaction landed anyway the entry describes a real coin — do not delete it; " +
          "compare `npm run fund pool` against the contract's coins received."
      );
    }
    throw error;
  } finally {
    await wallet.facade.stop();
  }
}
