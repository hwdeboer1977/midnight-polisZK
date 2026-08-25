import { ContractState } from "@midnight-ntwrk/compact-runtime";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import { readFileSync } from "fs";

const INDEXER = "https://indexer.preview.midnight.network/api/v4/graphql";
const Q = `query C($address: HexEncoded!){contractAction(address:$address){__typename ... on ContractDeploy{state} ... on ContractCall{state} ... on ContractUpdate{state}}}`;
const hex = (b) => Buffer.from(b).toString("hex");

async function state(address) {
  const r = await fetch(INDEXER, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: Q, variables: { address } }),
  });
  const b = await r.json();
  if (b.errors?.length) throw new Error(b.errors[0].message);
  const s = b.data?.contractAction?.state;
  if (!s) return null;
  return ContractState.deserialize(Buffer.from(s, "hex")).data;
}

const deployments = JSON.parse(readFileSync("deployment.json", "utf8"));
for (const [key, rec] of Object.entries(deployments)) {
  if (rec.networkId !== "preview" || rec.contractName !== "payroll") continue;
  process.stdout.write(`\n${key}\n  ${rec.contractAddress}\n`);
  let l;
  try {
    l = payroll.ledger(await state(rec.contractAddress));
    void l.employerAssigned;
  } catch (e) {
    console.log("  UNREADABLE:", e.message.split("\n")[0]);
    continue;
  }
  console.log("  employer assigned:", l.employerAssigned);
  console.log("  employer key     :", hex(l.employer.bytes));
  console.log("  platform key     :", hex(l.platform.bytes));
  const periods = [...l.periods].sort((a, b) => Number(a - b));
  console.log("  periods filed    :", periods.join(", ") || "(none)");
  for (const p of periods) {
    const count = l.employeeCountFor.member(p) ? Number(l.employeeCountFor.lookup(p)) : 0;
    let paid = 0, funded = 0;
    for (let i = 0; i < count; i++) {
      const k = BigInt(i);
      if (l.paidFor.member(p) && l.paidFor.lookup(p).member(k) && l.paidFor.lookup(p).lookup(k)) paid++;
      if (l.fundedFor.member(p) && l.fundedFor.lookup(p).member(k) && l.fundedFor.lookup(p).lookup(k)) funded++;
    }
    console.log(`    ${p}: ${count} slots, ${funded} funded, ${paid} paid, paramsHash ${l.paramsHashFor.member(p) ? hex(l.paramsHashFor.lookup(p)).slice(0,16)+"…" : "MISSING"}`);
  }
}

// Which future periods already have a rule set recorded — a filing needs one,
// and only the platform can add it.
{
  const rec = JSON.parse(readFileSync("deployment.json","utf8"))["preview/payroll:blockstat-solutions-v6"];
  const l = payroll.ledger(await state(rec.contractAddress));
  const ready = [];
  for (let p = 202601; p <= 202712; p++) {
    if (p % 100 > 12 || p % 100 === 0) continue;
    if (l.paramsHashFor.member(BigInt(p))) ready.push(p);
  }
  console.log("\nv5 periods with a rule set recorded:", ready.join(", ") || "(none)");
  console.log("v5 periods already filed          :", [...l.periods].join(", "));
}

{
  const rec = JSON.parse(readFileSync("deployment.json","utf8"))["preview/payroll:blockstat-solutions-v6"];
  const l = payroll.ledger(await state(rec.contractAddress));
  const h = (p) => hex(l.paramsHashFor.lookup(BigInt(p)));
  console.log("\nparamsHash 202610:", h(202610));
  console.log("paramsHash 202611:", h(202611));
  console.log("identical:", h(202610) === h(202611));
}

{
  const all = JSON.parse(readFileSync("deployment.json","utf8"));
  for (const [key, rec] of Object.entries(all)) {
    if (rec.networkId !== "preview" || rec.contractName !== "payroll") continue;
    let l; try { l = payroll.ledger(await state(rec.contractAddress)); void l.employerAssigned; } catch { continue; }
    const ready = [];
    for (let p = 202601; p <= 202712; p++) {
      const m = p % 100; if (m < 1 || m > 12) continue;
      if (l.paramsHashFor.member(BigInt(p))) ready.push(p);
    }
    console.log(`\n${key}`);
    console.log(`  employer  ${hex(l.employer.bytes).slice(0,16)}…  assigned=${l.employerAssigned}`);
    console.log(`  rule sets ${ready.join(", ") || "(none)"}`);
    console.log(`  filed     ${[...l.periods].join(", ") || "(none)"}`);
  }
}
