// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { loadCompiledContract } from "./contract.js";
import { deploymentKey, getDeployment } from "./deployments.js";
import { monthsOf, ruleSetHash } from "./rule-window.js";
import { DUTCH_V1 } from "./tax-params.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";

export interface OpenYearResult {
  year: number;
  contractAddress: string;
  /** Months this run opened. Empty when the year was already open. */
  recorded: number[];
  /** Months that already had a rule set, and were left as they were. */
  already: number[];
  /** The transaction, or null when nothing needed doing. */
  txHash: string | null;
}

/**
 * Opens a calendar year on a payroll contract, so its months can be filed.
 *
 * The operator's half of the year boundary. An employer cannot do this — the
 * circuit is platform-gated — and until it is done every month of the new year
 * is refused with "no rule set recorded for that period", which names a registry
 * the employer has never heard of. So it has to be reachable without a terminal.
 *
 * ── Why a year is opened deliberately rather than in advance ────────────────
 *
 * Opening a month decides which schedule it is filed under, and that decision is
 * write-once. Opening 2027 today would permanently bind next year to this year's
 * rates, before anyone has published next year's. So onboarding opens the
 * current year only, and this exists for the moment the next one is decided.
 *
 * Shared by the service route and any CLI that wants it, so both produce
 * identical results — and both skip months already recorded, which the circuit
 * enforces anyway. Running it twice is safe and does nothing the second time.
 */
export async function openYear(
  year: number,
  log: (line: string) => void = () => {},
  instance?: string
): Promise<OpenYearResult> {
  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    throw new Error(`"${year}" is not a year in YYYY form`);
  }

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

  const key = deploymentKey(network.networkId, "payroll", instance);
  const deployment = getDeployment(network.networkId, "payroll", instance);
  if (!deployment) {
    throw new Error(
      `No payroll contract on ${network.networkId}${instance ? ` for "${instance}"` : ""}.`
    );
  }

  log("Building wallet…");
  const wallet = await buildWallet(secret, network);

  try {
    log(wallet.resumed ? "Syncing (resuming from cache)…" : "Syncing…");
    const state = await waitForSync(wallet, log);

    const dust = state.dust.balance(new Date());
    const night = state.unshielded.balances[nativeToken().raw] ?? 0n;
    log(`Platform balance: ${night} tNIGHT, ${dust} tDUST`);
    if (dust === 0n) {
      throw new Error("The platform wallet has no tDUST, so it cannot pay fees");
    }

    const { contractModule, compiledContract } = await loadCompiledContract("payroll");
    const { walletProvider, midnightProvider } = makeWalletProviders(wallet);
    const providers = MidnightProviders.create({
      contractName: "payroll",
      walletProvider,
      midnightProvider,
      networkConfig: network,
      accountId: wallet.unshieldedAddress,
      privateStateStoreName: `${key.replace(/[/:]/g, "-")}-state`,
    });

    const contractAddress = deployment.contractAddress;
    log(`Using the payroll contract at ${contractAddress}`);
    const deployed: any = await findDeployedContract(providers as any, {
      compiledContract: compiledContract as any,
      contractAddress,
    });

    // Read what is already there before proving anything. The circuit skips
    // recorded months on its own, so this changes no outcome — it decides
    // whether to spend a proof at all, and lets the answer say which months
    // were left alone rather than reporting twelve as though all were new.
    const ledger = (contractModule as any).ledger(
      await providers.publicDataProvider
        .queryContractState(contractAddress)
        .then((chain: any) => chain.data)
    );
    const months = monthsOf(year);
    const already = months.filter((period) => ledger.paramsHashFor.member(BigInt(period)));
    const recorded = months.filter((period) => !already.includes(period));

    if (recorded.length === 0) {
      log(`${year} is already open — nothing to do`);
      return { year, contractAddress, recorded: [], already, txHash: null };
    }

    const hash = await ruleSetHash(network.networkId);
    log(`Opening ${year} — ${recorded.length} month(s), rule set v${DUTCH_V1.version}`);
    const tx = await deployed.callTx.setParamsFor(BigInt(year), 1n, 12n, hash);
    const txHash = String(tx.public.txHash);
    log(`${year} is open — tx ${txHash}`);
    if (already.length > 0) {
      log(`${already.length} month(s) already had a rule set — left as they were`);
    }

    return { year, contractAddress, recorded, already, txHash };
  } finally {
    await wallet.facade.stop();
  }
}
