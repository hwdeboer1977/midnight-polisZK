/**
 * Rebuilds a payslip for a period that is ALREADY filed.
 *
 * No new filing, no transaction, no proof server. The opening is on chain
 * already — `setPayroll` sealed it into `sealedFor` under a key derived from
 * the employer's passphrase — so recovering a payslip is a decryption, not a
 * re-run. That makes it both the cheapest way to test the verify path against
 * real state, and the answer for every period filed before the payslip export
 * existed.
 *
 * The passphrase comes from the environment rather than an argument, so it
 * stays out of shell history and out of the process list:
 *
 *   read -s -p "passphrase: " PAYROLL_PASSPHRASE && export PAYROLL_PASSPHRASE
 *   node probe/payslip-from-chain.mjs <instance> <period> [slot]
 */
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import { deriveEmployerKey, isSealed, openSealed } from "../dist/utils/payroll-openings.js";
import { buildPayslip, encodePayslip, verifyPayslip } from "../frontend/src/lib/payslip.ts";
import { readFileSync, writeFileSync } from "fs";

const INDEXER = "https://indexer.preview.midnight.network/api/v4/graphql";
const Q = `query C($address: HexEncoded!){contractAction(address:$address){__typename ... on ContractDeploy{state} ... on ContractCall{state} ... on ContractUpdate{state}}}`;
const hex = (b) => Buffer.from(b).toString("hex");
const eur = (v) => `€${(Number(v) / 1e6).toFixed(2)}`;

const passphrase = process.env.PAYROLL_PASSPHRASE;
if (!passphrase) throw new Error("Set PAYROLL_PASSPHRASE (see the header of this file)");

const [instance = "blockstat-solutions-v5", periodArg = "202610", slotArg] = process.argv.slice(2);
const period = Number(periodArg);

const rec = JSON.parse(readFileSync("deployment.json", "utf8"))[`preview/payroll:${instance}`];
if (!rec) throw new Error(`No preview deployment named payroll:${instance}`);

const res = await fetch(INDEXER, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: Q, variables: { address: rec.contractAddress } }),
});
const body = await res.json();
if (body.errors?.length) throw new Error(body.errors[0].message);
const l = payroll.ledger(
  ContractState.deserialize(Buffer.from(body.data.contractAction.state, "hex")).data
);

const p = BigInt(period);
if (!l.commitmentsFor.member(p)) throw new Error(`Period ${period} is not filed on that instance`);

console.log(`\nDeriving the employer key (PBKDF2, deliberately slow)…`);
const employerKey = deriveEmployerKey(passphrase, rec.contractAddress);

const count = Number(l.employeeCountFor.lookup(p));
const slots = slotArg !== undefined ? [Number(slotArg)] : [...Array(count).keys()];

let failures = 0;
for (const slot of slots) {
  const k = BigInt(slot);
  const sealed = l.sealedFor.lookup(p).lookup(k);
  if (!isSealed(sealed)) {
    console.log(`\nslot ${slot}: no sealed opening — filed before sealing existed`);
    failures += 1;
    continue;
  }

  let line;
  try {
    line = openSealed(employerKey, sealed);
  } catch {
    console.error(
      `\nslot ${slot}: the passphrase does not open this period's openings.\n` +
        "   Either it is the wrong one, or this instance was filed with another."
    );
    process.exit(1);
  }

  const slip = buildPayslip({
    contractAddress: rec.contractAddress,
    period,
    slot,
    line,
    nonce: line.nonce,
  });

  const ok = verifyPayslip(payroll.pureCircuits, slip, {
    employer: l.employer.bytes,
    paramsHash: l.paramsHashFor.lookup(p),
    commitment: hex(l.commitmentsFor.lookup(p).lookup(k)),
  });
  if (!ok) failures += 1;

  const paid = l.paidFor.lookup(p).lookup(k);
  console.log(`\nslot ${slot}  ${ok ? "✓ opens the commitment on chain" : "✗ DOES NOT VERIFY"}`);
  console.log(`   gross ${eur(line.grossMinor)}   tax ${eur(line.taxMinor)}   social ${eur(line.socialMinor)}`);
  console.log(`   net   ${eur(line.netMinor)}   weeks ${line.weeks}   ${paid ? "paid" : "not paid"}`);

  const file = `payslip-${period}-slot-${slot + 1}.json`;
  writeFileSync(file, JSON.stringify(slip, null, 2));
  console.log(`   written to ${file}`);
  console.log(`   link: http://localhost:5173/employee#payslip=${encodePayslip(slip)}`);
}

console.log();
process.exit(failures > 0 ? 1 : 0);
