// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Turning an infrastructure failure into something a person can act on.
 *
 * Some of what reaches a user here is not about their transaction at all. The
 * public preview indexer answers a burst of requests with the bare string
 * `Rate limited`, which arrives in a red box under a claim form and reads as
 * "your claim was refused" — when nothing has been attempted, nothing is wrong
 * with the evidence, and the fix is to wait.
 *
 * `submitPayroll.ts` already met this from the other side and fixed the cause it
 * could fix — one shared indexer provider instead of a fresh WebSocket per
 * operation. What is left is the honest case: a shared endpoint throttling an
 * address that has genuinely asked for a lot. No amount of caching removes that,
 * so it has to be explained instead.
 */
export function explainError(raw: string): { text: string; retryable: boolean } {
  const message = raw.trim();

  if (/^rate limited$/i.test(message) || /\b429\b/.test(message)) {
    return {
      retryable: true,
      text:
        "The public indexer is rate limiting this address — it answers a burst of " +
        "requests with nothing but “Rate limited”. Nothing was submitted and " +
        "nothing here is wrong: wait a minute or two and press again. It throttles " +
        "the connection, not the claim.",
    };
  }

  if (/failed to fetch|networkerror/i.test(message)) {
    return {
      retryable: true,
      text:
        "The network could not be reached. Nothing was submitted — check the " +
        "connection and try again.",
    };
  }

  // Node 103 is a catch-all the node refuses to disambiguate, and the SDK's own
  // wording already explains it at length. Passed through rather than
  // paraphrased: rewriting it would drop the four causes it lists.
  return { text: message, retryable: false };
}
