// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { InstallHelp, InstallLinks } from "./InstallHelp";
import { useWallet } from "../wallet/WalletContext";
import { walletSupport } from "../wallet/support";

/**
 * `subject` exists because the same object means different things to different
 * people. An employer is choosing the key that will sign for their company; an
 * employee is choosing the wallet that holds their tokens. Calling both "wallet"
 * in an HR product imports crypto baggage the employer flow does not need.
 */
export function WalletPicker({
  heading = "Connect a wallet",
  subject = "wallet",
}: {
  heading?: string;
  subject?: string;
}) {
  const { available, connect, connecting, networkId } = useWallet();

  return (
    <section className="card">
      <h2>{heading}</h2>

      {available.length === 0 ? (
        <InstallHelp subject={subject} />
      ) : (
        <>
          {available.map(({ key, api }) => {
            // Whether this build can actually finish a run with this wallet.
            // Refused here rather than at the first proof, which fails minutes
            // in and names a port instead of a wallet.
            const support = walletSupport(key, api);
            return (
              <div
                className={support.supported ? "wallet" : "wallet unsupported"}
                key={key}
              >
                {/* Name and icon come from the extension and are attacker
                    controlled: the name is rendered as text, the icon only ever
                    as an img source. */}
                {api.icon ? <img src={api.icon} alt="" /> : null}
                <div className="meta">
                  <div className="name">{api.name || key}</div>
                  {support.supported ? null : (
                    <div className="muted">{support.reason}</div>
                  )}
                  <details className="tech">
                    <summary>Technical details</summary>
                    <div className="rdns">
                      {api.rdns || key} · api {api.apiVersion ?? "?"}
                    </div>
                  </details>
                </div>
                <button
                  disabled={connecting || !support.supported}
                  title={support.supported ? undefined : support.reason}
                  onClick={() => void connect(api)}
                >
                  {!support.supported
                    ? support.label
                    : connecting
                      ? "Connecting…"
                      : "Connect"}
                </button>
              </div>
            );
          })}
          <p className="note">
            Connecting asks for permission on <strong>{networkId}</strong>. Nothing
            happens until you approve it there, and no key ever leaves the app.
          </p>
          <InstallLinks subject={subject} />
        </>
      )}
    </section>
  );
}
