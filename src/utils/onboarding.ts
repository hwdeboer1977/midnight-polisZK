import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { loadCompiledContract } from "./contract.js";
import { deploymentKey, getDeployment, saveDeployment } from "./deployments.js";
import { hex, toPublicKey } from "./keys.js";
import { recordRegistration } from "./registry.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";

export interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  deployTxHash: string;
  assignTxHash: string;
}

/**
 * Deploys a payroll contract and hands it to one employer.
 *
 * Two transactions, because assignment is a circuit call and cannot run in a
 * constructor. Doing both here closes the window in which an instance exists
 * with no owner and could be claimed by the wrong key.
 *
 * Shared by the CLI and the demo onboarding service so both produce identical
 * results — an employer onboarded through the browser is not a second-class one.
 */
export async function onboardEmployer(
  instance: string,
  employerKey: string,
  log: (line: string) => void = () => {},
  /** Display name for the registry. Falls back to the slug when not given. */
  companyName?: string
): Promise<OnboardResult> {
  const slug = instance.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,38}$/.test(slug)) {
    throw new Error(
      "Instance must be lowercase letters, digits and dashes (max 39 characters)"
    );
  }

  const employer = toPublicKey(employerKey);

  EnvironmentManager.validateEnvironment();
  const network = EnvironmentManager.getNetworkConfig();
  const secret = EnvironmentManager.getWalletSecret();
  setNetworkId(network.networkId);

  const runtime = EnvironmentManager.checkRuntimeVersion("payroll");
  if (!runtime.ok) {
    throw new Error(
      `contracts/managed was compiled for compact-runtime ${runtime.compiled}, ` +
        `but ${runtime.installed} is installed — run: npm run reset`
    );
  }

  const key = deploymentKey(network.networkId, "payroll", slug);
  if (getDeployment(network.networkId, "payroll", slug)) {
    throw new Error(`"${key}" already exists — pick a different company name`);
  }

  log("Building wallet…");
  const wallet = await buildWallet(secret, network);

  try {
    log(wallet.resumed ? "Syncing (resuming from cache)…" : "Syncing…");
    const state = await waitForSync(wallet, log);

    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());
    log(`Platform balance: ${night} tNIGHT, ${dust} tDUST`);
    if (dust === 0n) {
      throw new Error("The platform wallet has no tDUST, so it cannot pay fees");
    }

    const { compiledContract } = await loadCompiledContract("payroll");
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: "payroll",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: `${key.replace(/[/:]/g, "-")}-state`,
    });

    log("Deploying the payroll contract…");
    const deployed = await deployContract(providers as any, {
      compiledContract: compiledContract as any,
    });
    const contractAddress = deployed.deployTxData.public.contractAddress;
    log(`Deployed at ${contractAddress}`);

    saveDeployment({
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: network.name,
      networkId: network.networkId,
      contractName: "payroll",
      instance: slug,
    });

    log("Assigning the employer…");
    const assignTx = await deployed.callTx.assignEmployer(employer);
    log("Assigned — this cannot be undone");

    // Bookkeeping, deliberately after the chain work and deliberately not fatal.
    // The contract is deployed and assigned by this point, and both are
    // irreversible; turning a completed onboarding into a failure because a
    // database was down would be a lie about what happened. The warning is loud
    // so a missing row gets noticed now rather than found later.
    try {
      const registration = await recordRegistration({
        companyName: companyName?.trim() || slug,
        instance: slug,
        networkId: network.networkId,
        contractAddress,
        employerKey: hex(employer.bytes),
      });
      log(
        `Registered until ${registration.expiresAt.toISOString().slice(0, 10)} ` +
          `(${registration.termMonths} months)`
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      log(`⚠️  Could not record the registration: ${message}`);
      log("   The contract is live regardless — start the database with `npm run db:up`");
    }

    return {
      instance: slug,
      key,
      contractAddress,
      deployTxHash: deployed.deployTxData.public.txHash,
      assignTxHash: assignTx.public.txHash,
    };
  } finally {
    await wallet.facade.stop();
  }
}
