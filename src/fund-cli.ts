// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import chalk from "chalk";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import * as fundContract from "../contracts/managed/fund/contract/index.js";
import { EnvironmentManager } from "./utils/environment.js";
import { getDeployment } from "./utils/deployments.js";
import { buildWallet, currentState, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { connect, loadCompiledContract, managedPath } from "./utils/contract.js";
import { PEUR_DECIMALS, PEUR_SCALE, formatPeur } from "./utils/constructor-args.js";
import { PUBLISHED, recordedParams, toCircuitParams } from "./utils/benefit-params.js";
import {
  claimChangeNonce,
  confirmDeposit,
  contractCoinLeaves,
  findCoinLeaf,
  freshNonce,
  listDeposits,
  markSpent,
  poolFile,
  recordDerived,
  recordPending,
} from "./utils/fund-pool.js";
import path from "path";

/**
 * The fund's operator commands.
 *
 *   npm run fund status
 *   npm run fund -- params --version 1 --cap <EUR/month> --rate <bp> --min-months 12 --duration-months 3
 *   npm run fund -- rules --version 1 --year 2026 [--from 1 --months 12]
 *   npm run fund -- deposit --period 202609 --amount <EUR>
 *   npm run fund -- reconcile --value <EUR>
 *   npm run fund pool [-- --full]
 *
 * The `--` is not decoration. Without it npm reads `--amount 10` as its own
 * config and the script never sees it — the flag vanishes and the command fails
 * asking for the argument that was just typed. Same convention as
 * `npm run payee <seed> -- --balance` and `npm run relay -- <period> --publish`.
 *
 * `params` publishes a rule set and pins it forever: the registry is
 * append-only, for the same reason the tax registry is. A benefit computed
 * under rules that can be rewritten afterwards proves nothing about what
 * anyone was entitled to.
 *
 * `rules` records which published version terminations in a range of final
 * periods are claimed under. Write-once per month, and the step a claim cannot
 * do without: `claim` checks the rules against what is recorded for the final
 * period, so a claimant cannot pick a more generous published version.
 *
 * None of the policy figures has a default, deliberately. The cap is a policy
 * number from the scheme being modelled — real WW caps a daily wage, and the
 * monthly equivalent has to be derived from a published figure rather than
 * picked here.
 *
 * `deposit` puts money in. Contributions cannot arrive here on their own: a
 * payroll contract cannot call this one, so remitting to the fund is a transfer
 * to a key and then a deliberate transaction by whoever holds it. This is that
 * transaction. `pool` reports what it left behind, which is the only record of
 * the fund's coins that exists anywhere — see `utils/fund-pool.ts`.
 *
 * There is no `remit`. Withholding on a benefit leaves inside the claim, sent
 * straight to the two treasuries, because a public pool moved by every claim
 * published each claim's benefit.
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

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function requireFlag(args: string[], name: string, why: string): string {
  const value = flag(args, name);
  if (!value) {
    // The overwhelmingly likely cause is a missing `--`: npm consumes
    // `--amount 10` as its own config, so the flag really was typed and really
    // did not arrive. Saying only "required" sends the operator to retype it
    // exactly as before.
    // npm records what it took as `npm_config_<name>`, but not reliably as the
    // value that was typed: `--amount 10` leaves `npm_config_amount=true` and
    // pushes the 10 through as a stray positional. So the flag's presence is
    // worth reporting and its value is not worth reconstructing.
    const eaten = process.env[`npm_config_${name.replace(/-/g, "_")}`] !== undefined;
    const verb = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "<command>";
    throw new Error(
      `--${name} is required — ${why}` +
        (eaten
          ? `\n\n   npm read --${name} as its own config, so this script never saw it.` +
            `\n   Put -- before the arguments:\n\n      npm run fund -- ${verb} --${name} <value>`
          : "")
    );
  }
  return value;
}

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * An amount in EUR, exactly. Parsed as a decimal string rather than through
 * `Number`: pEUR has six decimals, and a float loses cents on any amount a
 * national fund would actually hold.
 */
function parseEur(raw: string): bigint {
  const value = raw.trim().replace(/[_,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) {
    throw new Error(
      `"${raw}" is not an amount in EUR — whole units with up to ${PEUR_DECIMALS} ` +
        `decimals, e.g. 250000 or 250000.50`
    );
  }
  const amount =
    BigInt(match[1]!) * PEUR_SCALE + BigInt((match[2] ?? "").padEnd(PEUR_DECIMALS, "0"));
  if (amount <= 0n) throw new Error("Amount must be greater than zero");
  return amount;
}

/** The raw ledger state of any contract, or null if the indexer has none. */
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

async function readLedger(indexer: string, address: string): Promise<any | null> {
  const state = await readState(indexer, address);
  return state ? (fundContract as any).ledger(state) : null;
}

/** The version of a published rule set, found by the hash the fund recorded. */
function versionForHash(recorded: Uint8Array): number | null {
  return (
    recordedParams(recorded, (p) => (fundContract as any).pureCircuits.benefitParamsHash(p))
      ?.version ?? null
  );
}

/**
 * The token benefits are paid in, read off the deployed pEUR contract rather
 * than out of `.env`.
 *
 * The fund freezes its token at deploy, so this is checked against the fund
 * before anything is proved: a mismatch means the wrong pEUR is recorded here,
 * or the fund was deployed against another one.
 */
async function benefitTokenColour(network: {
  networkId: string;
  indexer: string;
}): Promise<Uint8Array> {
  const peur = getDeployment(network.networkId, "peur");
  if (!peur) {
    throw new Error(
      `No pEUR deployed on ${network.networkId} — benefits are paid in pEUR. ` +
        "Deploy it first: npm run deploy:peur"
    );
  }
  const state = await readState(network.indexer, peur.contractAddress);
  if (!state) throw new Error("The pEUR contract has no state on chain");

  const peurModule: any = await import(
    path.join(managedPath("peur"), "contract", "index.js")
  );
  return peurModule.ledger(state).tokenId as Uint8Array;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("--")) ?? "status";

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, "fund");
  if (!record) {
    throw new Error(
      `No fund deployed on ${network.networkId}. Deploy one first:\n` +
        "   npm run deploy:fund"
    );
  }

  console.log();
  console.log(chalk.blue.bold("🌙  IncomeLayerZK — unemployment fund"));
  console.log(chalk.gray(`   ${record.contractAddress} on ${network.name}`));
  console.log();

  if (command === "status") {
    const ledger = await readLedger(network.indexer, record.contractAddress);
    if (!ledger) throw new Error("No state on chain");

    console.log(chalk.cyan("rule sets published: ") + String(ledger.latestVersion));
    console.log(chalk.cyan("claims paid         : ") + String(ledger.claimsPaid));
    console.log(chalk.cyan("benefit token       : ") + hex(ledger.benefitToken));
    // The chain holds only `persistentHash<BenefitParams>`, so these figures come
    // from utils/benefit-params.ts. A version on chain that is missing there is
    // worth shouting about: no claim under it can be built.
    for (let v = 1; v <= Number(ledger.latestVersion); v += 1) {
      const known = PUBLISHED.find((p) => p.version === v);
      console.log(
        chalk.gray(`   v${v}  `) +
          (known
            ? `cap €${formatPeur(known.maxMonthlyGross)}/mo · ${known.rate / 100}% · ` +
              `${known.minMonths} month(s) · ${known.durationMonths} month(s) paid · from ${known.validFrom}`
            : chalk.red("figures not recorded locally — no claim under it can be built"))
      );
    }

    // Which version each final period is claimed under, as runs of months.
    const recorded = [...ledger.paramsHashFor]
      .map(([p, h]: [bigint, Uint8Array]) => ({ period: Number(p), version: versionForHash(h) }))
      .sort((a, b) => a.period - b.period);
    console.log(
      chalk.cyan("rules recorded      : ") +
        (recorded.length === 0
          ? chalk.yellow("none — no claim can be made until `fund rules` has run")
          : `${recorded.length} month(s)`)
    );
    let run: { from: number; to: number; version: number | null } | null = null;
    const flush = () => {
      if (!run) return;
      console.log(
        chalk.gray(`   ${run.from}–${run.to}  `) +
          (run.version === null ? chalk.red("unknown version") : `v${run.version}`)
      );
    };
    for (const entry of recorded) {
      if (run && run.version === entry.version) run.to = entry.period;
      else {
        flush();
        run = { from: entry.period, to: entry.period, version: entry.version };
      }
    }
    flush();

    const periods = [...ledger.rootFor].map(([p]: [bigint, unknown]) => Number(p));
    console.log(
      chalk.cyan("claim trees         : ") +
        (periods.length ? periods.sort().join(", ") : chalk.gray("none published"))
    );
    console.log(
      chalk.cyan("withholding         : ") +
        chalk.gray("sent to the treasuries inside each claim — no public total, by design")
    );
    console.log(
      chalk.cyan("coins received      : ") +
        String(ledger.coinsReceived) +
        chalk.gray(
          ledger.coinsReceived > 0n ? `  (pool is coin #${ledger.poolOrdinal})` : ""
        )
    );
    console.log();
    return;
  }

  if (command === "reconcile") {
    await reconcile(
      network,
      record.contractAddress,
      parseEur(
        requireFlag(
          args,
          "value",
          "what the change coin is worth, in EUR — the pool coin less the whole benefit " +
            "the claim paid, withholding included. That benefit is private, so nothing on " +
            "this machine knows it. It is CHECKED here, not trusted: a wrong one " +
            "reproduces no commitment and is refused"
        )
      )
    );
    return;
  }

  if (command === "pool") {
    await showPool(network, record.contractAddress, has(args, "full"));
    return;
  }

  if (command === "deposit") {
    // Which month's contributions these are, and which payroll contract they
    // came from. Both are recorded on the fund so `contributedFor[period]` can
    // be checked against that period's `totalSocialFor` — a deposit with
    // neither is an unattributed increase in a pool.
    const period = Number(
      requireFlag(args, "period", "which period these contributions cover, as YYYYMM")
    );
    if (!Number.isInteger(period) || period < 200001 || period > 299912) {
      throw new Error(`--period must be YYYYMM, e.g. 202609 — got "${period}"`);
    }

    // Defaults to the payroll contract this deployment runs, which is where the
    // money came from in every ordinary case. Overridable because an operator
    // may be depositing on behalf of an older instance.
    const payroll = getDeployment(network.networkId, "payroll");
    const source = (flag(args, "source") ?? payroll?.contractAddress ?? "").replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/i.test(source)) {
      throw new Error(
        "--source must be the payroll contract address these contributions came " +
          "from (64 hex characters). No payroll deployment was found to default to."
      );
    }

    await deposit(
      network,
      record.contractAddress,
      parseEur(requireFlag(args, "amount", "how much to put into the fund, in EUR")),
      period,
      source
    );
    return;
  }

  if (command === "rules") {
    await recordRules(network, record.contractAddress, args);
    return;
  }

  if (command === "remit") {
    throw new Error(
      "There is no remit any more. Withholding on a benefit is sent to the tax and " +
        "social treasuries inside each claim, so the fund holds none of it."
    );
  }

  if (command !== "params") {
    throw new Error(
      `Unknown command "${command}". Use: status | params | rules | deposit | pool | reconcile`
    );
  }

  const version = Number(requireFlag(args, "version", "rule sets are versioned and append-only"));
  const capEur = requireFlag(
    args,
    "cap",
    "the maximum monthly gross a benefit may be computed from, in EUR. " +
      "Derive it from the scheme's published daily maximum; this tool will not guess one"
  );
  const rate = Number(
    requireFlag(args, "rate", "basis points of the capped gross, e.g. 7000 for 70%")
  );
  const minMonths = Number(
    requireFlag(args, "min-months", "months of employment required to claim")
  );
  // Part of the struct, so it is part of the hash, so it has to be published
  // with the rest. `claim` admits exactly this many calendar months after the
  // final period — the figure makes the number of payments a rule.
  const durationMonths = Number(
    requireFlag(
      args,
      "duration-months",
      "how many calendar months after the final period a claimant may claim"
    )
  );
  const validFrom = Number(flag(args, "valid-from") ?? "200001");

  const cap = parseEur(capEur);
  if (rate > 10000) throw new Error("rate cannot exceed 10000 basis points");
  if (!(durationMonths > 0)) throw new Error("--duration-months must be at least 1");

  // A version already recorded locally must match, or one of the two is wrong
  // about what was published — and the chain cannot settle it, since it keeps
  // only the hash. Refusing here beats discovering it at someone's claim.
  const recorded = PUBLISHED.find((p) => p.version === version);
  if (
    recorded &&
    (recorded.maxMonthlyGross !== cap ||
      recorded.rate !== rate ||
      recorded.minMonths !== minMonths ||
      recorded.durationMonths !== durationMonths ||
      recorded.validFrom !== validFrom)
  ) {
    throw new Error(
      `utils/benefit-params.ts already records v${version} with different figures ` +
        `(cap €${formatPeur(recorded.maxMonthlyGross)}, ${recorded.rate}bp, ` +
        `${recorded.minMonths} month(s), ${recorded.durationMonths} month(s) paid, ` +
        `from ${recorded.validFrom}). The registry is ` +
        "append-only: publish a new version rather than restating this one."
    );
  }

  console.log(chalk.yellow.bold("Publishing rule set v" + version));
  console.log(chalk.gray(`   cap        €${formatPeur(cap)} per month`));
  console.log(chalk.gray(`   rate       ${rate / 100}% of the capped gross`));
  console.log(chalk.gray(`   eligible   ${minMonths} months`));
  console.log(chalk.gray(`   paid for   ${durationMonths} months after the final period`));
  console.log(chalk.gray(`   valid from ${validFrom}`));
  console.log();

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    console.log(chalk.gray("Syncing…"));
    await waitForSync(wallet, (l) => console.log(chalk.gray(`   ${l}`)));

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
      contractAddress: record.contractAddress,
      compiledContract: compiled.compiledContract as any,
    } as any);

    console.log(chalk.blue("Proving (a minute or two)…"));
    const tx = await deployed.callTx.publishParams({
      version: BigInt(version),
      validFrom: BigInt(validFrom),
      maxMonthlyGross: cap,
      rate: BigInt(rate),
      minMonths: BigInt(minMonths),
      durationMonths: BigInt(durationMonths),
    });
    console.log(chalk.green(`   ✅ ${tx.public?.txHash ?? ""}`));
    if (!recorded) {
      console.log();
      console.log(
        chalk.yellow.bold("   ⚠️  Add these figures to utils/benefit-params.ts now.")
      );
      console.log(
        chalk.yellow(
          "   The fund stored only their hash. A claimant must supply the whole\n" +
            "   struct to `claim`, so a version that lives nowhere off chain is a\n" +
            "   version nobody can ever claim under."
        )
      );
    }
    console.log();
    console.log(
      chalk.cyan("   Published, not yet applied. Record it for the months it covers:\n") +
        chalk.yellow.bold(`   npm run fund -- rules --version ${version} --year <YYYY>`)
    );
  } finally {
    await wallet.facade.stop();
  }
  console.log();
}

/**
 * Records which published rule set applies to a range of final periods.
 *
 * `setParamsFor` is write-once per month and skips months already recorded, so
 * re-running a year is safe and a recorded month can never be changed. Shown
 * before proving, because a month that is skipped keeps whatever it had.
 */
async function recordRules(
  network: ReturnType<typeof EnvironmentManager.getNetworkConfig>,
  contractAddress: string,
  args: string[]
): Promise<void> {
  const version = Number(requireFlag(args, "version", "which published rule set to record"));
  const year = Number(
    requireFlag(args, "year", "the calendar year of the final periods it applies to, e.g. 2026")
  );
  const from = Number(flag(args, "from") ?? "1");
  const months = Number(flag(args, "months") ?? String(13 - from));

  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    throw new Error(`--year must be YYYY, e.g. 2026 — got "${year}"`);
  }
  if (!Number.isInteger(from) || from < 1 || from > 12) {
    throw new Error(`--from must be a month, 1-12 — got "${from}"`);
  }
  if (!Number.isInteger(months) || months < 1 || from + months > 13) {
    throw new Error(`--months must be at least 1 and must not run past December`);
  }

  const params = PUBLISHED.find((p) => p.version === version);
  if (!params) {
    throw new Error(
      `v${version} is not recorded in utils/benefit-params.ts, so its figures cannot ` +
        "be supplied to the contract. Add them first."
    );
  }

  const ledger = await readLedger(network.indexer, contractAddress);
  if (!ledger) throw new Error("No state on chain");
  if (!ledger.paramsFor.member(BigInt(version))) {
    throw new Error(
      `v${version} is not published on this fund yet. Publish it first:\n` +
        `   npm run fund -- params --version ${version} …`
    );
  }
  const firstPeriod = year * 100 + from;
  if (params.validFrom > firstPeriod) {
    throw new Error(
      `v${version} applies from ${params.validFrom}, after ${firstPeriod}. The contract refuses it.`
    );
  }

  console.log(chalk.yellow.bold(`Recording rule set v${version} for final periods`));
  for (let i = 0; i < months; i += 1) {
    const period = firstPeriod + i;
    const key = BigInt(period);
    const existing = ledger.paramsHashFor.member(key)
      ? versionForHash(ledger.paramsHashFor.lookup(key))
      : undefined;
    console.log(
      chalk.gray(`   ${period}  `) +
        (existing === undefined
          ? `v${version}`
          : chalk.yellow(
              `already v${existing ?? "?"} — skipped; a recorded month cannot be changed`
            ))
    );
  }
  console.log();

  const conn = await connect("fund", null);
  try {
    console.log(chalk.blue("Proving (a minute or two)…"));
    const tx: any = await conn.deployed.callTx.setParamsFor(
      BigInt(year),
      BigInt(from),
      BigInt(months),
      toCircuitParams(params)
    );
    console.log(chalk.green(`   ✅ ${tx.public?.txHash ?? ""}`));
  } finally {
    await conn.wallet.facade.stop();
  }
  console.log();
}

/**
 * Puts money into the fund.
 *
 * The coin's nonce is written to `fund-pool.json` BEFORE the transaction is
 * built, because the contract does not keep it and nothing else can recover it.
 * See the note at the top of `utils/fund-pool.ts` for what losing it costs.
 */
async function deposit(
  network: ReturnType<typeof EnvironmentManager.getNetworkConfig>,
  contractAddress: string,
  amount: bigint,
  period: number,
  source: string
): Promise<void> {
  const colour = await benefitTokenColour(network);
  const colourHex = hex(colour);

  const before = await readLedger(network.indexer, contractAddress);
  if (!before) throw new Error("No state on chain");

  const fixed = hex(before.benefitToken);
  if (fixed !== colourHex) {
    throw new Error(
      `This fund pays in token ${fixed}, but the pEUR deployed on ` +
        `${network.networkId} is ${colourHex}. The fund's token was frozen at deploy ` +
        "and cannot be changed — either the wrong pEUR is recorded in " +
        "deployment.json, or this fund was deployed against an earlier one."
    );
  }

  console.log(chalk.yellow.bold(`Depositing €${formatPeur(amount)}`));
  console.log(chalk.gray(`   token  ${colourHex}`));
  console.log();

  const conn = await connect("fund", null);
  // Whether the nonce reached the disk. The failure advice below is only true
  // once it has, and a warning about a record that was never written sends an
  // operator looking for a coin that does not exist.
  let recorded = false;
  try {
    // Checked before proving rather than after: an underfunded wallet fails in
    // the balancer, minutes later, with an error about the transaction rather
    // than about the balance.
    const state = await currentState(conn.wallet);
    const balances = (state.shielded as any).balances as Record<string, bigint>;
    const held = balances[colourHex] ?? balances[`0x${colourHex}`] ?? 0n;
    if (held < amount) {
      throw new Error(
        `This wallet holds €${formatPeur(held)} pEUR, which does not cover ` +
          `€${formatPeur(amount)}. Mint or transfer more before depositing.`
      );
    }

    const nonce = freshNonce();
    recordPending(network.networkId, contractAddress, { nonce, color: colour, value: amount });
    recorded = true;
    console.log(
      chalk.gray(`   coin nonce recorded in ${poolFile()} before submitting`)
    );

    console.log(chalk.blue("Proving (a minute or two)…"));
    const tx: any = await conn.deployed.callTx.fundBenefits(
      BigInt(period),
      Uint8Array.from(Buffer.from(source.replace(/^0x/, ""), "hex")),
      amount,
      { nonce, color: colour, value: amount }
    );
    const txHash = String(tx.public?.txHash ?? "");

    // The ordinal comes from the chain, not from a count kept here: `poolOrdinal`
    // is what the contract itself recorded for the coin it just received.
    const after = await readLedger(network.indexer, contractAddress);
    const ordinal = after ? Number(after.poolOrdinal) : Number(before.coinsReceived);
    confirmDeposit(network.networkId, contractAddress, nonce, { txHash, ordinal });

    console.log(chalk.green(`   ✅ ${txHash}`));
    console.log();
    console.log(chalk.cyan("   pool coin  ") + `#${ordinal}`);
    console.log(
      chalk.cyan("   recorded   ") +
        `${poolFile()} — back this file up; the fund's coins cannot be spent without it`
    );
    console.log();
  } catch (error) {
    if (recorded) {
      console.log();
      console.log(
        chalk.yellow(
          `A deposit was written to ${poolFile()} as "pending" before this failed. ` +
            "If the transaction landed anyway the entry describes a real coin, so do " +
            "not delete it — run `npm run fund pool` and compare against the " +
            "contract's coins received."
        )
      );
    }
    throw error;
  } finally {
    await conn.wallet.facade.stop();
  }
}

/**
 * Recovers the change coin a claim left behind.
 *
 * A claim makes three sends chained through their change — net, tax,
 * contribution — and the last change comes back to the contract as a NEW coin
 * whose nonce is derived from the spent pool coin's and published nowhere. So
 * after a claim the pool is a coin this machine has no record of, and the money
 * is unreachable until the nonce is rebuilt (`claimChangeNonce`).
 *
 * The derivation is checked rather than believed. The coin's commitment is
 * public — it sits among the fund's zswap leaves — so a candidate coin can be
 * hashed and searched for. Nothing is recorded unless one matches, which turns
 * "probably the right nonce" into "provably the coin at leaf N". Searched by
 * commitment, never by indexing the leaves with the receipt ordinal: a claim
 * creates change coins it spends straight away, and the two orders disagree.
 */
async function reconcile(
  network: ReturnType<typeof EnvironmentManager.getNetworkConfig>,
  contractAddress: string,
  changeValue: bigint
): Promise<void> {
  const ledger = await readLedger(network.indexer, contractAddress);
  if (!ledger) throw new Error("No state on chain");

  const known = listDeposits(network.networkId, contractAddress);
  const poolOrdinal = Number(ledger.poolOrdinal);
  if (known.some((d) => d.ordinal === poolOrdinal)) {
    console.log(chalk.green(`   ✅ Coin #${poolOrdinal} is already recorded — nothing to do.`));
    console.log();
    return;
  }

  const provider = indexerPublicDataProvider(network.indexer, network.indexerWS);
  const leaves = await contractCoinLeaves(provider as any, contractAddress);
  if (leaves.length === 0) {
    throw new Error("The indexer shows no coins for this contract — it may be behind.");
  }

  console.log(chalk.yellow(`Recovering coin #${poolOrdinal}`));
  console.log(chalk.gray(`   assuming it is worth €${formatPeur(changeValue)}`));
  console.log();

  // Every coin this machine knows of is a candidate parent: the change descends
  // from whichever one the claim spent, and nothing public says which.
  for (const parent of known) {
    const coin = {
      nonce: claimChangeNonce(fromHexBytes(parent.nonce)),
      color: fromHexBytes(parent.color),
      value: changeValue,
    };
    const leaf = findCoinLeaf(leaves, coin, contractAddress);
    if (leaf === undefined) continue;

    recordDerived(network.networkId, contractAddress, { ...coin, ordinal: poolOrdinal });
    // The coin this change came from is gone. Recording only the change left
    // the spent parent looking spendable — and it is usually the LARGEST
    // record, so every consumer that picks by value picked it first.
    markSpent(network.networkId, contractAddress, Number(parent.ordinal));
    console.log(
      chalk.green(`   ✅ Verified — its commitment matches the one on chain, at leaf ${leaf}.`)
    );
    console.log(
      chalk.gray(
        `   change of coin #${parent.ordinal} (€${formatPeur(BigInt(parent.value))}), ` +
          `so that claim paid out €${formatPeur(BigInt(parent.value) - changeValue)} in total — ` +
          "the net to the claimant and the withholding to the two treasuries"
      )
    );
    console.log(chalk.gray(`   recorded in ${poolFile()}`));
    console.log();
    return;
  }

  throw new Error(
    `No known coin produces coin #${poolOrdinal} with a value of €${formatPeur(changeValue)}. ` +
      "Either the value is wrong — it is not derivable, only checkable — or the coin " +
      "descends from one this machine never recorded."
  );
}

/** Hex to bytes, for values that came out of the pool file or a config. */
function fromHexBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value.replace(/^0x/, ""), "hex"));
}

/**
 * What the fund holds, as far as anything can tell.
 *
 * Deliberately two columns of different provenance: what the chain says (how
 * many coins were received, which one the pool is) and what this machine
 * remembers (their nonces and values). The fund is not publicly solvent — its
 * balance is a shielded coin — so the second column cannot be verified against
 * the first beyond counting.
 */
async function showPool(
  network: ReturnType<typeof EnvironmentManager.getNetworkConfig>,
  contractAddress: string,
  full: boolean
): Promise<void> {
  const ledger = await readLedger(network.indexer, contractAddress);
  if (!ledger) throw new Error("No state on chain");

  const deposits = listDeposits(network.networkId, contractAddress);
  const provider = indexerPublicDataProvider(network.indexer, network.indexerWS);
  const leaves = await contractCoinLeaves(provider as any, contractAddress);

  console.log(chalk.cyan("coins received : ") + String(ledger.coinsReceived));
  console.log(
    chalk.cyan("pool coin      : ") +
      (ledger.coinsReceived > 0n ? `#${ledger.poolOrdinal}` : chalk.gray("none"))
  );
  console.log(chalk.cyan("claims paid    : ") + String(ledger.claimsPaid));
  console.log();

  if (deposits.length === 0) {
    console.log(chalk.gray(`No deposits recorded in ${poolFile()} for this contract.`));
    if (ledger.coinsReceived > 0n) {
      console.log(
        chalk.red(
          `   ⚠️  The contract has received ${ledger.coinsReceived} coin(s) whose nonces ` +
            "are not on this machine. Nothing here can describe them to `claim`."
        )
      );
    }
    console.log();
    return;
  }

  // A coin is spent when another recorded coin is its claim change: the change
  // nonce is derived from the input's, so the parent-child link is computable
  // here and does not have to be tracked. Without this the totals would count a
  // spent coin and its own remainder as two.
  const byNonce = new Set(deposits.map((d) => d.nonce));
  const spent = new Set(
    deposits
      .filter(
        (d) =>
          d.status === "spent" ||
          byNonce.has(Buffer.from(claimChangeNonce(fromHexBytes(d.nonce))).toString("hex"))
      )
      .map((d) => d.nonce)
  );

  let deposited = 0n;
  let spendable = 0n;
  console.log(chalk.bold("recorded coins"));
  for (const d of deposits) {
    const value = BigInt(d.value);
    // "Deposited" counts money put in, so a change coin — which is money that
    // never left — is excluded from it.
    if (d.status === "confirmed" && d.txHash) deposited += value;
    if (d.status === "confirmed" && !spent.has(d.nonce)) spendable += value;

    const leaf = findCoinLeaf(
      leaves,
      { nonce: fromHexBytes(d.nonce), color: fromHexBytes(d.color), value },
      contractAddress
    );
    const isPool = d.ordinal !== null && BigInt(d.ordinal) === ledger.poolOrdinal;

    console.log(
      `  ${isPool ? chalk.green("→") : " "} €${formatPeur(value).padStart(14)}  ` +
        (d.ordinal === null ? chalk.yellow("coin   ?") : `coin #${String(d.ordinal).padEnd(3)}`) +
        (leaf === undefined ? chalk.gray("  leaf   ?") : `  leaf ${String(leaf).padEnd(4)}`) +
        (d.status === "pending" ? chalk.yellow("  PENDING") : "") +
        (spent.has(d.nonce) ? chalk.gray("  spent") : "") +
        (!d.txHash ? chalk.gray("  change") : "") +
        chalk.gray(`  ${d.depositedAt.slice(0, 10)}`)
    );
    console.log(
      chalk.gray(`     nonce ${full ? d.nonce : `${d.nonce.slice(0, 16)}…`}`)
    );
  }
  console.log();
  console.log(chalk.cyan("deposited      : ") + `€${formatPeur(deposited)}`);
  console.log(
    chalk.cyan("spendable now  : ") +
      `€${formatPeur(spendable)}` +
      chalk.gray("  (unspent coins this machine can still describe)")
  );
  if (!full) {
    console.log(chalk.gray(`   full nonces: --full, or read ${poolFile()}`));
  }

  const known = new Set(
    deposits.filter((d) => d.ordinal !== null).map((d) => d.ordinal as number)
  );
  if (ledger.coinsReceived > 0n && !known.has(Number(ledger.poolOrdinal))) {
    console.log();
    console.log(
      chalk.yellow(
        `⚠️  The pool is coin #${ledger.poolOrdinal}, which is not a recorded deposit.`
      )
    );
    console.log(
      chalk.yellow(
        "   That is what a claim leaves behind: its three sends return the change to\n" +
          "   the contract as a new coin, whose nonce is derived from the spent one\n" +
          "   rather than published. Recover it with:\n" +
          "   npm run fund -- reconcile --value <pool coin less the benefit, in EUR>"
      )
    );
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log();
    console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
    console.log();
    process.exit(1);
  });
