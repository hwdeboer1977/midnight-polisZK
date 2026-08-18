import { useEffect, useState } from "react";
import { CopyRow } from "../components/CopyRow";
import { Tile } from "../components/Tile";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, group } from "../lib/format";
import type { PeurLedger } from "../lib/contracts";
import { useContractState } from "../lib/useContractState";
import { useWallet } from "../wallet/WalletContext";
import { bytesToHex as hex, sameKey } from "../lib/keys";


export function Peur() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const deployment = deployments[`${networkId}/peur`];
  const { state, blockHeight, loading, error, refresh } = useContractState<PeurLedger>(
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

  const tokenId = state ? hex(state.tokenId) : deployment.tokenId;
  const held =
    account && tokenId
      ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))
      : undefined;

  const issuerIsYou =
    account && state ? sameKey(hex(state.issuer.bytes), account.coinPublicKey) : false;

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
        <p className="muted">
          {issuerIsYou
            ? "You are the issuer. Minting runs from the CLI: "
            : "Issuer-only. Minting runs from the CLI: "}
          <code>npm run peur</code>
        </p>
        <p className="note">
          Doing it from the browser means building and proving a transaction here. The
          connector API can delegate proving to the wallet, which is the path to take
          when this page grows write support.
        </p>
      </section>
    </>
  );
}
