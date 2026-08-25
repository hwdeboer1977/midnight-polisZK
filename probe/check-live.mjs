/**
 * The chain half of `checkPayslip`, against the real deployed contract.
 *
 * `lib/checkPayslip.ts` cannot be imported here — it reaches for `./chain` and
 * `./contracts`, which Node will not resolve without extensions — so this walks
 * the same steps with the same modules: fetch state, decode, read the three
 * public inputs a commitment binds, and verify. What it proves is that those
 * inputs are actually readable off a live instance, which is the assumption the
 * new no-wallet path rests on.
 *
 * A genuine payslip cannot be built here: the nonce comes from the employer's
 * passphrase. So the positive case belongs to the browser test, and what runs
 * here is the negative one — a fabricated payslip for a real slot must fail.
 */
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import { buildPayslip, fromHex, verifyPayslip } from "../frontend/src/lib/payslip.ts";
import { readFileSync } from "fs";

const INDEXER = "https://indexer.preview.midnight.network/api/v4/graphql";
const Q = `query C($address: HexEncoded!){contractAction(address:$address){__typename ... on ContractDeploy{state} ... on ContractCall{state} ... on ContractUpdate{state}}}`;
const hex = (b) => Buffer.from(b).toString("hex");

const rec = JSON.parse(readFileSync("deployment.json", "utf8"))[
  "preview/payroll:blockstat-solutions-v5"
];
const address = rec.contractAddress;

const res = await fetch(INDEXER, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: Q, variables: { address } }),
});
const body = await res.json();
const l = payroll.ledger(ContractState.deserialize(Buffer.from(body.data.contractAction.state, "hex")).data);

const PERIOD = 202610n;
const SLOT = 0n;

const commitment = hex(l.commitmentsFor.lookup(PERIOD).lookup(SLOT));
const anchor = {
  employer: l.employer.bytes,
  paramsHash: l.paramsHashFor.lookup(PERIOD),
  commitment,
};

console.log("\nlive instance", address.slice(0, 12) + "…");
console.log("  employer   :", hex(anchor.employer).slice(0, 24) + "…");
console.log("  paramsHash :", hex(anchor.paramsHash).slice(0, 24) + "…");
console.log("  commitment :", commitment.slice(0, 24) + "…");
console.log("  paid       :", l.paidFor.lookup(PERIOD).lookup(SLOT));
console.log("  funded     :", l.fundedFor.lookup(PERIOD).lookup(SLOT));

// A payslip with the right shape and the right slot, but a nonce nobody filed.
const forged = buildPayslip({
  contractAddress: address,
  period: Number(PERIOD),
  slot: Number(SLOT),
  employee: "Anna de Vries",
  line: {
    grossMinor: 220_000_000n,
    taxMinor: 78_650_000n,
    socialMinor: 6_600_000n,
    netMinor: 134_750_000n,
    weeks: 4,
  },
  nonce: fromHex("00".repeat(32)),
});

const ok = verifyPayslip(payroll.pureCircuits, forged, anchor);
console.log("\nfabricated payslip verifies:", ok, ok ? "  ← WRONG" : "  ← correctly refused");
process.exit(ok ? 1 : 0);
