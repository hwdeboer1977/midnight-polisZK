// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import * as payrollContract from "../contracts/managed/payroll/contract/index.js";
import { EnvironmentManager } from "./utils/environment.js";
import { getDeployment } from "./utils/deployments.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./utils/wallet.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { loadCompiledContract } from "./utils/contract.js";
import { deriveEmployerKey, deriveTerminationNonce } from "./utils/payroll-openings.js";
import { periodName } from "./utils/roster.js";

/**
 * Ending someone's employment, as a statement the employer signs and cannot spend.
 *
 * This is the one fact a claim needs that payroll does not already publish. A
 * period simply stops appearing when someone leaves, and "stopped appearing" is
 * not a statement anybody made — it is indistinguishable from a month not yet
 * filed. So the employer says it, once, on chain.
 *
 * What goes on chain is a commitment, not the facts. Months worked published per
 * slot would be a tenure record for a worker; a claim-key hash published per slot
 * would be a stable handle that appears identically at every employer that person
 * uses it with, rebuilding the cross-employer linkage `payeeFor` gives up
 * convenience to prevent. The opening goes to the relay in a file, the way a
 * payslip goes to the employee.
 *
 * The employer cannot claim on it. `claim` requires the payee's own wallet key,
 * which `payeeFor` binds and no employer holds.
 *
 *   read -s -p "passphrase: " P && export PAYROLL_PASSPHRASE=$P
 *   npm run terminate -- <instance> <period> <slot> --payee <hex>
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

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const fromHex = (s: string) => Uint8Array.from(Buffer.from(s.replace(/^0x/, ""), "hex"));

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  const [instance, periodArg, slotArg] = positional;

  if (!instance || !periodArg || slotArg === undefined) {
    throw new Error(
      "Usage: npm run terminate -- <instance> <period> <slot> --payee <hex>"
    );
  }
  const period = Number(periodArg);
  const slot = Number(slotArg);

  const payee = flag(args, "payee");
  if (!payee || !/^[0-9a-f]{64}$/i.test(payee)) {
    throw new Error("--payee must be the employee's coin public key, 64 hex characters");
  }

  const passphrase = process.env.PAYROLL_PASSPHRASE;
  if (!passphrase) {
    throw new Error(
      "Set PAYROLL_PASSPHRASE — the attestation's nonce is derived from it, so the\n" +
        "   opening can be rebuilt later:\n" +
        '   read -s -p "passphrase: " P && export PAYROLL_PASSPHRASE=$P'
    );
  }

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, "payroll", instance);
  if (!record) throw new Error(`No payroll:${instance} deployed on ${network.networkId}`);

  console.log();
  console.log(chalk.blue.bold("🌙  IncomeLayerZK — end of employment"));
  console.log(chalk.gray(`   payroll:${instance} on ${network.name}`));
  console.log();

  const response = await fetch(network.indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: CONTRACT_STATE_QUERY,
      variables: { address: record.contractAddress },
    }),
  });
  const body: any = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  const ledger = (payrollContract as any).ledger(
    ContractState.deserialize(Buffer.from(body.data.contractAction.state, "hex")).data
  );

  const p = BigInt(period);
  const i = BigInt(slot);
  if (!ledger.commitmentsFor.member(p) || !ledger.commitmentsFor.lookup(p).member(i)) {
    throw new Error(`payroll:${instance} has no employee ${slot + 1} in ${periodName(period)}`);
  }
  if (ledger.terminationFor.member(p) && ledger.terminationFor.lookup(p).member(i)) {
    throw new Error(
      `Employment has already been ended for employee ${slot + 1} in ${periodName(period)}.\n` +
        "   A termination is write-once: an employer who could restate it could\n" +
        "   revise the final month after seeing what it entitled someone to."
    );
  }

  // Counted from the chain, not typed in. Every period whose payee binding
  // reproduces from this employee's key is a month they were on this payroll —
  // which the employer can compute because they hold the roster, and nobody
  // else can, because `payeeFor` publishes only the hash.
  //
  // Still attested rather than derived, in the end: the fund cannot read this
  // ledger, so it takes the employer's word for the number. But the number is
  // now the chain's, and anyone can check it afterwards against the same public
  // state.
  const instanceBytes = fromHex(record.contractAddress);
  const payeeBytes = fromHex(payee);
  let monthsWorked = 0;
  const matched: number[] = [];
  for (const filed of [...ledger.periods] as bigint[]) {
    if (!ledger.payeeFor.member(filed)) continue;
    const payees = ledger.payeeFor.lookup(filed);
    for (const [index, binding] of payees as Iterable<[bigint, Uint8Array]>) {
      const expected = (payrollContract as any).pureCircuits.payeeHash(
        { bytes: payeeBytes },
        filed,
        instanceBytes
      );
      if (hex(binding) === hex(expected)) {
        monthsWorked += 1;
        matched.push(Number(filed));
        break;
      }
      void index;
    }
  }
  matched.sort((a, b) => a - b);

  const override = flag(args, "months");
  const months = override ? Number(override) : monthsWorked;

  console.log(chalk.cyan("months on this payroll: ") + chalk.white(String(monthsWorked)));
  console.log(chalk.gray(`   ${matched.map(periodName).join(", ") || "(none)"}`));
  if (override) {
    console.log(chalk.yellow(`   overridden to ${months} by --months`));
  }
  if (months === 0) {
    throw new Error(
      "No period on this contract names that key. Check the coin public key against\n" +
        "   the roster — a wrong one produces a different hash and matches nothing."
    );
  }
  console.log();

  const employerKey = deriveEmployerKey(passphrase, record.contractAddress);
  const nonce = deriveTerminationNonce(employerKey, period, slot);
  const attestation = (payrollContract as any).pureCircuits.terminationCommitment(
    BigInt(period),
    BigInt(months),
    nonce
  );

  console.log(chalk.gray(`attestation ${hex(attestation)}`));
  console.log();

  const wallet = await buildWallet(EnvironmentManager.getWalletSecret(), network);
  try {
    console.log(chalk.gray("Syncing…"));
    await waitForSync(wallet, (l) => console.log(chalk.gray(`   ${l}`)));

    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: "payroll",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
    });
    const compiled = await loadCompiledContract("payroll");
    const deployed: any = await findDeployedContract(providers as any, {
      contractAddress: record.contractAddress,
      compiledContract: compiled.compiledContract as any,
    } as any);

    console.log(chalk.blue("Proving and submitting (a few minutes)…"));
    const tx = await deployed.callTx.endEmployment(BigInt(period), BigInt(slot), attestation);
    console.log(chalk.green(`   ✅ ${tx.public?.txHash ?? ""}`));
  } finally {
    await wallet.facade.stop();
  }

  // The opening, for the relay. Written only after the call succeeded: an
  // opening for an attestation that never landed would build a leaf the fund
  // could never check.
  const dir = path.join(process.cwd(), "terminations");
  fs.mkdirSync(dir, { recursive: true });
  // Prefixed to match the browser, which writes the same artefact. No name
  // here: the CLI works from coin public keys and never sees the roster.
  const file = path.join(
    dir,
    `termination-opening-${instance}-${period}-slot-${slot + 1}.json`
  );
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        instance,
        slot,
        finalPeriod: period,
        monthsWorked: months,
        nonce: hex(nonce),
      },
      null,
      2
    )
  );
  console.log(chalk.gray(`   wrote ${path.relative(process.cwd(), file)}`));
  console.log();
  console.log(chalk.gray("Next: npm run relay -- " + period + " --publish"));
  console.log();
}

main().catch((error) => {
  console.log();
  console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
  console.log();
  process.exit(1);
});
