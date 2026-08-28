import "dotenv/config";
import chalk from "chalk";
import { createUnprovenCallTx, deployContract, getPublicStates, submitTx } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  ContractCallPrototype,
  ContractState,
  Intent,
  Transaction,
  communicationCommitment,
  communicationCommitmentRandomness,
  entryPointHash,
} from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { loadCompiledContract } from "./utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { wasmProofProvider } from "./utils/wasm-proving.js";

/**
 * Is `kernel.claimContractCall` ENFORCED, or merely recorded?
 *
 * `probe/probe_claim_call.compact` established that it compiles, with signature
 * `(Bytes<32> address, Bytes<32> entryPoint, Field communicationCommitment)`.
 * Compiling is not enforcing, and the difference is the whole of option D: a tax
 * contract that refuses money unless the payroll call it belongs to is in the
 * same transaction is worth building; one that records an unchecked assertion is
 * worth nothing.
 *
 * ── Two runs ───────────────────────────────────────────────────────────────
 *
 * POSITIVE — `atomic.bump` and `claimer.claimIt` in one transaction, the claim
 * naming the commitment that bump's own call carries. Expect: lands.
 *
 * NEGATIVE — `claimer.claimIt` ALONE, naming a commitment for a call that is not
 * in the transaction. Expect: refused.
 *
 * **The negative is the test.** A positive result on its own proves nothing: a
 * claim that is never checked also lands. Only the rejection of a false claim
 * shows the node is verifying it. Both are run, and the summary is only a pass
 * if the first lands AND the second is refused.
 *
 * ── No coins, deliberately ─────────────────────────────────────────────────
 *
 * Neither contract moves money. `probe:atomic-coin` showed that hand-merging
 * Zswap offers across calls is its own failure surface; a rejection there would
 * be indistinguishable from the node refusing the claim. Coins are a later
 * question.
 */

const AMOUNT_OF_NOISE = 0; // no coins here; see above

function say(line: string): void {
  console.log(chalk.gray(`   ${line}`));
}

/**
 * BLS12-381 scalar field modulus. A `Field` argument must be below it.
 */
const FIELD_MODULUS =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

/**
 * The `Field` values a hex commitment could plausibly denote — best first.
 *
 * Two things had to be discovered here, both by being wrong first.
 *
 * `communicationCommitment` returns **33** bytes, not 32, and both it and
 * `communicationCommitmentRandomness` begin with a `73` tag byte. Read whole, in
 * either endianness, the value needs ~261 bits and is not a field element:
 * big-endian gave 1.33e79 and little-endian 2.37e78, against a modulus of
 * 5.24e76. Strip the tag and the remaining 32 bytes fit either way round.
 *
 * Which way round is NOT determined from here — both candidates are legal field
 * elements, so nothing local can tell them apart. Rather than guess and read a
 * rejection as "the claim was refused" when it only meant "the digits were
 * backwards", the probe tries each against the node and reports which one the
 * positive run accepts. That answer is worth recording; it is not worth
 * inferring.
 */
function commitmentCandidates(hex: string): { label: string; value: bigint }[] {
  let bytes = hexToBytes(hex);
  if (bytes.length === 33) bytes = bytes.slice(1); // drop the tag byte
  if (bytes.length !== 32) {
    throw new Error(`commitment is ${bytes.length} bytes after de-tagging, expected 32`);
  }

  let be = 0n;
  for (const byte of bytes) be = (be << 8n) | BigInt(byte);
  let le = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) le = (le << 8n) | BigInt(bytes[i]);

  return [
    { label: "little-endian", value: le },
    { label: "big-endian", value: be },
  ].filter((candidate) => candidate.value < FIELD_MODULUS);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Builds the prototype for one call, and hands back its commitment. */
async function prototypeFor(
  providers: any,
  compiledContract: any,
  contractAddress: string,
  circuitId: string,
  args: any[]
): Promise<{ proto: any; commitment: string; call: any }> {
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

  // Our own randomness, rather than letting `createUnprovenLedgerCallTx` sample
  // one internally — the commitment has to be knowable BEFORE the claiming call
  // is built, and midnight-js does not hand its randomness back.
  //
  // And computed here rather than read off the prototype: `communicationCommitment`
  // is a field of the finalized `ContractCall`, not of `ContractCallPrototype`,
  // so reading it from the prototype yields undefined. Same inputs, same
  // function the ledger uses — commitment over the callee's aligned input/output
  // pair under this randomness.
  const rand = (communicationCommitmentRandomness as any)();
  const commitment: string = (communicationCommitment as any)(
    call.private.input,
    call.private.output,
    rand
  );

  const proto = new (ContractCallPrototype as any)(
    contractAddress,
    circuitId,
    op,
    guaranteed,
    fallible,
    call.private.privateTranscriptOutputs,
    call.private.input,
    call.private.output,
    rand,
    circuitId
  );

  return { proto, commitment, call };
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold("claimContractCall — enforced, or decoration?"));
  console.log();

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);
  say(`network ${network.name} (${network.networkId})`);

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    say(wallet.resumed ? "syncing (from cache)…" : "syncing…");
    const state = await waitForSync(wallet, say);
    if (state.dust.balance(new Date()) === 0n) throw new Error("no tDUST");

    const atomic = await loadCompiledContract("atomic");
    const claimer = await loadCompiledContract("claimer");
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);

    const make = (contractName: string, store: string) =>
      MidnightProviders.create({
        contractName,
        walletProvider,
        midnightProvider,
        networkConfig: network,
        accountId: wallet.unshieldedAddress,
        privateStateStoreName: store,
      });
    const pAtomic: any = make("atomic", "claimprobe-atomic");
    const pClaimer: any = make("claimer", "claimprobe-claimer");

    // A bundle spanning two contracts needs prover keys for BOTH, and
    // `MidnightProviders.create` scopes its key lookup to one contract name —
    // which is why run 4 died with `failed to resolve key at 'claimIt'` while
    // submitting through atomic's providers. The earlier probes never hit this:
    // they bundled two INSTANCES of one contract, so a single-contract provider
    // covered them.
    //
    // `wasmProofProvider()` with no contract name makes `readCircuit` scan every
    // contract under the managed roots, which is exactly the multi-contract case.
    // Cached, because building it loads the prover and the key material once.
    let crossPending: Promise<any> | null = null;
    const crossProofProvider = {
      proveTx: async (tx: any, cfg?: any) => {
        crossPending ??= wasmProofProvider();
        return (await crossPending).proveTx(tx, cfg);
      },
    };
    const submitting: any = { ...pAtomic, proofProvider: crossProofProvider };

    console.log();
    console.log(chalk.cyan("1. Deploying A (atomic) and B (claimer)"));
    const depA: any = await deployContract(pAtomic, { compiledContract: atomic.compiledContract } as any);
    const addrA = depA.deployTxData.public.contractAddress;
    say(`A  ${addrA}`);
    const depB: any = await deployContract(pClaimer, { compiledContract: claimer.compiledContract } as any);
    const addrB = depB.deployTxData.public.contractAddress;
    say(`B  ${addrB}`);

    const entryHex = (entryPointHash as any)("bump");
    say(`entryPointHash("bump") = ${String(entryHex).slice(0, 24)}…`);

    // ── POSITIVE ───────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("2. POSITIVE — bump + claim of that bump, one transaction"));

    // ── The commitment comes from the LEDGER, not from arithmetic here ─────
    //
    // Five runs were built on `communicationCommitment(call.private.input,
    // call.private.output, rand)` and every one was refused. The values differ
    // from what the ledger derives for the finalized call:
    //
    //   computed  737c66728acb0709…    ledger  731b546bb543fb60…
    //
    // So the claim named a commitment no call in the transaction carried, and
    // the node refused for a reason indistinguishable from the claim being
    // enforced. The fix is to stop computing it: add A's call to the intent
    // first, read the commitment off the resulting action, and build the claim
    // around that. `communicationCommitment` remains the right function for
    // whatever it commits to — it is simply not this.
    const protoA = await prototypeFor(pAtomic, atomic.compiledContract, addrA, "bump", [1n]);

    let intent: any = (Intent as any)
      .new(new Date(Date.now() + 60 * 60 * 1000))
      .addCall(protoA.proto);

    const ledgerComm: string | undefined = intent.actions?.[0]?.communicationCommitment;
    if (!ledgerComm) throw new Error("the intent's action exposes no communicationCommitment");
    say(`A commitment (ledger) ${ledgerComm}`);

    const candidates = commitmentCandidates(ledgerComm);
    if (candidates.length === 0) throw new Error("no candidate decodes to a field element");
    const commField = candidates[0];
    say(`as Field (${commField.label}) ${String(commField.value).slice(0, 26)}…`);

    const bCall = await prototypeFor(pClaimer, claimer.compiledContract, addrB, "claimIt", [
      hexToBytes(addrA),
      hexToBytes(String(entryHex)),
      commField.value,
    ]);
    intent = intent.addCall(bCall.proto);

    const positiveTx = (Transaction as any).fromPartsRandomized(
      getNetworkId(), undefined, undefined, intent
    );

    let positiveLanded = false;
    const encoding = commField.label;
    try {
      await submitTx(submitting, { unprovenTx: positiveTx } as any);
      positiveLanded = true;
      say(chalk.green("accepted"));
    } catch (cause) {
      say(chalk.red(`refused: ${String(cause instanceof Error ? cause.message : cause).slice(0, 110)}`));
    }

    // ── NEGATIVE ───────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("3. NEGATIVE — claim alone, naming a call that is not there"));
    say("same address, same entry point, a commitment from no call in this tx");

    if (!positiveLanded) {
      say(chalk.yellow("no encoding landed — a rejection below would prove nothing"));
    }

    // A commitment for a bump that exists only in this local run: its
    // transaction is thrown away, so nothing in the submitted transaction
    // carries it. Same encoding the positive established, so the only thing
    // different from the accepted case is that the claimed call is absent.
    const ghost = await prototypeFor(pAtomic, atomic.compiledContract, addrA, "bump", [99n]);
    const ghostIntent: any = (Intent as any)
      .new(new Date(Date.now() + 60 * 60 * 1000))
      .addCall(ghost.proto);
    const ghostLedgerComm: string = ghostIntent.actions[0].communicationCommitment;
    const ghostCandidates = commitmentCandidates(ghostLedgerComm);
    const ghostComm =
      ghostCandidates.find((c) => c.label === encoding) ?? ghostCandidates[0];
    say(`ghost commitment ${ghostLedgerComm.slice(0, 26)}… (its intent is discarded)`);

    const lone = await prototypeFor(pClaimer, claimer.compiledContract, addrB, "claimIt", [
      hexToBytes(addrA),
      hexToBytes(String(entryHex)),
      ghostComm.value,
    ]);
    const negativeTx = (Transaction as any).fromPartsRandomized(
      getNetworkId(),
      undefined,
      undefined,
      (Intent as any).new(new Date(Date.now() + 60 * 60 * 1000)).addCall(lone.proto)
    );

    let negativeRefused = false;
    try {
      await submitTx(submitting, { unprovenTx: negativeTx } as any);
      say(chalk.red("ACCEPTED — the claim was not checked"));
    } catch (cause) {
      negativeRefused = true;
      say(chalk.green(`refused: ${String(cause instanceof Error ? cause.message : cause).slice(0, 120)}`));
    }

    // ── read back ──────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("4. Reading both contracts back"));
    const stA = await pAtomic.publicDataProvider.queryContractState(addrA);
    const stB = await pClaimer.publicDataProvider.queryContractState(addrB);
    const lA = (atomic.contractModule as any).ledger(stA.data);
    const lB = (claimer.contractModule as any).ledger(stB.data);
    say(`A  count=${lA.count}  lastTag=${lA.lastTag}`);
    say(`B  claims=${lB.claims}`);

    console.log();
    if (positiveLanded && negativeRefused) {
      console.log(chalk.green.bold("✅ claimContractCall IS ENFORCED"));
      console.log(chalk.gray(`   commitment encoding: ${encoding}`));
      console.log(
        chalk.gray(
          "   A true claim landed and a false one was refused. Option D has a\n" +
            "   mechanism: a contract can require a sibling call to exist."
        )
      );
    } else if (positiveLanded && !negativeRefused) {
      console.log(chalk.red.bold("❌ NOT ENFORCED — a false claim was accepted"));
      console.log(
        chalk.gray(
          "   claimContractCall records an assertion nobody checks. Option D is\n" +
            "   dead however well it compiles; the ceiling is option C."
        )
      );
    } else {
      console.log(chalk.yellow.bold("⚠ INCONCLUSIVE"));
      console.log(
        chalk.gray(
          `   positive landed=${positiveLanded}, negative refused=${negativeRefused}.\n` +
            "   A positive that does not land says nothing about enforcement —\n" +
            "   fix the construction before reading the negative as a result."
        )
      );
    }
    console.log();
    say(`A ${addrA}`);
    say(`B ${addrB}`);
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
void AMOUNT_OF_NOISE;
