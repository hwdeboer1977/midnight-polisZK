import { useState } from "react";
import { Link } from "react-router-dom";
import { WalletPicker } from "../components/WalletPicker";
import { CopyRow } from "../components/CopyRow";
import { keyToHex } from "../lib/keys";
import { useOnboarding } from "../lib/useOnboarding";
import { useWallet } from "../wallet/WalletContext";

/**
 * Employer registration.
 *
 * Nothing is created here. The employer's keys already exist inside their
 * signing app, and the platform must never see the private half — otherwise
 * "only this employer can change these salaries" is not true, because the
 * operator could change them too. Registration is the employer proving which
 * key is theirs and handing over the public halves.
 *
 * The word "wallet" is deliberately absent: an HR manager is registering a
 * company signing key, not managing crypto. Wallet language belongs on the
 * employee side, where people actually hold tokens.
 */
export function Register() {
  const { account, networkId } = useWallet();
  const [company, setCompany] = useState("");
  const [copied, setCopied] = useState(false);
  const { job, submitting, unavailable, start } = useOnboarding();

  if (!account) {
    return (
      <>
        <section className="card">
          <h2>Register your company</h2>
          <p className="lead-sm">
            Payroll for your company is run by a contract that only your company can
            change. To set that up we need your <strong>company signing key</strong>.
          </p>
          <ul className="plain">
            <li>The key is created and held by an app in your browser.</li>
            <li>We only ever see its public half — never anything that can sign.</li>
            <li>Once registered, not even we can change your salaries.</li>
          </ul>
        </section>
        <WalletPicker heading="Choose your signing key" subject="signing key" />
      </>
    );
  }

  const slug = company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // The wallet hands out Bech32m; contracts and the onboarding service speak hex.
  let signingKeyHex: string | null = null;
  let keyError: string | null = null;
  try {
    signingKeyHex = keyToHex(account.coinPublicKey);
  } catch (cause) {
    keyError = cause instanceof Error ? cause.message : String(cause);
  }
  const registration = [
    `company=${company.trim() || "(not given)"}`,
    `instance=${slug || "(not given)"}`,
    `network=${networkId}`,
    `signing_key=${signingKeyHex ?? account.coinPublicKey}`,
    `payment_key=${account.encryptionPublicKey}`,
    `fee_address=${account.unshieldedAddress}`,
  ].join("\n");

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(registration);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <section className="card">
        <h2>Your company</h2>
        <label className="field">
          <span>Company name</span>
          <input
            type="text"
            value={company}
            placeholder="Acme B.V."
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
        {slug ? (
          <p className="note">
            Your payroll contract will be labelled <code>{slug}</code>.
          </p>
        ) : null}
      </section>

      <section className="callout">
        <h2>Your company keys</h2>
        <CopyRow label="Signing key" value={signingKeyHex ?? account.coinPublicKey} />
        {keyError ? (
          <p className="status error">Could not read the signing key: {keyError}</p>
        ) : null}
        <CopyRow label="Payment key" value={account.encryptionPublicKey} />
        <CopyRow label="Fee address" value={account.unshieldedAddress} />
        <button
          className={copied ? "copy done wide" : "copy wide"}
          onClick={() => void copyAll()}
          disabled={!slug}
        >
          {copied ? "Copied" : slug ? "Copy registration details" : "Enter a company name first"}
        </button>
        <p className="note">
          All three are public. The <strong>signing key</strong> identifies your company
          to the contract, the <strong>payment key</strong> lets us send you funds, and
          the <strong>fee address</strong> is where transaction fees are paid from. None
          of them can move money or change salaries on their own.
        </p>
      </section>

      <section className="card">
        <h2>Create your payroll contract</h2>
        {job?.status === "done" ? (
          <>
            <p className="ok-line">
              ✅ Your payroll contract is live and locked to your signing key.
            </p>
            <CopyRow label="Contract" value={job.result.contractAddress} />
            <p className="note">
              Only your key can set salaries on it — not ours. Go to the{" "}
              <Link to="/payroll">payroll page</Link>, where it is now the only contract
              you can see.
            </p>
          </>
        ) : (
          <>
            <p className="lead-sm">
              This deploys a payroll contract for {company.trim() || "your company"} and
              locks it to your signing key, permanently.
            </p>
            <button
              disabled={!slug || !signingKeyHex || submitting || job?.status === "running"}
              onClick={() => void start(slug, signingKeyHex!)}
            >
              {job?.status === "running"
                ? "Creating…"
                : submitting
                  ? "Starting…"
                  : "Create my payroll contract"}
            </button>

            {job?.status === "running" ? (
              <div className="joblog">
                {job.log.length === 0 ? <div>Starting…</div> : null}
                {job.log.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                <p className="note">
                  Deploying and assigning are two transactions and take a few minutes.
                  Leave this page open.
                </p>
              </div>
            ) : null}

            {job?.status === "failed" ? (
              <p className="status error">Could not create the contract: {job.error}</p>
            ) : null}

            {unavailable ? (
              <p className="note">
                The onboarding service is not running. Start it with{" "}
                <code>npm run demo:server</code>, or send the details above to the
                platform operator instead.
              </p>
            ) : null}

            <p className="note">
              Self-service onboarding is a <strong>demo convenience</strong>. In
              production a person reviews a company before any contract is deployed.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2>What happens next</h2>
        <ol className="next">
          <li>
            <strong>Your payroll contract is created</strong> and locked to the signing
            key above. This happens once and cannot be undone — afterwards nobody else,
            including us, can set your salaries.
          </li>
          <li>
            <strong>We fund you</strong> with pEUR to pay salaries from, and with the
            small amount of network fuel every transaction costs. Both arrive at the
            keys above.
          </li>
          <li>
            <strong>You upload your roster</strong> — a spreadsheet of names, addresses
            and monthly gross salaries — on the <Link to="/payroll">payroll page</Link>.
            It is read in your browser; names and addresses never leave your machine.
          </li>
        </ol>
        <p className="note">
          Keep using this same signing key. Your contract is bound to it, so a different
          key cannot set salaries — and if you ever need to move to a new one, only you
          can authorise that.
        </p>
      </section>

      <details className="operator">
        <summary>For the platform operator</summary>
        <p className="note">
          Deploys a fresh payroll contract and assigns this employer as the only key
          that can set salaries on it:
        </p>
        <pre>
          INSTANCE={slug || "<company>"} EMPLOYER_KEY={signingKeyHex ?? "<key>"} npm run onboard
        </pre>
        <p className="note">
          Then fund them: <code>npm run peur</code> option 3, using the signing key and
          payment key above. They also need network fuel before they can submit payroll.
        </p>
      </details>
    </>
  );
}
