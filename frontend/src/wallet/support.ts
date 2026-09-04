// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

/**
 * Which detected wallets this build actually supports.
 *
 * Not every Midnight wallet can carry this app's flows. The circuits here are
 * large — a payroll filing proves a whole roster — and 1AM proves them in-tab,
 * which is what lets an employer file from a hosted page with nothing else
 * running. Lace does not: it needs a proof server reachable from the claimant's
 * own machine, so on a deployed build the connect succeeds, the wallet approves,
 * and the run fails minutes later against `127.0.0.1:6300`.
 *
 * Refusing at the connect button is the honest place for that. A wallet that
 * connects and then cannot finish anything is worse than one that says so
 * before it is chosen, and the failure it produces names a port rather than a
 * wallet.
 *
 * Matched on the identifiers the extension reports. Those are attacker
 * controlled, which is fine in this direction: the worst an impostor can do by
 * claiming to be Lace is disable itself.
 */
export interface WalletSupport {
  supported: boolean;
  /** Shown on the disabled control. Short — it sits inside a button. */
  label: string;
  /** One sentence under it, when there is something to explain. */
  reason?: string;
}

const UNSUPPORTED = [
  {
    match: /lace/i,
    label: "Coming soon",
    reason:
      "Lace cannot prove these circuits in the browser, so filing needs a proof " +
      "server running on your own machine. Support is not ready yet — use 1AM.",
  },
];

export function walletSupport(key: string, api?: Pick<InitialAPI, "name" | "rdns">): WalletSupport {
  const identity = `${key} ${api?.name ?? ""} ${api?.rdns ?? ""}`;
  const blocked = UNSUPPORTED.find((entry) => entry.match.test(identity));
  return blocked
    ? { supported: false, label: blocked.label, reason: blocked.reason }
    : { supported: true, label: "Connect" };
}
