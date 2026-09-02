// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { deriveEmployerKey, deriveTerminationNonce } from "./openings";
import { surveyEmployment, type TerminationOpening } from "./endEmployment";
import { apiUrl } from "./origin";

/**
 * Rebuilding a termination opening from the passphrase, with no file.
 *
 * ── Why this can exist at all ──────────────────────────────────────────────
 *
 * Every field of an opening is either public, computed, or derived — none of it
 * is random:
 *
 *   finalPeriod, slot   → the chain, via `payeeFor`
 *   monthsWorked        → counted from the chain, the same way the attestation
 *                         counted it when it was signed
 *   nonce               → sha256("polisZK/termination/v1", employerKey, "period:slot")
 *
 * `openings.ts` spells out why that last one is derived rather than random: a
 * termination is signed once and consumed months later by a relay, so "a random
 * nonce would have to survive in a file nobody thought to keep". This is the
 * function that cashes in that decision.
 *
 * ── What it fixes ──────────────────────────────────────────────────────────
 *
 * The claim bundle is React state and vanishes on refresh — deliberately, since
 * it names a fund pool coin an earlier claimant can spend, so a cached bundle
 * goes stale on its own. The recovery path was "upload the file you downloaded
 * at the time", which is a file nobody thought to keep. Now it is "type the
 * passphrase you already use to file a period".
 *
 * ── Every input is now recoverable ─────────────────────────────────────────
 *
 * There used to be one that was not: `claimKeyHash`, which lived only in the
 * employer's own record, so a rebuild on a fresh browser could derive three of
 * the four fields and stall on the fourth. Removing the claim key removed that
 * last dependency — a termination now binds only what the chain and the
 * passphrase can reproduce, so ANY browser holding the passphrase can rebuild
 * ANY opening for this payroll, with nothing collected from anybody.
 *
 * `runRelay` still recomputes each opening against the attestation on chain and
 * refuses one that does not reproduce it, so a wrong passphrase fails loudly
 * here rather than silently at claim time.
 */
export async function rebuildTerminationOpening(options: {
  networkId: string;
  contractAddress: string;
  instance: string;
  /** The employee's coin public key, hex or Bech32m. */
  payee: string;
  /** The period their employment ended, from `terminationFor`. */
  period: number;
  passphrase: string;
}): Promise<TerminationOpening> {
  const { networkId, contractAddress, instance, payee, period, passphrase } = options;

  // Recounted rather than remembered, for the same reason `endEmployment`
  // counts it: the attestation carries what the chain says, so a rebuild that
  // recounts from the same source reproduces the same number.
  // `allowEnded`, because a rebuild happens only AFTER a termination exists —
  // the survey's write-once guard is the one thing that must not fire here.
  const survey = await surveyEmployment({
    networkId,
    contractAddress,
    payee,
    period,
    allowEnded: true,
  });

  const employerKey = await deriveEmployerKey(passphrase, contractAddress);
  const nonce = await deriveTerminationNonce(employerKey, period, survey.slot);

  return {
    instance,
    contractAddress,
    slot: survey.slot,
    finalPeriod: period,
    monthsWorked: survey.monthsWorked,
    nonce: Array.from(nonce, (b) => b.toString(16).padStart(2, "0")).join(""),
  };
}

export interface ClaimTree {
  period: number;
  /** Decimal string — the root is a Field. */
  root: string;
  /** Leaf digests in tree order. */
  leafDigests: string[];
}

/**
 * A period's claim-tree leaf digests.
 *
 * Digests, never leaves: a leaf carries `monthsWorked`, which the chain keeps
 * inside a hash because published per slot it is a tenure record for a worker.
 * A digest discloses none of it and is all a Merkle path needs.
 *
 * The whole period comes back rather than one claimant's siblings, and that is
 * the point rather than an inefficiency: asking for one leaf would tell the
 * service which leaf is yours, which is exactly the anonymity `claim` provides
 * by proving membership without disclosing the leaf.
 *
 * Degrades to null rather than throwing. A period nobody has relayed yet has no
 * tree, which is an answer and not a fault.
 */
export async function readClaimTree(
  networkId: string,
  period: number
): Promise<ClaimTree | null> {
  try {
    const response = await fetch(
      apiUrl(
        `/api/claim-tree?networkId=${encodeURIComponent(networkId)}` +
          `&period=${encodeURIComponent(String(period))}`
      ),
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { tree?: ClaimTree | null };
    return body.tree ?? null;
  } catch {
    return null;
  }
}
