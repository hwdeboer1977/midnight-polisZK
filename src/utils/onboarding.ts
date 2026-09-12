// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger-v8";
import { MidnightProviders } from "../providers/midnight-providers.js";
import { EnvironmentManager } from "./environment.js";
import { loadCompiledContract } from "./contract.js";
import {
  deploymentKey,
  getDeployment,
  listDeployments,
  saveDeployment,
} from "./deployments.js";
import { DUTCH_V1 } from "./tax-params.js";
import { hex, toPublicKey } from "./keys.js";
import { deployToken, treasuryKeys } from "./treasury.js";
import { recordRegistration } from "./registry.js";
import { filingYear, monthsOf, ruleSetHash } from "./rule-window.js";
import { buildWallet, makeWalletProviders, waitForSync } from "./wallet.js";

export interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  /**
   * The transaction that created this employer's payroll contract.
   *
   * Populated again. It was empty for as long as onboarding assigned a
   * pre-existing contract instead of deploying one, and callers that render it
   * got a blank — truthfully, since no deploy had happened.
   */
  deployTxHash: string;
  assignTxHash: string;
  /** Periods whose rule set this run recorded. Empty when all were already set. */
  periodsRecorded: number[];
}

/**
 * Deploys a payroll contract for an employer and hands it to them.
 *
 * ── Why this deploys again ─────────────────────────────────────────────────
 *
 * It used to, then it stopped, and now it does again — so the reasoning behind
 * both turns is worth keeping, because each fixed something real.
 *
 * Deploying per employer was removed because `payroll_address` named the one
 * contract the deployment offered, the browser was pinned to it by a build-time
 * address list, and every CLI with no INSTANCE resolved to it — while onboarding
 * quietly created a DIFFERENT contract that none of those three would ever look
 * at. `hw-test-1` and `hw-test-2` are those orphans: real contracts, really
 * assigned, that nothing in the product could see.
 *
 * The replacement — one contract with one reusable seat — fixed the orphans by
 * removing the product. A payroll service that can hold one employer at a time,
 * where onboarding a second means revoking the first, is not a service. The
 * second employer got `assignEmployer`'s "employer already assigned" and a
 * suggestion to evict the first one.
 *
 * So the orphan bug is fixed where it actually lived: in how contracts are
 * FOUND, not in whether they are created. A deploy stamps `contractVersion`,
 * `read()` drops records this build cannot transact with, and the browser now
 * filters on that same fingerprint instead of on a hardcoded address list. A
 * contract deployed for an employer thirty seconds ago is therefore visible to
 * the browser on their next page load, which is what was missing in the first
 * place.
 *
 * `payroll_address` keeps its job — the default contract for an unscoped CLI —
 * and loses the one it should never have had, being the only contract allowed
 * to exist.
 *
 * ── The irreversible things it does ────────────────────────────────────────
 *
 * A deploy spends real fees, and `assignEmployer` is one-way — only
 * `revokeEmployer` undoes it, and only the platform may call that. Both are
 * preceded by every check that can be made cheaply, in particular the scan for
 * a contract this key already holds: onboarding twice would otherwise leave one
 * employer owning two contracts, with their filings split across the pair. That
 * is the failure this guard exists for, and it asks the chain rather than a
 * file, so an employer who was legitimately revoked can onboard again.
 *
 * Recording a period's rule set is write-once, but on a contract deployed
 * seconds ago there is nothing to preserve — the year is opened fresh here.
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

  // Keyed by slug: one customer, one contract, `preview/payroll:acme`.
  const key = deploymentKey(network.networkId, "payroll", slug);
  const existing = getDeployment(network.networkId, "payroll", slug);
  if (existing) {
    throw new Error(
      `"${slug}" already has a payroll contract (${existing.contractAddress}). ` +
        "Registering it again would deploy a second one and split that company's " +
        "salaries across the two. Choose a different company name, or connect the " +
        "signing key that already holds this one."
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

    // Does this key already hold a payroll contract?
    //
    // Asked of the CHAIN, not of a file. The registry database can say a company
    // is inactive while the contract still names them, and `deployment.json`
    // records that a contract exists without saying whose it is. An earlier
    // version of this guard kept a list of keys that had ever onboarded, which
    // was wrong in the direction that matters: an employer legitimately REVOKED
    // was refused by a stale file rather than admitted by the chain.
    //
    // Without it, a second registration by the same key leaves one employer
    // owning two contracts, their filings split across the pair with no way to
    // merge them. That is the failure per-employer deploys are prone to, and the
    // reason it is checked before anything is spent.
    //
    // Only contracts THIS build can read are scanned. One it cannot decode is
    // one it could not have transacted with either, so it cannot be a contract
    // this employer is using — `read()` has already dropped those, and the
    // decode below covers any it could not fingerprint.
    log("Checking whether this signing key already has a contract…");
    for (const [name, record] of listDeployments()) {
      if (record.contractName !== "payroll" || record.networkId !== network.networkId) continue;
      if (record.retired) continue;
      const state = await providers.publicDataProvider
        .queryContractState(record.contractAddress)
        .catch(() => null);
      if (!state) continue;
      let held: any;
      try {
        held = (contractModule as any).ledger(state.data);
      } catch {
        // An instance from contract source this build cannot decode. It is not
        // one this employer could be filing on either — see above.
        continue;
      }
      if (held.employerAssigned && hex(held.employer.bytes) === hex(employer.bytes)) {
        throw new Error(
          `That signing key already holds a payroll contract (${name} at ` +
            `${record.contractAddress}). One key, one contract — a second would ` +
            "split your salaries across the two. To move to a fresh contract, " +
            "revoke the key from that one first: payroll CLI option 7, or the " +
            "deployer's \"Revoke an employer\" card."
        );
      }
    }

    // Deploy this employer's own contract.
    //
    // The three constructor arguments are frozen for the life of the contract:
    // where withheld tax goes, where the social contribution goes, and which
    // token it pays in. Passed from the platform's environment rather than by
    // the caller, deliberately — an employer who chose their own treasuries
    // could remit their employees' tax to themselves, and one who chose their
    // own token could pay salaries in something they minted for nothing.
    const t = treasuryKeys();
    const token = deployToken();
    log("Deploying this company's payroll contract (30-60 seconds)…");
    const deployed: any = await deployContract(providers as any, {
      compiledContract: compiledContract as any,
      args: [t.tax, t.social, token],
    } as any);
    const contractAddress = deployed.deployTxData.public.contractAddress;
    log(`Deployed at ${contractAddress}`);

    // Recorded before the calls that follow, not after.
    //
    // A deploy that succeeds and is never written down is money spent on a
    // contract nobody can find again — the address exists only in this
    // process's memory and in a log line. Everything after this point can be
    // retried against a recorded contract; this cannot be recovered at all.
    saveDeployment({
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: network.name,
      networkId: network.networkId,
      contractName: "payroll",
      instance: slug,
    });

    // Before handing it over, open the year this contract can file.
    //
    // Platform-only, so it has to happen while the platform still has a reason
    // to act on this instance. Assigning first would work — opening a year is
    // gated on the platform, not the employer — but doing it after means an
    // employer can be handed a contract that rejects every period they try,
    // with an error about rule sets they have never heard of.
    const hash = await ruleSetHash(network.networkId);
    const year = filingYear();

    // One transaction for the year rather than twelve for its months.
    //
    // The contract was deployed seconds ago, so every month of it is empty and
    // the "skip what is already recorded" arithmetic this used to do has nothing
    // to skip. Recording a period's rule set is still write-once in the circuit
    // — that is what stops a rule set being restated after a filing — but on a
    // fresh contract nothing can be overwritten.
    const periodsRecorded = monthsOf(year);
    await deployed.callTx.setParamsFor(BigInt(year), 1n, 12n, hash);
    log(`   ${year} open for filing — rule set v${DUTCH_V1.version}`);

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
      deployTxHash: deployed.deployTxData.public.txHash,
      assignTxHash: assignTx.public.txHash,
      periodsRecorded,
    };
  } finally {
    await wallet.facade.stop();
  }
}
