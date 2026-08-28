import "dotenv/config";
import crypto from "crypto";
import { createUnprovenCallTx, submitTx } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { MidnightProviders } from "./dist/providers/midnight-providers.js";
import { EnvironmentManager } from "./dist/utils/environment.js";
import { loadCompiledContract } from "./dist/utils/contract.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./dist/utils/wallet.js";

const hexToBytes = (h) => { const c=h.replace(/^0x/,""); const o=new Uint8Array(c.length/2); for(let i=0;i<o.length;i++)o[i]=parseInt(c.slice(i*2,i*2+2),16); return o; };
const net = EnvironmentManager.getNetworkConfig();
setNetworkId(net.networkId);
const w = await buildWallet(EnvironmentManager.getWalletSecret(), net);
await waitForSync(w, () => {});
const { compiledContract } = await loadCompiledContract("relaypair");
const { walletProvider, midnightProvider } = makeWalletProviders(w);
const p = MidnightProviders.create({
  contractName: "relaypair", walletProvider, midnightProvider,
  networkConfig: net, accountId: w.unshieldedAddress, privateStateStoreName: "fundtest-state",
});
const addrS = "12f3e499843eccfb35eba325244b362c97a19073e0d7416b7260975d0e5d83ce";
const color = hexToBytes(process.env.peur_token_id);
const AMOUNT = 1000000n;
const call = await createUnprovenCallTx(p, {
  compiledContract, contractAddress: addrS, circuitId: "fund",
  args: [AMOUNT, { nonce: new Uint8Array(crypto.randomBytes(32)), color, value: AMOUNT }],
});
console.log("MARK local circuit run: OK");
try {
  await submitTx(p, { unprovenTx: call.private.unprovenTx });
  console.log("MARK RESULT: fund accepted");
} catch (e) {
  console.log("MARK RESULT: fund refused");
  console.log("MARK message:", String(e?.message ?? e).slice(0, 400));
  let c = e?.cause; let depth = 0;
  while (c && depth++ < 5) { console.log(`MARK cause[${depth}]:`, String(c?.message ?? c).slice(0, 400)); c = c?.cause; }
}
await w.facade.stop();
process.exit(0);
