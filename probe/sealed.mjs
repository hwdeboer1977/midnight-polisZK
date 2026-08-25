import { ContractState } from "@midnight-ntwrk/compact-runtime";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import { readFileSync } from "fs";
const INDEXER = "https://indexer.preview.midnight.network/api/v4/graphql";
const Q = `query C($address: HexEncoded!){contractAction(address:$address){__typename ... on ContractDeploy{state} ... on ContractCall{state} ... on ContractUpdate{state}}}`;
const rec = JSON.parse(readFileSync("deployment.json","utf8"))["preview/payroll:blockstat-solutions-v5"];
const r = await fetch(INDEXER,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:Q,variables:{address:rec.contractAddress}})});
const l = payroll.ledger(ContractState.deserialize(Buffer.from((await r.json()).data.contractAction.state,"hex")).data);
for (const p of [...l.periods].sort((a,b)=>Number(a-b))) {
  const n = Number(l.employeeCountFor.lookup(p));
  const marks = [];
  for (let i=0;i<n;i++) {
    const b = l.sealedFor.lookup(p).lookup(BigInt(i));
    marks.push(b.some(x=>x!==0) ? `slot ${i+1}: sealed (${b.length}B)` : `slot ${i+1}: EMPTY`);
  }
  console.log(`${p}  ${marks.join("   ")}`);
}
