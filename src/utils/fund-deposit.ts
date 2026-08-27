import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
// The COMMITTED copies, not `contracts/managed/` — that directory is gitignored
// build output and does not exist on a managed host. See `claim-tree.ts` for the
// same note and the deploy this broke.
import * as fundContract from "../../frontend/src/generated/fund/index.js";
import * as peurContract from "../../frontend/src/generated/peur/index.js";
import { EnvironmentManager } from "./environment.js";
import { getDeployment } from "./deployments.js";
import { buildWallet, currentState, makeWalletProviders, waitForSync } from "./wallet.js";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { loadCompiledContract } from "./contract.js";
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

/** The token benefits are paid in, read off the deployed pEUR contract. */
async function benefitTokenColour(network: {
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
  return (peurContract as any).ledger(state).tokenId as Uint8Array;
}

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
  /** Which environment secret to sign with. Resolved here, never passed in. */
  from: "social-treasury" | "tax-treasury" | "platform";
  log?: (line: string) => void;
}): Promise<DepositResult> {
  const { amountMinor, from } = options;
  const log = options.log ?? (() => {});

  if (amountMinor <= 0n) throw new Error("amount must be greater than zero");

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, "fund");
  if (!record) throw new Error(`No fund deployed on ${network.networkId}`);
  const contractAddress = record.contractAddress;

  // Resolved from the environment by name, so a request can choose WHICH wallet
  // but can never supply one.
  const secret = (() => {
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
  })();

  const colour = await benefitTokenColour(network);
  const colourHex = hex(colour);

  const before = await readState(network.indexer, contractAddress);
  if (!before) throw new Error("The fund has no state on chain");
  const beforeLedger = (fundContract as any).ledger(before);

  if (beforeLedger.benefitTokenSet) {
    const fixed = hex(beforeLedger.benefitToken);
    if (fixed !== colourHex) {
      throw new Error(
        `This fund pays in token ${fixed}, but the pEUR deployed on ` +
          `${network.networkId} is ${colourHex}. The fund's token was fixed by its ` +
          "first deposit and cannot be changed."
      );
    }
  } else {
    log("⚠️  This is the first deposit, and it fixes the fund's token permanently.");
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
      contractName: "fund",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });
    const compiled = await loadCompiledContract("fund");
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
    const tx: any = await deployed.callTx.fundBenefits({
      nonce,
      color: colour,
      value: amountMinor,
    });
    const txHash = String(tx.public?.txHash ?? "");

    // The ordinal comes from the chain rather than a count kept here.
    const after = await readState(network.indexer, contractAddress);
    const ordinal = after
      ? Number((fundContract as any).ledger(after).poolOrdinal)
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
