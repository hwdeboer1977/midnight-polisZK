// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import chalk from "chalk";
import {
  createUnprovenCallTx,
  deployContract,
  getPublicStates,
  submitTx,
} from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
// Straight from `ledger-v8`, not from `midnight-js-protocol/ledger` as
// midnight-js itself imports them. That module is one line — `export * from
// '@midnight-ntwrk/ledger-v8'` — so these are the identical objects backed by
// the identical WASM instance (checked: `a.Intent === b.Intent`), and the
// subpath export does not resolve under this project's moduleResolution.
// Two copies of the ledger WASM would fail here the way two copies of the
// runtime fail in the browser, so the identity matters more than the path.
import {
  ContractCallPrototype,
  ContractState,
  Intent,
  Transaction,
  communicationCommitmentRandomness,
  nativeToken,
} from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { loadCompiledContract, managedPath } from "./utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

/**
 * Does ONE Midnight transaction carry calls to TWO contracts, and do both apply?
 *
 * The whole withholding strategy turns on this. If a single transaction can
 * deposit net into the payroll contract and the two withheld amounts into the
 * national contracts, the three cannot disagree — there is no reconciliation
 * problem to design around. If it cannot, they are independent transactions, an
 * employer can prove correct withholding and underfund the treasury, and the
 * design needs receipt-then-release or escrow-and-pull to close that gap.
 *
 * `incomelayerzk-constraints` already records, from reading the ledger API, that
 * `Intent.addCall` is repeatable. That is not the same claim. An API accepting a
 * second call says nothing about whether the node accepts the transaction it
 * produces, and a strategy cannot rest on a type signature.
 *
 * ── What this deliberately does not test ───────────────────────────────────
 *
 * Coins. `atomic.compact` holds none, so a two-call transaction differs from a
 * one-call transaction in exactly one respect: the number of calls. Adding a
 * shielded transfer would drag in Zswap offer merging across the two calls,
 * which is its own failure surface, and a failure there would answer nothing.
 * If this passes, coins are the next probe, not this one.
 *
 * Atomicity under failure is also not tested here. A Compact `assert` fails
 * during local execution, so a transaction with a doomed call cannot be built
 * in the first place — forcing a call to fail at VALIDATION rather than at
 * proving needs stale state, deliberately raced. This answers the prior
 * question: can two calls ride together at all.
 *
 * ── How to read the result ─────────────────────────────────────────────────
 *
 * Two fresh instances, each bumped once in the same transaction, with different
 * tags. Success is both instances at `count = 1`, one tagged 1 and the other 2.
 * The tags matter: a bare counter could not distinguish "both calls ran" from
 * "the same call was applied twice", and the second would be a much stranger
 * result to misread as success.
 */

const CONTRACT = "atomic";

function say(line: string): void {
  console.log(chalk.gray(`   ${line}`));
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold("Atomic multi-call probe"));
  console.log(chalk.gray("Can one transaction call two contracts?"));
  console.log();

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  const secret = EnvironmentManager.getWalletSecret();
  setNetworkId(network.networkId);
  say(`network ${network.name} (${network.networkId})`);
  managedPath(CONTRACT); // fails loudly here if the contract was never compiled

  const wallet = await buildWallet(secret, network);
  try {
    say(wallet.resumed ? "syncing (from cache)…" : "syncing…");
    const state = await waitForSync(wallet, say);
    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());
    say(`balance ${night} tNIGHT, ${dust} tDUST`);
    if (dust === 0n) throw new Error("no tDUST — cannot pay fees");

    const { compiledContract } = await loadCompiledContract(CONTRACT);
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: CONTRACT,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: "atomic-probe-state",
    });

    // ── two instances ──────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("1. Deploying two instances"));
    const addresses: string[] = [];
    for (const label of ["A", "B"]) {
      const deployed: any = await deployContract(providers as any, {
        compiledContract: compiledContract as any,
      } as any);
      const address = deployed.deployTxData.public.contractAddress;
      addresses.push(address);
      say(`${label}  ${address}`);
    }
    const [addrA, addrB] = addresses;

    // ── build one transaction carrying both calls ──────────────────────────
    console.log();
    console.log(chalk.cyan("2. Building ONE transaction with TWO calls"));

    // Each call is run locally first, exactly as a normal single-call
    // submission would. What is thrown away is the single-call transaction
    // each run assembles; what is kept is the transcript, which is the part a
    // `ContractCallPrototype` is made of.
    const prepared = [];
    for (const [i, address] of [addrA, addrB].entries()) {
      const tag = BigInt(i + 1);
      const call: any = await createUnprovenCallTx(providers as any, {
        compiledContract: compiledContract as any,
        contractAddress: address,
        circuitId: "bump",
        args: [tag],
      } as any);

      // The operation is read from the state as it stands BEFORE the call — the
      // same source `createUnprovenLedgerCallTx` uses, fetched the same way.
      const { contractState } = await getPublicStates(
        (providers as any).publicDataProvider,
        address
      );
      const op = (ContractState as any)
        .deserialize((contractState as any).serialize())
        .operation("bump");
      if (!op) throw new Error(`no 'bump' operation on ${address}`);

      prepared.push({ address, tag, op, call });
      say(`prepared call ${i + 1} → ${address.slice(0, 12)}… tag ${tag}`);
    }

    // One intent, two calls. This is the line the whole probe exists for.
    let intent: any = (Intent as any).new(new Date(Date.now() + 60 * 60 * 1000));
    for (const { address, op, call } of prepared) {
      const [guaranteed, fallible] = call.public.partitionedTranscript;
      intent = intent.addCall(
        new (ContractCallPrototype as any)(
          address,
          "bump",
          op,
          guaranteed,
          fallible,
          call.private.privateTranscriptOutputs,
          call.private.input,
          call.private.output,
          (communicationCommitmentRandomness as any)(),
          "bump"
        )
      );
    }

    // No Zswap offers: this contract moves no coins, which is the point.
    const unprovenTx = (Transaction as any).fromPartsRandomized(
      getNetworkId(),
      undefined,
      undefined,
      intent
    );
    say(`built: ${String(unprovenTx).slice(0, 90)}…`);

    // ── submit ─────────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("3. Proving and submitting"));
    const result: any = await submitTx(providers as any, { unprovenTx } as any);
    say(`tx ${result?.public?.txHash ?? "(no hash)"}`);
    say(`block ${result?.public?.blockHeight ?? "?"}`);

    // ── read both back ─────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("4. Reading both contracts back"));
    const contractModule: any = (await loadCompiledContract(CONTRACT)).contractModule;
    const seen: { address: string; count: bigint; tag: bigint }[] = [];
    for (const { address } of prepared) {
      const onChain = await (providers as any).publicDataProvider.queryContractState(address);
      const ledger = contractModule.ledger(onChain.data);
      seen.push({ address, count: ledger.count, tag: ledger.lastTag });
      say(`${address.slice(0, 12)}…  count=${ledger.count}  lastTag=${ledger.lastTag}`);
    }

    console.log();
    const bothBumped = seen.every((s) => s.count === 1n);
    const tagsDistinct = seen[0].tag === 1n && seen[1].tag === 2n;
    if (bothBumped && tagsDistinct) {
      console.log(chalk.green.bold("✅ ATOMIC MULTI-CALL WORKS"));
      console.log(
        chalk.gray(
          "   Both contracts advanced from one transaction, each with its own tag.\n" +
            "   Next probe: whether it still holds when the calls move coins."
        )
      );
    } else {
      console.log(chalk.red.bold("❌ NOT what a working multi-call looks like"));
      console.log(
        chalk.gray(
          `   counts ${seen.map((s) => s.count).join(", ")} · ` +
            `tags ${seen.map((s) => s.tag).join(", ")}\n` +
            "   Expected count=1 and tags 1, 2. The transaction was accepted, so\n" +
            "   this is a semantics result, not a rejection — read it carefully."
        )
      );
    }
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
    console.error(chalk.gray(error.stack.split("\n").slice(1, 6).join("\n")));
  }
  console.error();
  console.error(
    chalk.gray(
      "A failure HERE is also an answer: if the node refuses a two-call\n" +
        "transaction, the bundling strategy is unavailable and the design needs\n" +
        "receipt-then-release or escrow-and-pull instead."
    )
  );
  process.exit(1);
});
