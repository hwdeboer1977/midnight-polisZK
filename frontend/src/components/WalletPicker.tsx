import { InstallHelp, InstallLinks } from "./InstallHelp";
import { useWallet } from "../wallet/WalletContext";

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
          {available.map(({ key, api }) => (
            <div className="wallet" key={key}>
              {/* Name and icon come from the extension and are attacker
                  controlled: the name is rendered as text, the icon only ever
                  as an img source. */}
              {api.icon ? <img src={api.icon} alt="" /> : null}
              <div className="meta">
                <div className="name">{api.name || key}</div>
                <details className="tech">
                  <summary>Technical details</summary>
                  <div className="rdns">
                    {api.rdns || key} · api {api.apiVersion ?? "?"}
                  </div>
                </details>
              </div>
              <button disabled={connecting} onClick={() => void connect(api)}>
                {connecting ? "Connecting…" : "Connect"}
              </button>
            </div>
          ))}
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
