// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import crypto from "crypto";
import chalk from "chalk";
import { createUnprovenCallTx, deployContract, getPublicStates, submitTx } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { ContractCallPrototype, ContractState, Intent, Transaction, communicationCommitmentRandomness } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { contractLeaves, loadCompiledContract } from "./utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

/**
 * Can one contract hand a shielded coin to another, claimed in the same
 * transaction?
 *
 * If yes, the payroll contract keeps everything that makes it strong — money and
 * proof together, `fundWithholding` still asserting the coin equals the assessed
 * tax, underpayment still unbuildable — and the treasury stops being a keypair
 * whose seed sits in `.env`. That is a strictly smaller change than splitting
 * into three contracts, and it gives up nothing.
 *
 * `incomelayerzk-constraints` recorded this as stranded, for a reason that has
 * since expired: the receiver must claim in the same transaction, and
 * `Transaction.merge` supposedly threw when both sides had contract
 * interactions. Merge works now (`13d1f74f…`) and two contracts in one
 * transaction is proven (`d6531c86…`), so the receiver CAN be there.
 *
 * ── How the receiver learns which coin to claim ────────────────────────────
 *
 * A wallet scans for its coins; a contract cannot. `sendShielded` derives the
 * output coin's nonce rather than taking one, so R has to be told it — and told
 * it before the transaction is submitted, which is before S's call has landed.
 *
 * The way through: `createUnprovenCallTx` RUNS the circuit locally to build the
 * proof, and returns the resulting contract state. `relaypair.compact` publishes
 * `lastSentNonce` / `lastSentColor` from `SendResult.sent` precisely so that
 * state carries the answer. Read it off S's next-state, hand it to R, bundle
 * both calls.
 *
 * ── Simplification worth naming ────────────────────────────────────────────
 *
 * S is funded with exactly ONE coin, so locating it is unambiguous and the
 * receipt-ordinal trap from `incomelayerzk-constraints` cannot bite: that only
 * misfires when a single transaction creates more than one coin. A real payroll
 * pool holds several and needs commitment rebuilding to pick the right leaf.
 * That is a solved problem elsewhere in this repo and not what is under test.
 */

const CONTRACT = "relaypair";
const AMOUNT = 1_000_000n; // €1.00 at pEUR's six decimals

function say(line: string): void {
  console.log(chalk.gray(`   ${line}`));
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/** Builds one call and its prototype, ready to join an intent. */
async function prototypeFor(
  providers: any,
  compiledContract: any,
  contractAddress: string,
  circuitId: string,
  args: any[]
): Promise<{ proto: any; call: any }> {
  const call: any = await createUnprovenCallTx(providers, {
    compiledContract,
    contractAddress,
    circuitId,
    args,
  } as any);

  const { contractState } = await getPublicStates(providers.publicDataProvider, contractAddress);
  const op = (ContractState as any)
    .deserialize((contractState as any).serialize())
    .operation(circuitId);
  if (!op) throw new Error(`no '${circuitId}' operation on ${contractAddress}`);

  const [guaranteed, fallible] = call.public.partitionedTranscript;
  const proto = new (ContractCallPrototype as any)(
    contractAddress,
    circuitId,
    op,
    guaranteed,
    fallible,
    call.private.privateTranscriptOutputs,
    call.private.input,
    call.private.output,
    (communicationCommitmentRandomness as any)(),
    circuitId
  );
  return { proto, call };
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold("Contract-to-contract remit"));
  console.log(chalk.gray("Can a contract pay a contract, claimed in the same transaction?"));
  console.log();

  const tokenHex = (process.env.peur_token_id ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(tokenHex)) throw new Error("peur_token_id is not set in .env");
  const color = hexToBytes(tokenHex);

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);
  say(`network ${network.name} (${network.networkId})`);

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    say(wallet.resumed ? "syncing (from cache)…" : "syncing…");
    const state = await waitForSync(wallet, say);
    if (state.dust.balance(new Date()) === 0n) throw new Error("no tDUST");
    const peur = (state.shielded.balances as Record<string, bigint>)[tokenHex] ?? 0n;
    say(`balance ${peur} pEUR minor units`);
    if (peur < AMOUNT) throw new Error(`need ${AMOUNT} pEUR minor units, have ${peur}`);

    const { compiledContract, contractModule } = await loadCompiledContract(CONTRACT);
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers: any = MidnightProviders.create({
      contractName: CONTRACT,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: "c2c-probe-state",
    });

    console.log();
    console.log(chalk.cyan("1. Deploying S (payer) and R (payee)"));
    const depS: any = await deployContract(providers, { compiledContract } as any);
    const addrS = depS.deployTxData.public.contractAddress;
    const depR: any = await deployContract(providers, { compiledContract } as any);
    const addrR = depR.deployTxData.public.contractAddress;
    say(`S  ${addrS}`);
    say(`R  ${addrR}`);

    // ── fund S ─────────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("2. Funding S from the wallet"));
    const fundNonce = new Uint8Array(crypto.randomBytes(32));
    await submitTx(providers, {
      unprovenTx: (
        await prototypeFor(providers, compiledContract, addrS, "fund", [
          AMOUNT,
          { nonce: fundNonce, color, value: AMOUNT },
        ])
      ).call.private.unprovenTx,
    } as any);
    // Printed in full: a later step failing leaves S funded, and without the
    // nonce that coin cannot be located again by anything.
    say(`funded €${Number(AMOUNT) / 1e6} — nonce ${toHex(fundNonce)}`);

    // Exactly one coin, so exactly one leaf. See the header on why that is safe
    // here and would not be in payroll.
    const leaves = await contractLeaves(providers.publicDataProvider, addrS);
    say(`S owns leaves [${leaves.join(", ")}]`);
    if (leaves.length !== 1) throw new Error(`expected exactly 1 leaf, got ${leaves.length}`);
    const qualified = { nonce: fundNonce, color, value: AMOUNT, mt_index: BigInt(leaves[0]) };

    // ── build S's send, and read the nonce it produced ─────────────────────
    console.log();
    console.log(chalk.cyan("3. Building S → R, and reading the sent coin's nonce"));
    const sendCall = await prototypeFor(providers, compiledContract, addrS, "remitTo", [
      AMOUNT,
      { bytes: hexToBytes(addrR) },
      qualified,
    ]);

    // The circuit already ran locally to build the proof, so its next state
    // holds what `SendResult.sent` produced — before anything is submitted.
    // `nextContractState` comes from the circuit run, not from the indexer, and
    // is not wrapped the way `queryContractState`'s result is — it has no
    // `.data`. Both shapes are accepted so this reads the same whichever it is.
    const nextRaw: any = sendCall.call.public.nextContractState;
    const nextS = (contractModule as any).ledger(nextRaw?.data ?? nextRaw);
    const sentNonce: Uint8Array = nextS.lastSentNonce;
    const sentColor: Uint8Array = nextS.lastSentColor;
    say(`sent nonce ${toHex(sentNonce)}`);
    say(`sent color ${toHex(sentColor).slice(0, 24)}…`);
    say(
      toHex(sentNonce) === toHex(fundNonce)
        ? "→ same nonce as the funding coin (passed through)"
        : "→ a DERIVED nonce, not the one that came in"
    );

    // ── R claims it, same transaction ──────────────────────────────────────
    console.log();
    console.log(chalk.cyan("4. Bundling S's send and R's claim into one transaction"));
    const takeCall = await prototypeFor(providers, compiledContract, addrR, "take", [
      AMOUNT,
      { nonce: sentNonce, color: sentColor, value: AMOUNT },
    ]);

    let intent: any = (Intent as any).new(new Date(Date.now() + 60 * 60 * 1000));
    intent = intent.addCall(sendCall.proto);
    intent = intent.addCall(takeCall.proto);

    // Both calls move coins, so each carries its own Zswap offers. `merge` is
    // what worked for that in `probe:atomic-coin`; here the offers belong to a
    // single intent, so they are taken from the two source transactions.
    const sTx: any = sendCall.call.private.unprovenTx;
    const rTx: any = takeCall.call.private.unprovenTx;
    let combined: any;
    try {
      combined = sTx.merge(rTx);
      say(`merged: intents [${[...(combined.intents?.keys() ?? [])].join(",")}]`);
    } catch (cause) {
      say(chalk.yellow(`merge refused (${String(cause).slice(0, 60)}), building one intent`));
      combined = (Transaction as any).fromPartsRandomized(
        getNetworkId(), sTx.guaranteedOffer, undefined, intent
      );
    }

    let landed = false;
    try {
      await submitTx(providers, { unprovenTx: combined } as any);
      landed = true;
      say(chalk.green("accepted"));
    } catch (cause) {
      say(chalk.red(`refused: ${String(cause instanceof Error ? cause.message : cause).slice(0, 140)}`));
    }

    // ── read back ──────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("5. Reading both contracts back"));
    const readS = (contractModule as any).ledger(
      (await providers.publicDataProvider.queryContractState(addrS)).data
    );
    const readR = (contractModule as any).ledger(
      (await providers.publicDataProvider.queryContractState(addrR)).data
    );
    say(`S  held=${readS.held}  sent=${readS.sent}`);
    say(`R  received=${readR.received}  takes=${readR.takes}`);

    console.log();
    if (landed && readR.received === AMOUNT && readS.sent === AMOUNT) {
      console.log(chalk.green.bold("✅ CONTRACT-TO-CONTRACT REMIT WORKS"));
      console.log(
        chalk.gray(
          "   The treasuries can be contracts without touching what makes the\n" +
            "   payroll contract strong. Confirm with contractAction on both\n" +
            "   addresses — the transaction hashes should be identical."
        )
      );
    } else {
      console.log(chalk.red.bold("❌ NOT a working contract-to-contract remit"));
      console.log(
        chalk.gray(
          `   landed=${landed}, S.sent=${readS.sent}, R.received=${readR.received}\n` +
            `   Expected both to equal ${AMOUNT}. If S.sent moved and R.received did\n` +
            "   not, the coin is stranded — which is the failure the old note\n" +
            "   recorded, and would mean treasuries must stay wallets."
        )
      );
    }
    console.log();
    say(`S ${addrS}`);
    say(`R ${addrR}`);
    console.log();
  } finally {
    await wallet.facade.stop();
  }
}

main().catch((error) => {
  console.error();
  console.error(chalk.red.bold("❌ Probe failed"));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  if (error instanceof Error && error.stack) {
    console.error(chalk.gray(error.stack.split("\n").slice(1, 8).join("\n")));
  }
  process.exit(1);
});
