// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { loadCompiledContract } from "./contract.js";
import { deploymentKey, getDeployment } from "./deployments.js";
import { DUTCH_V1 } from "./tax-params.js";
import { hex, toPublicKey } from "./keys.js";
import { recordRegistration } from "./registry.js";
import { DEFAULT_WINDOW_MONTHS, ruleSetHash, ruleWindow } from "./rule-window.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";

export interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  /**
   * Empty, and kept rather than removed.
   *
   * Onboarding no longer deploys anything, so there is no deploy transaction to
   * report — the contract was deployed once, by `npm run deploy`, possibly
   * months earlier. The field stays so the CLI and the demo server keep
   * compiling and keep their response shape; a caller that renders it gets
   * nothing to render, which is the truth.
   */
  deployTxHash: string;
  assignTxHash: string;
  /** Periods whose rule set this run recorded. Empty when all were already set. */
  periodsRecorded: number[];
}

/**
 * Hands THE payroll contract — the one named by `payroll_address` — to an
 * employer.
 *
 * ── What changed, and why it is not a smaller system ───────────────────────
 *
 * This used to deploy a fresh contract per employer and assign that. It read
 * well and it did not match how the service is run: `payroll_address` names the
 * contract this deployment offers, the UI is pinned to it, and every CLI with no
 * INSTANCE set resolves to it — while onboarding quietly created a different
 * contract that none of those three would ever look at. Two employers onboarded
 * that way produced two contracts nothing pointed to, which is exactly what
 * `hw-test-1` and `hw-test-2` are.
 *
 * The seat is now singular and reusable rather than plural and permanent.
 * `revokeEmployer` vacates it and this fills it again, so rotating employers is
 * revoke-then-onboard rather than deploy-another-contract. Serving several
 * employers at once means several contracts, each its own deployment with its
 * own `payroll_address` — which is a deployment decision, made once, rather than
 * something an onboarding form does silently on someone's behalf.
 *
 * ── The one irreversible thing it still does ───────────────────────────────
 *
 * `setParamsFor` is write-once per period. A period recorded under one employer
 * keeps its rule set when the next employer takes the seat, and that is correct
 * — the rules for March are a fact about March, not about who was filing. So
 * this records only the periods that have none, and says which.
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

  // The base contract, resolved exactly as every other unscoped caller resolves
  // it — no instance, so this is `payroll_address`. Deliberately NOT keyed by
  // slug: the slug names a customer, not a contract, and the two stopped being
  // the same thing when onboarding stopped deploying.
  const key = deploymentKey(network.networkId, "payroll");
  const deployment = getDeployment(network.networkId, "payroll");
  if (!deployment) {
    throw new Error(
      `No payroll contract on ${network.networkId}. Deploy one with ` +
        "`npm run deploy` and put its address in payroll_address."
    );
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

    // Read the seat from the CONTRACT, not from any record of it.
    //
    // The registry database can say a company is inactive while the chain still
    // has them as employer, and `deployment.json` says nothing about ownership
    // at all. `assignEmployer` asserts `!employerAssigned` and would fail here
    // anyway — but it would fail after a proof, with "employer already assigned"
    // and no indication of who holds it or how to free it.
    const ledger = (contractModule as any).ledger(
      await providers.publicDataProvider.queryContractState(contractAddress).then(
        (state: any) => state.data
      )
    );
    if (ledger.employerAssigned) {
      throw new Error(
        `This contract already has an employer (${hex(ledger.employer.bytes)}). ` +
          "Revoke them first — payroll CLI option 7, or the deployer's " +
          "\"Revoke an employer\" card — then onboard again."
      );
    }

    // Before handing it over, open the window of months this contract can file.
    //
    // Platform-only, so it has to happen while the platform still has a reason
    // to act on this instance. Assigning first would work — `setParamsFor` is
    // gated on the platform, not the employer — but doing it after means an
    // employer can be handed a contract that rejects every period they try,
    // with an error about rule sets they have never heard of.
    const hash = await ruleSetHash(network.networkId);
    const window = ruleWindow(new Date(), DEFAULT_WINDOW_MONTHS);

    // Skipped where already recorded, because `setParamsFor` is write-once per
    // period and this contract outlives the employer sitting in it. The second
    // employer to take the seat shares the first one's rule window wherever it
    // overlaps — which is right, since a period's rules are a fact about the
    // period — and would otherwise fail on "that period already has a rule set"
    // partway through, leaving the seat unfilled for a reason that reads like a
    // bug.
    const periodsRecorded: number[] = [];
    const already: number[] = [];
    for (const period of window) {
      if (ledger.paramsHashFor.member(BigInt(period))) {
        already.push(period);
        continue;
      }
      await deployed.callTx.setParamsFor(BigInt(period), hash);
      log(`   ${period} → rule set v${DUTCH_V1.version}`);
      periodsRecorded.push(period);
    }
    if (already.length > 0) {
      log(`   ${already.length} period(s) already had a rule set — left as they were`);
    }

    log("Assigning the employer…");
    const assignTx = await deployed.callTx.assignEmployer(employer);
    log("Assigned — reversible only by the platform, with revokeEmployer");

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
      deployTxHash: "",
      assignTxHash: assignTx.public.txHash,
      periodsRecorded,
    };
  } finally {
    await wallet.facade.stop();
  }
}
