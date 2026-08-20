import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { OnboardingSteps } from "../components/OnboardingSteps";
import { Tile } from "../components/Tile";
import { WalletPicker } from "../components/WalletPicker";
import { FAUCETS } from "../lib/chain";
import { forNetwork, loadDeployments, type Deployments } from "../lib/deployments";
import {
  DUST_DECIMALS,
  NIGHT_DECIMALS,
  formatPeur,
  formatUnits,
  group,
} from "../lib/format";
import { keyToHex } from "../lib/keys";
import { EMPLOYER_ALLOWANCE, useClaim } from "../lib/useFunding";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

export function Overview() {
  const { account, networkId, refresh: refreshWallet } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  const [deploymentsRead, setDeploymentsRead] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadDeployments().then((loaded) => {
      setDeployments(loaded);
      setDeploymentsRead(true);
    });
  }, []);

  // Resolved before the early return below, since hooks cannot be conditional.
  // Without a key every instance simply resolves to role "none".
  const { instances, loading: readingPayroll } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );
  const { job: claimJob, submitting: claiming, unavailable, claim } = useClaim();

  if (!account)
    return (
      <>
        <OnboardingSteps current={1} />
        <WalletPicker />
      </>
    );

  const tokenId = deployments[`${networkId}/peur`]?.tokenId;
  const peur = tokenId
    ? Object.entries(account.shieldedBalances).find(([type]) => type.endsWith(tokenId))
    : undefined;

  const otherTokens = Object.entries(account.shieldedBalances).filter(
    ([type]) => !(tokenId && type.endsWith(tokenId))
  );

  // pEUR is deployed once per network and shared by everyone, so listing it
  // straight from the deployment file is correct. Payroll is not: every employer
  // gets their own contract, so the file also holds other companies' contracts —
  // and stale ones from before per-employer instances — and cannot answer
  // "which of these is mine".
  const shared = forNetwork(deployments, networkId).filter(
    ([, deployment]) => deployment.contractName !== "payroll"
  );

  // That question is answered by the contracts themselves: this key's payroll
  // contract is the one naming it as the assigned employer. A key that has not
  // been onboarded matches none, and is shown no payroll address at all.
  const myPayroll = instances.filter((instance) => instance.role === "employer");
  const checkingPayroll = !deploymentsRead || readingPayroll;

  const faucet = FAUCETS[networkId] ?? "";

  // The service speaks hex; the connector hands out Bech32m. Converting here
  // rather than server-side keeps the wallet the single source of both keys.
  let keys: { coin: string; encryption: string } | null = null;
  let keyError: string | null = null;
  try {
    keys = {
      coin: keyToHex(account.coinPublicKey),
      encryption: keyToHex(account.encryptionPublicKey),
    };
  } catch (cause) {
    keyError = cause instanceof Error ? cause.message : String(cause);
  }

  // Every tile below is a snapshot the wallet handed over when it connected, and
  // the connector pushes nothing afterwards. A wallet that syncs a coin a minute
  // later leaves this page showing the balance from before it arrived, so there
  // has to be a way to ask again that is not "disconnect and reconnect".
  const reread = () => {
    setRefreshing(true);
    void refreshWallet().finally(() => setRefreshing(false));
  };

  return (
    <>
      {myPayroll.length === 0 ? (
        <OnboardingSteps current={checkingPayroll ? null : 2} />
      ) : null}

      <div className="tiles-head">
        <h2>Balances</h2>
        <button className="ghost refresh" onClick={reread} disabled={refreshing}>
          {refreshing ? "Reading…" : "Refresh"}
        </button>
      </div>
      <div className="tiles">
        <Tile
          label="tNIGHT"
          value={formatUnits(account.night, NIGHT_DECIMALS)}
          unit="fees and staking"
        />
        <Tile
          label="tDUST"
          value={formatUnits(account.dust.balance, DUST_DECIMALS)}
          unit="regenerates from tNIGHT"
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

        {shared.length > 0 ? (
          shared.map(([name, deployment]) => (
            <CopyRow key={name} badge={name} value={deployment.contractAddress} />
          ))
        ) : (
          <p className="muted">
            No pEUR deployment here yet. Run <code>npm run deploy:peur</code>, then{" "}
            <code>npm run frontend:config</code>.
          </p>
        )}

        {checkingPayroll ? (
          <p className="muted">Checking your payroll registration…</p>
        ) : myPayroll.length > 0 ? (
          myPayroll.map((instance) => (
            <CopyRow
              key={instance.name}
              badge={instance.deployment.instance ?? "payroll"}
              value={instance.deployment.contractAddress}
            />
          ))
        ) : (
          <p className="note">
            No payroll contract is registered to this signing key.{" "}
            <Link to="/register">Register your company</Link> to get one.
          </p>
        )}
      </section>

      {myPayroll.length > 0 ? (
        <section className="card">
          <h2>Get funded</h2>
          <ol className="next">
            <li>
              <strong>Get tNIGHT from the faucet.</strong> Paste your{" "}
              <em>unshielded</em> address — the first one above — into{" "}
              {faucet ? (
                <a href={faucet} target="_blank" rel="noreferrer noopener">
                  the {networkId} faucet
                </a>
              ) : (
                <span>the network's faucet</span>
              )}
              .
            </li>
            <li>
              <strong>tDUST then appears on its own.</strong> It is not handed out:
              it is generated from tNIGHT once that tNIGHT is registered for
              generation, and a wallet already showing a tDUST balance is
              registered. Every transaction costs tDUST, so payroll cannot be
              submitted until it shows up in the tile above.
            </li>
            <li>
              <strong>Claim your pEUR.</strong> This is the money salaries are paid
              in. It is issued by the platform, once per registered company.
            </li>
          </ol>

          {claimJob?.status === "done" ? (
            <>
              <p className="ok-line">
                ✅ {formatPeur(BigInt(claimJob.result.amount))} pEUR issued to your
                shielded address.
              </p>
              <CopyRow label="Transaction" value={claimJob.result.txHash} />
              <p className="note">
                It appears in the pEUR tile once your wallet has synced the new coin,
                not immediately.
              </p>
            </>
          ) : (
            <>
              <button
                disabled={!keys || claiming || claimJob?.status === "running"}
                onClick={() => keys && void claim(keys.coin, keys.encryption)}
              >
                {claimJob?.status === "running"
                  ? "Claiming…"
                  : claiming
                    ? "Starting…"
                    : `Claim ${formatPeur(EMPLOYER_ALLOWANCE)} pEUR`}
              </button>

              {keyError ? (
                <p className="status error">Could not read your keys: {keyError}</p>
              ) : null}

              {claimJob?.status === "running" ? (
                <div className="joblog">
                  {claimJob.log.length === 0 ? <div>Starting…</div> : null}
                  {claimJob.log.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  <p className="note">
                    The platform wallet has to sync before it can mint, so this takes
                    a few minutes. Leave this page open.
                  </p>
                </div>
              ) : null}

              {claimJob?.status === "failed" ? (
                <p className="status error">Could not claim: {claimJob.error}</p>
              ) : null}

              {unavailable ? (
                <p className="note">
                  The demo service is not running. Start it with{" "}
                  <code>npm run demo:server</code>.
                </p>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
