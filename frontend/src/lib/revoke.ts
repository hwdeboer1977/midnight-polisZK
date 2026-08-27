import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { connectContract, type ProvingMode } from "./submitPayroll";

/**
 * Halting an instance, as the platform.
 *
 * The counterpart to `revoke` in `payroll.compact`, and the same warnings apply
 * here: this is one-way, the employer is not asked, and it blocks paying as well
 * as filing — so an instance revoked while a period is funded and unpaid strands
 * that salary in the contract with no circuit able to release it. The contract's
 * `revoked` comment sets out who bears that.
 *
 * Callable only where the connected wallet is the deploying platform key. The
 * circuit asserts it too; this module does not, because a UI check that the
 * chain does not enforce is decoration, and the chain's is the one that counts.
 */
export async function revokeInstance(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  provingMode?: ProvingMode;
  onProgress?: (step: string) => void;
}): Promise<string> {
  const onProgress = options.onProgress ?? (() => {});
  const { deployed } = await connectContract({
    api: options.api,
    networkId: options.networkId,
    contractAddress: options.contractAddress,
    contractName: "payroll",
    provingMode: options.provingMode ?? "wallet",
    onProgress,
  });

  onProgress("Revoking — proving, a few minutes…");
  const result = await deployed.callTx.revoke();
  return String(result?.public?.txHash ?? result?.txHash ?? "");
}
