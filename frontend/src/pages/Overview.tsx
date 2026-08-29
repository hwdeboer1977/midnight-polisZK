// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { ServiceUnavailable } from "../components/ServiceUnavailable";
import { claimAvailable } from "../lib/origin";
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

/**
 * The wallet-and-contract detail behind Setup, split in two.
 *
 * `variant="funding"` is what an employer does — balances, the keys people pay
 * them at, and claiming pEUR. `variant="technical"` is what a reviewer reads —
 * raw addresses and deployed contracts. Setup renders the first inline and the
 * second behind a disclosure, because one page holding both at the same weight
 * had become a debug console with a registration form at the top.
 */
export function Overview({ variant = "all" }: { variant?: "all" | "funding" | "technical" }) {
  const showFunding = variant !== "technical";
  const showTechnical = variant !== "funding";
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

  // Only when this page IS the page. Setup composes `Register` — which asks for
  // a signing key — and then `Overview variant="funding"` below it, so with no
  // wallet connected the visitor got the same two Connect buttons twice, under
  // two different headings, for one wallet. A section of a larger page has no
  // business running its own connect flow; the page that owns the page does.
  //
  // Rendering nothing rather than a prompt, because the prompt is already on
  // screen a few hundred pixels up. Once connected, both variants render in
  // full as before.
  if (!account) return variant === "all" ? <WalletPicker /> : null;

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
      {showFunding ? (
        <>
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
        </>
      ) : null}

      {showFunding ? (
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

      ) : null}

      {showTechnical ? (
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

      ) : null}

      {showTechnical ? (
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
            <Link to="/employer/settings">Register your company</Link> to get one.
          </p>
        )}
      </section>

      ) : null}

      {showFunding && myPayroll.length > 0 ? (
        // An operational act, not configuration — getting tokens into a wallet
        // is something you DO, and it happens to live on Settings only because
        // a fifth tab for it would be overkill on a testnet. The border says so
        // rather than a heading claiming it is a setting.
        <section className="card funding-card">
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
              {/* `claimAvailable`, not `platformActions`. Drawing the starter
                  allowance is a thing an EMPLOYER does, not a thing the operator
                  does for them: `/api/claim` is bounded by the chain and a
                  once-per-key record rather than by the bearer token, so it is
                  offered wherever a service can be reached. See `origin.ts`. */}
              <button
                disabled={!claimAvailable || !keys || claiming || claimJob?.status === "running"}
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

              {/* `unavailable` only becomes true after a request has failed. When
                  no backend is configured the answer is known before anything is
                  sent, so it is said upfront — a button that can only 405 is
                  worse than no button. */}
              {!claimAvailable || unavailable ? (
                <ServiceUnavailable what="pEUR allowance" operatorOnly={false} />
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
