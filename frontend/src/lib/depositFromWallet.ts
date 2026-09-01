// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { apiUrl } from "./origin";
import { connectContract, type ProvingMode, type SubmitProgress } from "./submitPayroll";

/**
 * Paying a national contract from the operator's OWN treasury wallet.
 *
 * The settlement deposit used to run entirely on the service, because the
 * service held `SOCIAL_TREASURY_SEED` and `TAX_TREASURY_SEED`. Two things were
 * wrong with that, and only one of them was obvious.
 *
 * The obvious one: it made the service prove. A ZK proof is CPU-bound and holds
 * the event loop for a minute or more, and a managed host reads an unresponsive
 * process as a dead one — the instance was restarted mid-proof every time, and
 * the browser saw a CORS error, because a platform error page carries no CORS
 * headers. Nothing in the logs said "proof", which is why it took so long to
 * see. Every other money-moving flow in this app already proves in the browser;
 * this was the only one that did not.
 *
 * The less obvious one, and the reason this is worth the rebuild rather than a
 * hosted proof server: the service does not need those keys at all. `guards.ts`
 * says what holding them means — "Anyone who can call them and authenticate can
 * spend it." Paying from a wallet the operator controls removes the platform
 * from custody of the treasuries entirely; the token now guards bookkeeping
 * rather than money.
 *
 * ── What still belongs to the service ──────────────────────────────────────
 *
 * The coin's nonce. `fund-pool.json` is the fund's only record of what it
 * holds, `relay-run.ts` reads it to hand a claimant something to spend, and a
 * coin the fund holds but cannot describe is money no claim can reach. So the
 * service mints the nonce and records it BEFORE this submits anything, and is
 * told the outcome afterwards. See `utils/deposit-prepare.ts`.
 */

export interface PreparedDeposit {
  contractAddress: string;
  circuitId: "fundBenefits" | "deposit";
  target: "fund" | "taxvault";
  nonce: string;
  color: string;
  value: string;
  source: string;
  period: number;
  expectedPayer: string | null;
}

export interface WalletDepositResult {
  txHash: string;
  ordinal: number | null;
  amountMinor: string;
  /** Set when the coin landed but the service could not record its ordinal. */
  bookkeepingWarning?: string;
}

const fromHex = (value: string): Uint8Array => {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

async function post<T>(path: string, body: unknown, token: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token.trim() ? { authorization: `Bearer ${token.trim()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) {
    throw new Error(parsed.error ?? `The service returned ${response.status}`);
  }
  return parsed as T;
}

/**
 * Deposits into the fund or the tax vault, paid and proved by the connected
 * wallet.
 *
 * `provingMode` is the same choice the payroll flow offers and means the same
 * thing: `wallet` hands proving to the extension, `local` posts to a proof
 * server this machine runs. Unlike payroll there is no privacy dimension —
 * the amount is a public argument to the circuit either way — so this is purely
 * about where the work happens.
 */
export async function depositFromWallet(options: {
  api: ConnectedAPI;
  networkId: string;
  /** Platform token — for the two bookkeeping calls, not for the money. */
  token: string;
  amountMinor: bigint;
  period: number;
  /** The payroll contract these contributions came from. */
  source: string;
  target: "fund" | "taxvault";
  provingMode?: ProvingMode;
  onProgress?: SubmitProgress;
}): Promise<WalletDepositResult> {
  const { api, networkId, token, amountMinor, period, source, target } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Reserving the coin with the service…");
  const prepared = await post<PreparedDeposit>(
    "/api/fund/deposit/prepare",
    { amount: amountMinor.toString(), period, source, target },
    token
  );

  // Refused here rather than after proving. The destination decides which
  // treasury pays — contributions come out of the social treasury, wage tax out
  // of the tax one — and paying the right contract from the wrong pot is
  // something the chain accepts and nobody can unpick afterwards.
  if (prepared.expectedPayer) {
    const shielded = await api.getShieldedAddresses();
    const connected = String(shielded.shieldedCoinPublicKey ?? "")
      .replace(/^0x/, "")
      .toLowerCase();
    // Bech32m from the connector, hex from the service: compared only when the
    // connector gives something hex-shaped, so a format difference cannot
    // produce a false refusal.
    if (/^[0-9a-f]{64}$/.test(connected) && connected !== prepared.expectedPayer) {
      throw new Error(
        `This wallet is not the ${target === "fund" ? "social" : "tax"} treasury. ` +
          "Connect the treasury that was remitted for this destination — the pairing " +
          "is not a choice."
      );
    }
  }

  onProgress("Connecting to the contract…");
  const { deployed } = await connectContract({
    api,
    networkId,
    contractAddress: prepared.contractAddress,
    contractName: prepared.target,
    provingMode: options.provingMode,
    onProgress,
  });

  onProgress("Proving — a minute or two. Approve in your wallet if it asks…");
  const tx: any = await deployed.callTx[prepared.circuitId](
    BigInt(prepared.period),
    fromHex(prepared.source),
    BigInt(prepared.value),
    {
      nonce: fromHex(prepared.nonce),
      color: fromHex(prepared.color),
      value: BigInt(prepared.value),
    }
  );
  const txHash = String(tx.public?.txHash ?? "");

  onProgress("Recording the coin…");
  try {
    const { ordinal } = await post<{ ordinal: number }>(
      "/api/fund/deposit/confirm",
      { nonce: prepared.nonce, txHash, target: prepared.target },
      token
    );
    return { txHash, ordinal, amountMinor: prepared.value };
  } catch (cause) {
    // The money has moved by now. A failure to record its ordinal is a
    // bookkeeping problem, and reporting it as a failed deposit would send an
    // operator to send it again — so it is returned as a warning beside a
    // successful result, not thrown.
    return {
      txHash,
      ordinal: null,
      amountMinor: prepared.value,
      bookkeepingWarning:
        `The deposit landed (${txHash.slice(0, 16)}…) but the service could not record ` +
        `its pool ordinal: ${cause instanceof Error ? cause.message : String(cause)}. ` +
        "Run `npm run fund -- pool` and reconcile before relaying.",
    };
  }
}
