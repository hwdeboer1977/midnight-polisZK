// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import crypto from "crypto";
import chalk from "chalk";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";
import { loadCompiledContract } from "./utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { treasuryKeys } from "./utils/treasury.js";
import { DUTCH_V1, computeLine } from "./utils/tax-params.js";
import { deriveEmployerKey, deriveNonce, sealOpening } from "./utils/payroll-openings.js";
import { FULL_MONTH_WEEKS } from "./utils/roster.js";
import { ruleSetHash } from "./utils/rule-window.js";
import { toPublicKey } from "./utils/keys.js";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  ShieldedCoinInfoDescriptor,
  ShieldedCoinRecipientDescriptor,
  runtimeCoinCommitment,
} from "@midnight-ntwrk/compact-runtime";

/**
 * Does `fundPeriod` work on chain?
 *
 * It merges `fundEmployee` (once per employee) and `fundWithholding` into one
 * circuit, so a period's net pay and its withholding are received together or
 * not at all. That closes the window in which `fundedFor` is true and
 * `withheldFor` is false — employees funded, employer still holding money that
 * is not theirs. Compiling proves none of that; eleven assertions across two
 * unrolled roster slots plus the withholding is a lot of ways to be subtly wrong.
 *
 * ── Everything happens on a FRESH contract ─────────────────────────────────
 *
 * A period is write-once in most of its state, so this cannot be rehearsed on a
 * contract that has already filed one. The probe deploys, opens a rule window,
 * assigns, files and funds — the whole cycle, in order, because each step
 * asserts the state the previous one left.
 *
 * ── The employer is the platform wallet, deliberately ──────────────────────
 *
 * `fundPeriod` asserts `ownPublicKey() == employer`, and this CLI signs with the
 * platform wallet. So the probe assigns the employer seat to the platform's own
 * key. That is wrong for a real deployment and exactly right here: it is the
 * only way one process can drive both halves of the cycle.
 *
 * ── What a pass means, and what it does not ────────────────────────────────
 *
 * A pass means four coins were received in one transaction, the commitments
 * reopened, and the pools match the assessed totals. It does NOT mean `payPeriod`
 * can then find those coins: receipt ordinals and Zswap tree order diverge
 * exactly when one transaction creates more than one coin, which is what
 * `incomelayerzk-constraints` records as the cause of `Public transcript input
 * mismatch for input 13`. `fundPeriod` creates four. Paying from it is the next
 * probe, and this one deliberately stops short of claiming it works.
 */

const PERIOD = 202609;
const SALARIES = [40_000_000n, 20_000_000n]; // €40.00 and €20.00, minor units
const PASSPHRASE = "fundperiod-probe";

function say(line: string): void {
  console.log(chalk.gray(`   ${line}`));
}

const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const eur = (v: bigint) => `€${(Number(v) / 1e6).toFixed(2)}`;

async function main(): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold("fundPeriod — one transaction for net + withholding"));
  console.log();

  const tokenHex = (process.env.peur_token_id ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(tokenHex)) throw new Error("peur_token_id is not set in .env");
  const color = Uint8Array.from(Buffer.from(tokenHex, "hex"));

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);
  say(`network ${network.name} (${network.networkId})`);

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    say(wallet.resumed ? "syncing (from cache)…" : "syncing…");
    const state = await waitForSync(wallet, say);
    if (state.dust.balance(new Date()) === 0n) throw new Error("no tDUST");

    const lines = SALARIES.map((gross) => computeLine(gross, DUTCH_V1));
    const totalNet = lines.reduce((n, l) => n + l.netMinor, 0n);
    const totalTax = lines.reduce((n, l) => n + l.taxMinor, 0n);
    const totalSocial = lines.reduce((n, l) => n + l.contribMinor, 0n);
    const needed = totalNet + totalTax + totalSocial;
    const peur = (state.shielded.balances as Record<string, bigint>)[tokenHex] ?? 0n;
    say(`need ${eur(needed)} pEUR, have ${eur(peur)}`);
    if (peur < needed) throw new Error("not enough pEUR");

    const { compiledContract, contractModule } = await loadCompiledContract("payroll");
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers: any = MidnightProviders.create({
      contractName: "payroll",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: "fundperiod-probe-state",
    });

    // ── 1. deploy ──────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("1. Deploying a fresh payroll contract"));
    const treasuries = treasuryKeys();
    const deployed: any = await deployContract(providers, {
      compiledContract,
      args: [treasuries.tax, treasuries.social],
    } as any);
    const address = deployed.deployTxData.public.contractAddress;
    say(address);

    const bound: any = await findDeployedContract(providers, {
      compiledContract,
      contractAddress: address,
    } as any);

    // ── 2. rule set ────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan(`2. Recording the rule set for ${PERIOD}`));
    const hash = await ruleSetHash(network.networkId);
    await bound.callTx.setParamsFor(
      BigInt(Math.floor(PERIOD / 100)),
      BigInt(PERIOD % 100),
      1n,
      hash
    );
    say(`rule set v${DUTCH_V1.version} recorded`);

    // ── 3. assign ──────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("3. Assigning the employer (the platform's own key)"));
    const myKey = String(wallet.shieldedSecretKeys.coinPublicKey);
    await bound.callTx.assignEmployer(toPublicKey(myKey));
    say(`employer ${myKey.slice(0, 20)}…`);

    // ── 4. file ────────────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan(`4. Filing ${PERIOD}`));
    const employerKey = deriveEmployerKey(PASSPHRASE, address);
    const nonces = SALARIES.map((_, i) => deriveNonce(employerKey, PERIOD, i));
    const sealed = lines.map((l, i) =>
      sealOpening(
        employerKey,
        {
          grossMinor: SALARIES[i],
          taxMinor: l.taxMinor,
          socialMinor: l.contribMinor,
          netMinor: l.netMinor,
          weeks: FULL_MONTH_WEEKS,
        },
        nonces[i]
      )
    );
    const instanceBytes = Uint8Array.from(Buffer.from(address.replace(/^0x/, ""), "hex"));
    // Paid to the probe's own key, so nothing is stranded with a stranger.
    const payees = SALARIES.map(() =>
      contractModule.pureCircuits.payeeHash(toPublicKey(myKey), BigInt(PERIOD), instanceBytes)
    );

    await bound.callTx.setPayroll(
      BigInt(PERIOD),
      SALARIES,
      lines.map(() => BigInt(FULL_MONTH_WEEKS)),
      lines.map((l) => l.taxMinor),
      lines.map((l) => l.contribMinor),
      nonces,
      sealed,
      payees,
      {
        version: BigInt(DUTCH_V1.version),
        validFrom: BigInt(DUTCH_V1.validFrom),
        threshold1: DUTCH_V1.threshold1,
        threshold2: DUTCH_V1.threshold2,
        rate1: BigInt(DUTCH_V1.rate1),
        rate2: BigInt(DUTCH_V1.rate2),
        rate3: BigInt(DUTCH_V1.rate3),
        maxContribBase: DUTCH_V1.maxContribBase,
        contribRate: BigInt(DUTCH_V1.contribRate),
      }
    );
    say(`filed — gross ${eur(SALARIES.reduce((a, b) => a + b, 0n))}, net ${eur(totalNet)}, ` +
        `tax ${eur(totalTax)}, social ${eur(totalSocial)}`);

    // ── 5. the circuit under test ──────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("5. fundPeriod — four coins, ONE transaction"));
    const netNonces = SALARIES.map(() => new Uint8Array(crypto.randomBytes(32)));
    const taxNonce = new Uint8Array(crypto.randomBytes(32));
    const socialNonce = new Uint8Array(crypto.randomBytes(32));
    say(`net coins ${lines.map((l) => eur(l.netMinor)).join(" + ")}`);
    say(`tax ${eur(totalTax)}, social ${eur(totalSocial)}`);

    const tx = await bound.callTx.fundPeriod(
      BigInt(PERIOD),
      SALARIES,
      lines.map((l) => l.taxMinor),
      lines.map((l) => l.contribMinor),
      lines.map((l) => l.netMinor),
      lines.map(() => BigInt(FULL_MONTH_WEEKS)),
      nonces,
      lines.map((l, i) => ({ nonce: netNonces[i], color, value: l.netMinor })),
      { nonce: taxNonce, color, value: totalTax },
      { nonce: socialNonce, color, value: totalSocial }
    );
    say(chalk.green(`accepted — tx ${tx.public?.txHash ?? "(no hash)"}`));
    say(`net nonces ${netNonces.map(toHex).map((h) => h.slice(0, 12)).join(", ")}`);
    say(`tax nonce ${toHex(taxNonce).slice(0, 12)}…  social ${toHex(socialNonce).slice(0, 12)}…`);

    // ── 6. read back ───────────────────────────────────────────────────────
    console.log();
    console.log(chalk.cyan("6. Reading the contract back"));
    const onChain = await providers.publicDataProvider.queryContractState(address);
    const l: any = contractModule.ledger(onChain.data);
    const P = BigInt(PERIOD);
    const funded = [0n, 1n].map((i) => l.fundedFor.lookup(P).lookup(i));
    say(`fundedFor  ${funded.join(", ")}`);
    say(`withheldFor ${l.withheldFor.lookup(P)}`);
    say(`taxPool ${eur(l.taxPool)}  socialPool ${eur(l.socialPool)}`);
    say(`coinsReceived ${l.coinsReceived}`);
    say(`taxCoinFor ${l.taxCoinFor.lookup(P)}  socialCoinFor ${l.socialCoinFor.lookup(P)}`);

    console.log();
    const ok =
      funded.every((f) => f === true) &&
      l.withheldFor.lookup(P) === true &&
      l.taxPool === totalTax &&
      l.socialPool === totalSocial &&
      l.coinsReceived === 4n;
    if (ok) {
      console.log(chalk.green.bold("✅ fundPeriod WORKS"));
      console.log(
        chalk.gray(
          "   Two net coins and both withholding coins received in one\n" +
            "   transaction. The paid-but-not-withheld window is closed.\n" +
            "   NOT yet shown: that payPeriod can locate these four coins."
        )
      );
    } else {
      console.log(chalk.red.bold("❌ fundPeriod did not leave the expected state"));
      console.log(
        chalk.gray(
          `   expected funded true,true · withheld true · pools ${totalTax}/${totalSocial} · coins 4`
        )
      );
    }
    if (!ok) {
      say(chalk.yellow("stopping before payPeriod — funding did not land as expected"));
      say(`contract ${address}`);
      return;
    }

    // ── 7. pay from a batch-funded period ──────────────────────────────────
    //
    // The part that has never been exercised. `incomelayerzk-constraints`:
    // "`payPeriod` is safe only by accident — `fundEmployee` sends one coin per
    // transaction, so receipt order and tree order coincide there. It breaks the
    // same way the moment funding is batched." Funding is now batched, and this
    // transaction created FOUR coins.
    //
    // So the coins are located the way that note prescribes — rebuild each
    // coin's commitment and find the leaf holding it — never by indexing sorted
    // leaves against a receipt ordinal.
    console.log();
    console.log(chalk.cyan("7. Locating the net coins by commitment"));

    const zprovider = indexerPublicDataProvider(network.indexer, network.indexerWS);
    const zresult = await zprovider.queryZSwapAndContractState(address);
    if (!zresult) throw new Error("the indexer returned no zswap state");
    const [zswap] = zresult as any;
    const onLedger = [
      ...String(zswap.filter(address).toString(true)).matchAll(
        /(\d+): \(([0-9a-f]{64}), Some\(ContractAddress/g
      ),
    ].map((m) => ({ leaf: Number(m[1]), commitment: m[2] as string }));
    say(`contract owns ${onLedger.length} coin(s): leaves [${onLedger.map((c) => c.leaf).join(", ")}]`);

    const commitmentOf = (coin: { nonce: Uint8Array; color: Uint8Array; value: bigint }) =>
      toHex(
        (runtimeCoinCommitment as any)(
          {
            value: (ShieldedCoinInfoDescriptor as any).toValue(coin),
            alignment: (ShieldedCoinInfoDescriptor as any).alignment(),
          },
          {
            value: (ShieldedCoinRecipientDescriptor as any).toValue({
              is_left: false,
              left: { bytes: new Uint8Array(32) },
              // BOTH branches present. Omitting one fails inside WASM as
              // "Reflect.get called on non-object", which names nothing.
              right: { bytes: Uint8Array.from(Buffer.from(address.replace(/^0x/, ""), "hex")) },
            }),
            alignment: (ShieldedCoinRecipientDescriptor as any).alignment(),
          }
        ).value[0] as Uint8Array
      );

    const qualified = lines.map((line, i) => {
      const coin = { nonce: netNonces[i], color, value: line.netMinor };
      const want = commitmentOf(coin);
      const found = onLedger.find((c) => c.commitment === want);
      if (!found) {
        throw new Error(
          `net coin ${i} (${eur(line.netMinor)}) matches no leaf — commitment ${want.slice(0, 16)}…`
        );
      }
      say(`net coin ${i} (${eur(line.netMinor)}) → leaf ${found.leaf}`);
      return { ...coin, mt_index: BigInt(found.leaf) };
    });

    // The ordinals the contract recorded, for comparison. If these disagree with
    // the leaves above, the receipt-ordinal shortcut would have paid the wrong
    // coin — which is the whole point of not using it.
    const ordinals = [0n, 1n].map((i) => l.coinOrdinalFor.lookup(P).lookup(i));
    say(`recorded ordinals [${ordinals.join(", ")}] vs leaves [${qualified.map((q) => q.mt_index).join(", ")}]`);

    console.log();
    console.log(chalk.cyan("8. payPeriod — paying both employees"));
    const payTx = await bound.callTx.payPeriod(
      BigInt(PERIOD),
      SALARIES,
      lines.map((x) => x.taxMinor),
      lines.map((x) => x.contribMinor),
      lines.map((x) => x.netMinor),
      lines.map(() => BigInt(FULL_MONTH_WEEKS)),
      nonces,
      qualified,
      SALARIES.map(() => toPublicKey(myKey))
    );
    say(chalk.green(`accepted — tx ${payTx.public?.txHash ?? "(no hash)"}`));

    const after: any = contractModule.ledger(
      (await providers.publicDataProvider.queryContractState(address)).data
    );
    const paid = [0n, 1n].map((i) => after.paidFor.lookup(P).lookup(i));
    say(`paidFor ${paid.join(", ")}`);

    console.log();
    if (paid.every((x: boolean) => x === true)) {
      console.log(chalk.green.bold("✅ payPeriod WORKS AFTER BATCH FUNDING"));
      console.log(
        chalk.gray(
          "   Both employees paid from a period funded by one transaction that\n" +
            "   created four coins. Coins located by commitment, not by ordinal."
        )
      );
    } else {
      console.log(chalk.red.bold("❌ payPeriod did not pay both slots"));
    }

    console.log();
    say(`contract ${address}`);
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
