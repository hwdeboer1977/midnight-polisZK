// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { CopyRow } from "../components/CopyRow";
import { ServiceUnavailable } from "../components/ServiceUnavailable";
import { platformActions } from "../lib/origin";
import { Tile } from "../components/Tile";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { PEUR_SCALE, formatPeur, group } from "../lib/format";
import type { PeurLedger } from "../lib/contracts";
import { useContractState } from "../lib/useContractState";
import { useFaucet } from "../lib/useFunding";
import { useWallet } from "../wallet/WalletContext";
import { bytesToHex as hex, keyToHex, sameKey } from "../lib/keys";


/** Matches the contract's Uint<48> bound on a single mint amount. */
const MAX_MINT = (1n << 48n) - 1n;

export function Peur() {
  const { account, api, networkId, refresh: refreshWallet } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  const [amount, setAmount] = useState("");
  const { job: mintJob, submitting: minting, unavailable, mint } = useFaucet();

  /**
   * Minting from the connected wallet instead of through the service.
   *
   * ⚠️ The service route needs a proof server, a platform token, and the
   * platform wallet's dust state to be current — none of which the OPERATION
   * needs. `peur.compact`'s `mint` asserts nothing about the caller and mints to
   * `ownPublicKey()`, so the wallet already on this page can do it for itself.
   *
   * Kept as a fallback rather than deleted: a CLI or a cron job has no wallet
   * extension, and the platform top-up still runs that way.
   */
  const [walletMinting, setWalletMinting] = useState(false);
  const [walletMintLog, setWalletMintLog] = useState<string[]>([]);
  const [walletMintError, setWalletMintError] = useState<string | null>(null);
  const [walletMintTx, setWalletMintTx] = useState<string | null>(null);

  async function mintHere(amountMinor: bigint) {
    if (!api || !peurAddress) return;
    setWalletMinting(true);
    setWalletMintError(null);
    setWalletMintTx(null);
    setWalletMintLog([]);
    try {
      const { mintFromWallet } = await import("../lib/mintFromWallet");
      const result = await mintFromWallet({
        api,
        networkId,
        contractAddress: peurAddress,
        amountMinor,
        provingMode: "wallet",
        onProgress: (line) => setWalletMintLog((lines) => [...lines, line]),
      });
      setWalletMintTx(result.txHash);
    } catch (cause) {
      setWalletMintError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWalletMinting(false);
    }
  }

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const deployment = deployments[`${networkId}/peur`];
  const peurAddress = deployment?.contractAddress ?? null;
  const { state, blockHeight, loading, error, refresh: refreshChain } = useContractState<PeurLedger>(
    networkId,
    "peur",
    deployment?.contractAddress
  );

  if (!deployment) {
    return (
      <section className="card">
        <h2>pEUR</h2>
        <p className="muted">
          No pEUR deployed on {networkId}. Run <code>npm run deploy:peur</code>, then{" "}
          <code>npm run frontend:config</code>.
        </p>
      </section>
    );
  }

  // Both halves of this page, because the two tiles come from two places: the
  // supply is read from the chain, the balance is a snapshot the wallet handed
  // over when it connected. Re-reading only the chain leaves the balance frozen
  // at whatever the wallet had synced at connection time, which is how a funded
  // employer ends up looking at 0.00 while their wallet shows the coin.
  const refresh = () => {
    void refreshWallet();
    return refreshChain();
  };

  const tokenId = state ? hex(state.tokenId) : deployment.tokenId;
  const held =
    account && tokenId
      ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))
      : undefined;

  const issuerIsYou =
    account && state ? sameKey(hex(state.issuer.bytes), account.coinPublicKey) : false;

  // Parsed to minor units here, and sent as minor units, so the service's parser
  // stays the one authority on what a valid amount is. This only decides where
  // the decimal point goes — and refuses rather than rounds, because a mint that
  // silently drops a digit is worse than one that will not start.
  const typed = amount.trim().replace(/,/g, ".");
  const mintable = (() => {
    const match = /^(\d*)(?:\.(\d{1,6}))?$/.exec(typed);
    if (!match || (!match[1] && !match[2])) return null;
    const units = BigInt(match[1] || "0") * PEUR_SCALE + BigInt((match[2] ?? "").padEnd(6, "0"));
    return units > 0n && units <= MAX_MINT ? units : null;
  })();

  return (
    <>
      <div className="tiles">
        <Tile
          label="Total supply"
          value={state ? formatPeur(state.totalSupply) : loading ? "…" : "—"}
          unit="public, on chain"
        />
        <Tile
          label="Your balance"
          value={held ? formatPeur(held[1]) : account ? "0.00" : "—"}
          unit={account ? "private, shielded" : "connect a wallet"}
          accent
        />
        <Tile
          label="Mints"
          value={state ? group(state.mintCounter) : loading ? "…" : "—"}
          unit={blockHeight ? `as of block ${group(BigInt(blockHeight))}` : "—"}
        />
      </div>

      {error ? <p className="status error">Could not read contract state: {error}</p> : null}

      <section className="card">
        <h2>
          Token
          <button className="ghost refresh" onClick={refresh} disabled={loading}>
            {loading ? "Reading…" : "Refresh"}
          </button>
        </h2>
        <CopyRow label="Contract" value={deployment.contractAddress} />
        {tokenId ? <CopyRow label="Token type" value={tokenId} /> : null}
        {state ? (
          <CopyRow
            label={issuerIsYou ? "Issuer (you)" : "Issuer"}
            value={hex(state.issuer.bytes)}
          />
        ) : null}
        <p className="note">
          Supply is public so the token can be audited against reserves; who holds how
          much is not. Your balance above comes from the wallet, not the chain — the
          ledger has no record of it.
        </p>
      </section>

      <section className="card">
        <h2>Minting</h2>
        {!account ? (
          <p className="muted">Connect a wallet to mint pEUR to it.</p>
        ) : mintJob?.status === "done" ? (
          <>
            <p className="ok-line">
              ✅ Minted {formatPeur(BigInt(mintJob.result.amount))} pEUR to your
              shielded address.
            </p>
            <CopyRow label="Transaction" value={mintJob.result.txHash} />
            <p className="note">
              Use <strong>Refresh</strong> above to re-read the supply and your own
              balance — the balance appears once the wallet has synced the new coin,
              which is not instant.
            </p>
          </>
        ) : (
          <>
            <p className="lead-sm">
              ⚠️ Anyone can mint pEUR, in any amount. That is true of the contract and
              not merely of this page: the issuer check was removed so a demo can fund
              itself. It also means the supply figure above measures nothing.
            </p>
            <label className="field">
              <span>Amount in pEUR</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                placeholder="1000"
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            {mintable ? (
              <p className="note">
                = {String(mintable)} minor units ({formatPeur(mintable)} pEUR)
              </p>
            ) : typed ? (
              <p className="status error">
                An amount greater than zero, at most {formatPeur(MAX_MINT)} pEUR, with
                no more than 6 decimal places.
              </p>
            ) : null}

            {/* Wallet first, service second.
                
                The circuit mints to `ownPublicKey()` and checks nothing about
                the caller, so the connected wallet can do this for itself — no
                proof server, no platform token, and none of the platform
                wallet's dust-state failures. The service route stays for a
                machine with no wallet extension. */}
            <button
              disabled={!mintable || walletMinting || !api || !peurAddress}
              onClick={() => mintable && void mintHere(mintable)}
            >
              {walletMinting ? "Minting…" : "Mint to my wallet"}
            </button>

            {walletMintLog.length > 0 ? (
              <div className="joblog">
                {walletMintLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ) : null}
            {walletMintError ? <p className="problems">{walletMintError}</p> : null}
            {walletMintTx ? (
              <>
                <p className="ok-line">
                  ✅ Minted {formatPeur(mintable ?? 0n)} pEUR to your wallet
                </p>
                <CopyRow label="Transaction" value={walletMintTx} />
              </>
            ) : null}

            <details className="details" style={{ marginTop: 8 }}>
              <summary>Mint through the service instead</summary>
              <p className="note">
                Signed by the platform wallet rather than yours, and needs a proof
                server plus a platform token. Only useful where no wallet
                extension exists — a CLI, or a cron job.
              </p>
              <button
                className="ghost"
                disabled={
                  !platformActions || !mintable || minting || mintJob?.status === "running"
                }
                onClick={() =>
                  // The connector speaks Bech32m; the service speaks hex.
                  // Converting here rather than there keeps the one decoder in
                  // the browser, where the 11 MB address-format WASM is already
                  // avoided.
                  mintable &&
                  void mint(
                    keyToHex(account.coinPublicKey),
                    keyToHex(account.encryptionPublicKey),
                    mintable.toString()
                  )
                }
              >
                {mintJob?.status === "running"
                  ? "Minting…"
                  : minting
                    ? "Starting…"
                    : "Mint through the service"}
              </button>
            </details>

            {mintJob?.status === "running" ? (
              <div className="joblog">
                {mintJob.log.length === 0 ? <div>Starting…</div> : null}
                {mintJob.log.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                <p className="note">
                  The platform wallet syncs before it can prove the mint, so this takes
                  a few minutes. Leave this page open.
                </p>
              </div>
            ) : null}

            {mintJob?.status === "failed" ? (
              <p className="status error">Could not mint: {mintJob.error}</p>
            ) : null}

            {/* `unavailable` only becomes true after a request has failed. On a
                hosted origin the answer is known before anything is sent, so it
                is said upfront — a button that can only 405 is worse than no
                button. */}
            {!platformActions || unavailable ? (
              <ServiceUnavailable what="minting" />
            ) : null}

            <p className="note">
              The mint is signed by the platform wallet through the local service, not
              by your browser — this page cannot build a transaction. The coin is still
              yours: it is minted to the coin public key your wallet just handed over,
              and only that key can spend it.
            </p>
          </>
        )}
      </section>
    </>
  );
}
