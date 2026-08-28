import "dotenv/config";
import crypto from "crypto";
import chalk from "chalk";
import { createUnprovenCallTx, deployContract, submitTx } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
// See atomic-probe.ts: `midnight-js-protocol/ledger` is a one-line re-export of
// this, so these are the identical objects on the identical WASM instance.
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { loadCompiledContract } from "./utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";

/**
 * Can one transaction carry two contract calls when BOTH move a coin?
 *
 * `npm run probe:atomic` settled the prior question: two calls to two different
 * contracts ride in one transaction and both apply (tx `d6531c86…`, 2026-08-28).
 * It moved no money, deliberately, so that a failure could only have meant one
 * thing. Every use the answer was wanted for moves money, and money is the part
 * with a known reason to fail.
 *
 * ── Why this is not a formality ────────────────────────────────────────────
 *
 * A call that receives a coin produces Zswap inputs and outputs which must sit
 * in the same section as the contract interaction claiming them. midnight-js
 * does that per call in `zswapStateToSegmentedOffer`, which it does not export —
 * so combining two calls means combining two offer sets without the helper that
 * knows how. And `incomelayerzk-constraints` already records `Transaction.merge`
 * throwing when both sides have contract interactions, which is the obvious
 * route and the one most likely to be shut.
 *
 * ── Two routes, tried in order, and the result names which one worked ──────
 *
 * A. `txA.merge(txB)`. Cheapest, and a retest of the recorded constraint rather
 *    than a fresh claim — that note predates this ledger version.
 *
 * B. One intent, two calls, offers merged by hand. `Intent.actions` is a mutable
 *    array and `ZswapOffer.merge` exists, so each call's offers can be built by
 *    midnight-js — correctly, per call — and then combined, rather than
 *    reimplementing the bucketing and risking a false negative.
 *
 *    ONE intent rather than two, and that is the whole point of doing it this
 *    way. A transaction may hold several intents, but an intent is a segment and
 *    a segment is the unit the ledger succeeds or fails as a whole. Two intents
 *    would be two calls in one transaction that can still land independently —
 *    which answers a weaker question than the strategy needs.
 *
 * ── What a pass licenses, and what it does not ─────────────────────────────
 *
 * A pass means the employer's three deposits — net to payroll, tax to the
 * treasury contract, contribution to the social contract — can be one
 * transaction, so they cannot disagree. It does NOT establish that a failing
 * call takes the others down with it; a Compact `assert` fails during local
 * execution, so a doomed call cannot be built, and forcing a validation-time
 * failure needs deliberately raced stale state. That is a third probe.
 */

const CONTRACT = "atomiccoin";

/** Small enough to be noise against a €995k balance, large enough to read. */
const AMOUNT = 1_000_000n; // €1.00 at pEUR's six decimals

function say(line: string): void {
  console.log(chalk.gray(`   ${line}`));
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold("Atomic multi-call probe — with coins"));
  console.log(chalk.gray("Two contracts, two coins, one transaction?"));
  console.log();

  const tokenHex = (process.env.peur_token_id ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(tokenHex)) {
    throw new Error("peur_token_id is not set in .env — nothing to deposit");
  }
  const color = hexToBytes(tokenHex);

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);
  say(`network ${network.name} (${network.networkId})`);
  say(`token   ${tokenHex.slice(0, 16)}…`);

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    say(wallet.resumed ? "syncing (from cache)…" : "syncing…");
    const state = await waitForSync(wallet, say);
    const dust = state.dust.balance(new Date());
    const peur = (state.shielded.balances as Record<string, bigint>)[tokenHex] ?? 0n;
    say(`balance ${peur} pEUR minor units, ${dust} tDUST`);
    if (dust === 0n) throw new Error("no tDUST — cannot pay fees");
    if (peur < AMOUNT * 2n) {
      throw new Error(`need ${AMOUNT * 2n} pEUR minor units, have ${peur}`);
    }
    if ((state.unshielded.balances[nativeToken().raw] ?? 0n) === 0n) {
      say("⚠️  no tNIGHT — deploys may fail");
    }

    const { compiledContract, contractModule } = await loadCompiledContract(CONTRACT);
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: CONTRACT,
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: "atomiccoin-probe-state",
    });

    // ── two vaults ─────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("1. Deploying two vaults"));
    const addresses: string[] = [];
    for (const label of ["A", "B"]) {
      const deployed: any = await deployContract(providers as any, {
        compiledContract: compiledContract as any,
      } as any);
      addresses.push(deployed.deployTxData.public.contractAddress);
      say(`${label}  ${addresses[addresses.length - 1]}`);
    }

    // ── one call per vault, each carrying a coin ───────────────────────────
    console.log();
    console.log(chalk.cyan("2. Building one call per vault"));
    const built: any[] = [];
    for (const [i, address] of addresses.entries()) {
      const tag = BigInt(i + 1);
      const call: any = await createUnprovenCallTx(providers as any, {
        compiledContract: compiledContract as any,
        contractAddress: address,
        circuitId: "deposit",
        args: [
          tag,
          AMOUNT,
          // A fresh nonce per coin. Nothing derives it because nothing needs to
          // reopen it later — payroll derives its nonces so an opening can be
          // rebuilt; this coin is never referred to again.
          { nonce: new Uint8Array(crypto.randomBytes(32)), color, value: AMOUNT },
        ],
      } as any);
      built.push(call);
      const tx = call.private.unprovenTx;
      const intents = tx.intents ? [...tx.intents.keys()] : [];
      say(
        `call ${i + 1} → ${address.slice(0, 12)}… tag ${tag} · ` +
          `intents [${intents.join(",")}] · ` +
          `guaranteed ${tx.guaranteedOffer ? "yes" : "no"} · ` +
          `fallible ${tx.fallibleOffer ? [...tx.fallibleOffer.keys()].join(",") : "none"}`
      );
    }

    // ── combine ────────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("3. Combining into ONE transaction"));
    const txA: any = built[0].private.unprovenTx;
    const txB: any = built[1].private.unprovenTx;

    // `auto` tries merge then falls back; `intent` forces route B.
    //
    // Forcing exists because the first run answered a smaller question than it
    // looked. `Transaction.merge` succeeded — so the recorded constraint that it
    // throws on contract interactions is stale — but it kept each call in its
    // OWN intent, and the merged transaction carried two segments. Both landed,
    // which proves two coin-moving calls can ride together; it does not prove
    // all-or-nothing, because a segment is what the ledger succeeds or fails as
    // a whole and there were two of them. Route B is the shape that would close
    // that, and `auto` short-circuits past it.
    const forced = (process.env.PROBE_ROUTE ?? "auto").trim().toLowerCase();
    if (forced !== "auto" && forced !== "merge" && forced !== "intent") {
      throw new Error(`PROBE_ROUTE must be auto, merge or intent — got "${forced}"`);
    }
    say(`route mode: ${forced}`);

    let combined: any;
    let route: string;
    try {
      if (forced === "intent") throw new Error("skipped — PROBE_ROUTE=intent");
      combined = txA.merge(txB);
      route = "A · Transaction.merge";
      say("Transaction.merge succeeded — the recorded constraint no longer holds");
    } catch (cause) {
      if (forced === "merge") throw cause;
      say(`Transaction.merge not used: ${cause instanceof Error ? cause.message : String(cause)}`);
      say("building one intent with both calls");

      const entriesA: any[] = [...txA.intents.entries()];
      const entriesB: any[] = [...txB.intents.entries()];
      if (entriesA.length !== 1 || entriesB.length !== 1) {
        throw new Error(
          `expected one intent each, got ${entriesA.length} and ${entriesB.length}`
        );
      }
      const [segA, intentA] = entriesA[0];
      const [, intentB] = entriesB[0];

      // Both calls into ONE intent — one segment, one fate.
      intentA.actions = [...intentA.actions, ...intentB.actions];
      txA.intents = new Map([[segA, intentA]]);

      if (txB.guaranteedOffer) {
        txA.guaranteedOffer = txA.guaranteedOffer
          ? txA.guaranteedOffer.merge(txB.guaranteedOffer)
          : txB.guaranteedOffer;
      }
      if (txB.fallibleOffer) {
        // Re-keyed onto A's segment, since B's intent is not coming with it and
        // an offer left under B's segment number would claim a section that no
        // longer exists in this transaction.
        const fallible: Map<number, any> = txA.fallibleOffer ?? new Map();
        for (const offer of txB.fallibleOffer.values()) {
          const existing = fallible.get(segA);
          fallible.set(segA, existing ? existing.merge(offer) : offer);
        }
        txA.fallibleOffer = fallible;
      }

      combined = txA;
      route = "B · one intent, two calls, offers merged";
    }

    say(`route: ${route}`);
    say(
      `combined: intents [${[...(combined.intents?.keys() ?? [])].join(",")}] · ` +
        `actions ${[...(combined.intents?.values() ?? [])].reduce(
          (n: number, i: any) => n + i.actions.length,
          0
        )}`
    );

    // ── submit ─────────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("4. Proving and submitting"));
    await submitTx(providers as any, { unprovenTx: combined } as any);
    say("accepted");

    // ── read both back ─────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("5. Reading both vaults back"));
    const seen: { total: bigint; deposits: bigint; tag: bigint }[] = [];
    for (const address of addresses) {
      const onChain = await (providers as any).publicDataProvider.queryContractState(address);
      const ledger = (contractModule as any).ledger(onChain.data);
      seen.push({ total: ledger.total, deposits: ledger.deposits, tag: ledger.lastTag });
      say(
        `${address.slice(0, 12)}…  total=${ledger.total}  ` +
          `deposits=${ledger.deposits}  lastTag=${ledger.lastTag}`
      );
    }

    console.log();
    const bothPaid = seen.every((s) => s.total === AMOUNT && s.deposits === 1n);
    const tagsDistinct = seen[0].tag === 1n && seen[1].tag === 2n;
    const segments = [...(combined.intents?.keys() ?? [])];
    if (bothPaid && tagsDistinct) {
      console.log(chalk.green.bold("✅ TWO COIN-MOVING CALLS IN ONE TRANSACTION"));
      console.log(chalk.gray(`   via ${route}`));
      console.log(
        segments.length === 1
          ? chalk.green(
              `   ONE segment (${segments[0]}) — both calls share the unit the ledger\n` +
                "   succeeds or fails as a whole. This is the shape atomicity needs."
            )
          : chalk.yellow(
              `   ⚠ ${segments.length} segments (${segments.join(", ")}) — the calls rode\n` +
                "   together but can still land independently. Weaker than it looks."
            )
      );
      console.log(
        chalk.gray(
          "   Confirm independently before relying on it — query contractAction\n" +
            "   for each address and check the transaction hashes are identical."
        )
      );
      console.log(chalk.gray(`   addresses: ${addresses.join(" ")}`));
    } else {
      console.log(chalk.red.bold("❌ NOT what a working two-coin multi-call looks like"));
      console.log(
        chalk.gray(
          `   totals ${seen.map((s) => s.total).join(", ")} · ` +
            `deposits ${seen.map((s) => s.deposits).join(", ")} · ` +
            `tags ${seen.map((s) => s.tag).join(", ")}\n` +
            `   Expected total=${AMOUNT}, deposits=1, tags 1 and 2.`
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
    console.error(chalk.gray(error.stack.split("\n").slice(1, 8).join("\n")));
  }
  console.error();
  console.error(
    chalk.gray(
      "A failure here is an answer too, and a consequential one: it would mean\n" +
        "the three deposits cannot be bundled, so they are independent and can\n" +
        "disagree. Receipt-then-release needs cross-contract reads, which are\n" +
        "ruled out — leaving escrow-and-pull as the only shape that needs\n" +
        "nothing unavailable."
    )
  );
  process.exit(1);
});
