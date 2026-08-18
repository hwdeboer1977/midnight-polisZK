import { useEffect, useState } from "react";
import { CopyRow } from "../components/CopyRow";
import { Tile } from "../components/Tile";
import { WalletPicker } from "../components/WalletPicker";
import { forNetwork, loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, group } from "../lib/format";
import { useWallet } from "../wallet/WalletContext";

export function Overview() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  if (!account) return <WalletPicker />;

  const tokenId = deployments[`${networkId}/peur`]?.tokenId;
  const peur = tokenId
    ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))
    : undefined;

  const otherTokens = Object.entries(account.shieldedBalances).filter(
    ([type]) => !(tokenId && type.endsWith(tokenId))
  );
  const contracts = forNetwork(deployments, networkId);

  return (
    <>
      <div className="tiles">
        <Tile label="tNIGHT" value={group(account.night)} unit="raw ledger units" />
        <Tile
          label="tDUST"
          value={group(account.dust.balance)}
          unit={`STARs · cap ${group(account.dust.cap)}`}
        />
        <Tile
          label="pEUR"
          value={peur ? formatPeur(peur[1]) : "0.00"}
          unit={tokenId ? "shielded balance" : "no pEUR deployment here"}
          accent
        />
      </div>

      <section className="callout">
        <h2>Keys to receive pEUR</h2>
        <CopyRow label="Coin public key" value={account.coinPublicKey} />
        <CopyRow label="Encryption public key" value={account.encryptionPublicKey} />
        <p className="note">
          Send both to whoever pays you. The coin public key identifies you inside the
          circuit; the encryption public key is what the coin ciphertext is encrypted to.
          Without the second one your wallet cannot even detect the coin.
        </p>
      </section>

      <section className="card">
        <h2>Addresses</h2>
        <CopyRow label="Unshielded" value={account.unshieldedAddress} />
        <CopyRow label="Shielded" value={account.shieldedAddress} />
        <CopyRow label="Dust" value={account.dustAddress} />
        {otherTokens.map(([type, amount]) => (
          <CopyRow key={type} label={`Token ${type.slice(0, 8)}…`} value={`${group(amount)}  (${type})`} />
        ))}
        <p className="note">
          pEUR is held at the shielded address, not the unshielded one — which is why
          wallet apps that only know tNIGHT and tDUST will not show it.
        </p>
      </section>

      <section className="card">
        <h2>Contracts on {networkId}</h2>
        {contracts.length === 0 ? (
          <p className="muted">
            Nothing deployed here yet. Run <code>npm run deploy:payroll</code> or{" "}
            <code>npm run deploy:peur</code>, then <code>npm run frontend:config</code>.
          </p>
        ) : (
          contracts.map(([name, deployment]) => (
            <CopyRow key={name} badge={name} value={deployment.contractAddress} />
          ))
        )}
      </section>
    </>
  );
}
