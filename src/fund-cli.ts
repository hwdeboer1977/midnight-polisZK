import "dotenv/config";
import chalk from "chalk";
import {
  ContractState,
  ShieldedCoinInfoDescriptor,
  ShieldedCoinRecipientDescriptor,
  runtimeCoinCommitment,
} from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { findDeployedContract, submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import * as fundContract from "../contracts/managed/fund/contract/index.js";
import { EnvironmentManager } from "./utils/environment.js";
import { getDeployment } from "./utils/deployments.js";
import { buildWallet, currentState, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { connect, contractLeaves, loadCompiledContract, managedPath } from "./utils/contract.js";
import { PEUR_DECIMALS, PEUR_SCALE, formatPeur } from "./utils/constructor-args.js";
import { PUBLISHED } from "./utils/benefit-params.js";
import { treasuryEncryptionKeys } from "./utils/treasury.js";
import {
  confirmDeposit,
  evolveChangeNonce,
  freshNonce,
  listDeposits,
  poolFile,
  recordDerived,
  recordPending,
} from "./utils/fund-pool.js";
import path from "path";

/**
 * The fund's operator commands.
 *
 *   npm run fund status
 *   npm run fund -- params --version 1 --cap <EUR/month> --rate <bp> --min-months 12
 *   npm run fund -- deposit --amount <EUR>
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
 * None of the three figures has a default, deliberately. The cap is a policy
 * number from the scheme being modelled — real WW caps a daily wage, and the
 * monthly equivalent has to be derived from a published figure rather than
 * picked here. A plausible-looking constant in this file would be indis-
 * tinguishable from a sourced one the moment it was committed.
 *
 * `deposit` puts money in. Contributions cannot arrive here on their own: a
 * payroll contract cannot call this one, so remitting to the fund is a transfer
 * to a key and then a deliberate transaction by whoever holds it. This is that
 * transaction. `pool` reports what it left behind, which is the only record of
 * the fund's coins that exists anywhere — see `utils/fund-pool.ts`.
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

/**
 * The token benefits are paid in, read off the deployed pEUR contract rather
 * than out of `.env`.
 *
 * The first `fundBenefits` call fixes this colour on the fund forever, so a
 * stale copy in a config file would not cause a failed transaction — it would
 * cause a successful one that pins the wrong token, and the only fix after that
 * is a new fund.
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
        "   CONTRACT_NAME=fund npm run deploy"
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
    console.log(
      chalk.cyan("benefit token       : ") +
        (ledger.benefitTokenSet ? hex(ledger.benefitToken) : chalk.gray("not funded yet"))
    );
    // The chain holds only `persistentHash<BenefitParams>`, so these figures come
    // from utils/benefit-params.ts. A version on chain that is missing there is
    // worth shouting about: no claim under it can be built.
    for (let v = 1; v <= Number(ledger.latestVersion); v += 1) {
      const known = PUBLISHED.find((p) => p.version === v);
      console.log(
        chalk.gray(`   v${v}  `) +
          (known
            ? `cap €${formatPeur(known.maxMonthlyGross)}/mo · ${known.rate / 100}% · ` +
              `${known.minMonths} month(s) · from ${known.validFrom}`
            : chalk.red("figures not recorded locally — no claim under it can be built"))
      );
    }

    const periods = [...ledger.rootFor].map(([p]: [bigint, unknown]) => Number(p));
    console.log(
      chalk.cyan("claim trees         : ") +
        (periods.length ? periods.sort().join(", ") : chalk.gray("none published"))
    );
    console.log(
      chalk.cyan("tax withheld        : ") +
        `€${formatPeur(ledger.taxPool)} held` +
        chalk.gray(`, €${formatPeur(ledger.taxRemitted)} remitted`)
    );
    console.log(
      chalk.cyan("contribution        : ") +
        `€${formatPeur(ledger.socialPool)} held` +
        chalk.gray(`, €${formatPeur(ledger.socialRemitted)} remitted`)
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
          "what the change coin is worth, in EUR. The benefit a claim paid is " +
            "private, so nothing on this machine knows it — the figure has to come " +
            "from the claimant or from your own accounting. It is CHECKED here, " +
            "not trusted: a wrong one reproduces no commitment and is refused"
        )
      )
    );
    return;
  }

  if (command === "remit") {
    const what = requireFlag(args, "what", 'which pool to remit: "tax" or "social"');
    if (what !== "tax" && what !== "social") {
      throw new Error(`--what must be "tax" or "social", not "${what}"`);
    }
    await remit(network, record.contractAddress, what);
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

  if (command !== "params") {
    throw new Error(
      `Unknown command "${command}". Use: status | params | deposit | pool | reconcile | remit`
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
  const validFrom = Number(flag(args, "valid-from") ?? "200001");

  const cap = parseEur(capEur);
  if (rate > 10000) throw new Error("rate cannot exceed 10000 basis points");

  // A version already recorded locally must match, or one of the two is wrong
  // about what was published — and the chain cannot settle it, since it keeps
  // only the hash. Refusing here beats discovering it at someone's claim.
  const recorded = PUBLISHED.find((p) => p.version === version);
  if (
    recorded &&
    (recorded.maxMonthlyGross !== cap ||
      recorded.rate !== rate ||
      recorded.minMonths !== minMonths ||
      recorded.validFrom !== validFrom)
  ) {
    throw new Error(
      `utils/benefit-params.ts already records v${version} with different figures ` +
        `(cap €${formatPeur(recorded.maxMonthlyGross)}, ${recorded.rate}bp, ` +
        `${recorded.minMonths} month(s), from ${recorded.validFrom}). The registry is ` +
        "append-only: publish a new version rather than restating this one."
    );
  }

  console.log(chalk.yellow.bold("Publishing rule set v" + version));
  console.log(chalk.gray(`   cap        €${formatPeur(cap)} per month`));
  console.log(chalk.gray(`   rate       ${rate / 100}% of the capped gross`));
  console.log(chalk.gray(`   eligible   ${minMonths} months`));
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
  } finally {
    await wallet.facade.stop();
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

  if (before.benefitTokenSet) {
    const fixed = hex(before.benefitToken);
    if (fixed !== colourHex) {
      throw new Error(
        `This fund pays in token ${fixed}, but the pEUR deployed on ` +
          `${network.networkId} is ${colourHex}. The fund's token was fixed by its ` +
          "first deposit and cannot be changed — either the wrong pEUR is recorded " +
          "in deployment.json, or this fund belongs to an earlier one."
      );
    }
  } else {
    console.log(
      chalk.yellow.bold("⚠️  This is the first deposit, and it fixes the fund's token.")
    );
    console.log(
      chalk.yellow(
        `   Every benefit this contract ever pays will be in ${colourHex.slice(0, 16)}… ` +
          "(pEUR).\n   The contract has no way to change it afterwards."
      )
    );
    console.log();
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
 * Sends withheld tax or contribution on to the treasury it was destined for.
 *
 * Permissionless in the contract, because the destination is frozen at deploy
 * and cannot be redirected by whoever triggers it — so a platform that stops
 * running cannot strand the money. This runs it with the platform's wallet
 * simply because that is the wallet the CLI has.
 *
 * It spends the pool coin, so the pool moves afterwards and the change has to be
 * reconciled exactly as it does after a claim.
 */
async function remit(
  network: ReturnType<typeof EnvironmentManager.getNetworkConfig>,
  contractAddress: string,
  what: "tax" | "social"
): Promise<void> {
  const ledger = await readLedger(network.indexer, contractAddress);
  if (!ledger) throw new Error("No state on chain");

  const owed: bigint = what === "tax" ? ledger.taxPool : ledger.socialPool;
  if (owed <= 0n) {
    console.log(chalk.gray(`Nothing withheld to remit for ${what}.`));
    console.log();
    return;
  }

  const poolOrdinal = Number(ledger.poolOrdinal);
  const coinRecord = listDeposits(network.networkId, contractAddress).find(
    (d) => d.ordinal === poolOrdinal && d.status === "confirmed"
  );
  if (!coinRecord) {
    throw new Error(
      `The pool is coin #${poolOrdinal}, which is not recorded in ${poolFile()}. ` +
        "Run `npm run fund -- reconcile --value <EUR>` first — without its nonce " +
        "the coin cannot be described to the circuit."
    );
  }
  if (BigInt(coinRecord.value) < owed) {
    throw new Error(
      `The pool coin holds €${formatPeur(BigInt(coinRecord.value))}, less than the ` +
        `€${formatPeur(owed)} withheld. Remit after a deposit, or reconcile first.`
    );
  }

  const provider = indexerPublicDataProvider(network.indexer, network.indexerWS);
  const leaves = await contractLeaves(provider as any, contractAddress);
  const mtIndex = leaves[poolOrdinal];
  if (mtIndex === undefined) {
    throw new Error(`Coin #${poolOrdinal} has no visible leaf — the indexer may be behind.`);
  }

  console.log(
    chalk.yellow.bold(`Remitting €${formatPeur(owed)} of withheld ${what}`)
  );
  console.log(
    chalk.gray(
      `   to ${what === "tax" ? hex(ledger.taxTreasury.bytes) : hex(ledger.socialTreasury.bytes)}`
    )
  );
  console.log(chalk.gray("   encrypted to the treasury's own key, or it could never find the coin"));
  console.log(chalk.gray("   frozen at deploy — this cannot be redirected"));
  console.log();

  // The treasury's ENCRYPTION key, not just its coin key. A shielded coin can
  // only be found by someone whose encryption key the transaction was built
  // with, and the `callTx` shorthand cannot carry that mapping — the same
  // reason `payPeriod` goes through `submitCallTx`. Without it the balancer
  // refuses with "Unable to resolve encryption public key for recipient".
  const encryption = treasuryEncryptionKeys(network.networkId);
  const recipient = what === "tax" ? hex(ledger.taxTreasury.bytes) : hex(ledger.socialTreasury.bytes);
  const encryptionKey = what === "tax" ? encryption.tax : encryption.social;

  const conn = await connect("fund", null);
  try {
    console.log(chalk.blue("Proving (a minute or two)…"));
    const circuit = what === "tax" ? "remitBenefitTax" : "remitBenefitSocial";
    const tx: any = await submitCallTx(conn.providers as any, {
      compiledContract: conn.compiledContract,
      contractAddress: conn.contractAddress,
      circuitId: circuit,
      args: [
        {
          nonce: fromHexBytes(coinRecord.nonce),
          color: fromHexBytes(coinRecord.color),
          value: BigInt(coinRecord.value),
          mt_index: BigInt(mtIndex),
        },
      ],
      additionalCoinEncPublicKeyMappings: new Map([[recipient, encryptionKey]]),
    } as any);
    console.log(chalk.green(`   ✅ ${tx.public?.txHash ?? ""}`));
    console.log();
    console.log(
      chalk.yellow(
        "   The pool coin was spent, so the pool has moved to its change. Recover it:\n" +
          `   npm run fund -- reconcile --value ${formatPeur(BigInt(coinRecord.value) - owed)}`
      )
    );
    console.log();
  } finally {
    await conn.wallet.facade.stop();
  }
}

/**
 * Recovers the change coin a claim left behind.
 *
 * `sendShielded` splits the coin it spends: the benefit goes to the claimant and
 * the remainder comes back to the contract as a NEW coin, whose nonce is derived
 * from the spent one and published nowhere. So after a claim the pool is a coin
 * this machine has no record of, and the money is unreachable until the nonce is
 * rebuilt.
 *
 * The derivation is checked rather than believed. The coin's commitment is
 * public — it sits in the fund's zswap leaves — so a candidate coin can be
 * hashed and compared. Nothing is recorded unless that comparison passes, which
 * turns "probably the right nonce" into "provably the coin at leaf N".
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
  const result = await provider.queryZSwapAndContractState(contractAddress);
  if (!result) throw new Error("The indexer returned no zswap state for this contract");
  const [zswap] = result as any;
  const commitments = [
    ...String(zswap.filter(contractAddress).toString(true)).matchAll(
      /(\d+): \(([0-9a-f]{64}), Some\(ContractAddress/g
    ),
  ].map((m) => ({ leaf: Number(m[1]), commitment: m[2]! }));

  const target = commitments[poolOrdinal];
  if (!target) {
    throw new Error(
      `The contract records coin #${poolOrdinal} as the pool, but only ` +
        `${commitments.length} coin(s) are visible — the indexer may be behind.`
    );
  }

  console.log(chalk.yellow(`Recovering coin #${poolOrdinal} at leaf ${target.leaf}`));
  console.log(chalk.gray(`   assuming it is worth €${formatPeur(changeValue)}`));
  console.log();

  // Every coin this machine knows of is a candidate parent: the change descends
  // from whichever one the claim spent, and nothing public says which.
  for (const parent of known) {
    const nonce = evolveChangeNonce(fromHexBytes(parent.nonce));
    const coin = { nonce, color: fromHexBytes(parent.color), value: changeValue };
    const commitment = hex(
      runtimeCoinCommitment(
        {
          value: ShieldedCoinInfoDescriptor.toValue(coin),
          alignment: ShieldedCoinInfoDescriptor.alignment(),
        } as any,
        {
          value: ShieldedCoinRecipientDescriptor.toValue({
            is_left: false,
            left: { bytes: new Uint8Array(32) },
            right: { bytes: fromHexBytes(contractAddress) },
          }),
          alignment: ShieldedCoinRecipientDescriptor.alignment(),
        } as any
      ).value[0] as Uint8Array
    );

    if (commitment === target.commitment) {
      recordDerived(network.networkId, contractAddress, {
        ...coin,
        ordinal: poolOrdinal,
      });
      console.log(
        chalk.green("   ✅ Verified — its commitment matches the one on chain.")
      );
      console.log(
        chalk.gray(
          `   change of coin #${parent.ordinal} (€${formatPeur(BigInt(parent.value))}), ` +
            `so that claim paid €${formatPeur(BigInt(parent.value) - changeValue)}`
        )
      );
      console.log(chalk.gray(`   recorded in ${poolFile()}`));
      console.log();
      return;
    }
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
  const leaves = await contractLeaves(provider as any, contractAddress);

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

  // A coin is spent when another recorded coin is its change: `sendShielded`
  // derives the change nonce from the input's, so the parent-child link is
  // computable here and does not have to be tracked. Without this the totals
  // would count a spent coin and its own remainder as two.
  const byNonce = new Set(deposits.map((d) => d.nonce));
  const spent = new Set(
    deposits
      .filter((d) =>
        byNonce.has(
          Buffer.from(evolveChangeNonce(fromHexBytes(d.nonce))).toString("hex")
        )
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

    const leaf = d.ordinal !== null ? leaves[d.ordinal] : undefined;
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
        "   That is what a claim leaves behind: `sendShielded` splits the coin it\n" +
          "   spends and returns the change to the contract as a new coin, whose nonce\n" +
          "   is derived from the spent one rather than published. Deriving it is\n" +
          "   `evolveChangeNonce` in utils/fund-pool.ts, which no claim has yet\n" +
          "   exercised — this is the case it exists for."
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
