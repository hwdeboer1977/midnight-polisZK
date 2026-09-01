import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { createHash } from "crypto";
import { readFileSync } from "fs";
const I="https://indexer.preview.midnight.network/api/v4/graphql";
const Q=`query C($address: HexEncoded!){contractAction(address:$address){__typename ... on ContractDeploy{state} ... on ContractCall{state} ... on ContractUpdate{state}}}`;
const addr=process.argv[2];
const r=await fetch(I,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:Q,variables:{address:addr}})});
const j=await r.json();
if(!j.data?.contractAction?.state){console.log("no state for",addr);process.exit(0);}
const st=ContractState.deserialize(Buffer.from(j.data.contractAction.state,"hex"));
const sha=(b)=>createHash("sha256").update(Buffer.from(b)).digest("hex").slice(0,12);
console.log("contract", addr, "\n");
console.log("operation".padEnd(18), "on-chain VK".padEnd(14), "local file".padEnd(14), "verdict");
for (const op of [...st.operations()].map(String).sort()) {
  const vk = st.operation(op).verifierKey;
  const a = sha(vk);
  let b="(no local file)", verdict="";
  try { b = sha(readFileSync(`contracts/managed/payroll/keys/${op}.verifier`)); verdict = a===b?"MATCH":"MISMATCH"; }
  catch { verdict="no local key"; }
  console.log(op.padEnd(18), a.padEnd(14), b.padEnd(14), verdict);
}
