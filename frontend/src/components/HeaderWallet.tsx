import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../wallet/WalletContext";

/**
 * Connect and disconnect, in the header, on every page.
 *
 * The header used to render the connected chip and *nothing at all* when
 * disconnected, so connecting was only possible from whichever pages happened
 * to embed a `WalletPicker`. Someone landing on Employer or Claim saw a page
 * telling them to connect a wallet, with no way to do it from where they were
 * looking.
 *
 * With one wallet installed this is a single button and no menu — the common
 * case should not cost a click to disambiguate between one option. The menu
 * appears only when there is a genuine choice.
 *
 * Wallet names and icons come from the extension and are attacker controlled:
 * the name is rendered as text, the icon only ever as an `img` source. Same
 * rule as `WalletPicker`, which this deliberately does not replace — that one
 * carries the explanation an employer needs when choosing a signing key, and
 * this one is a control.
 */
export function HeaderWallet() {
  const { available, account, wallet, connect, connecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape. A menu in a header that can only be
  // dismissed by choosing something is a trap on a page this small.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (account && wallet) {
    return (
      <div className="chip">
        <span className="dot" />
        {wallet.icon ? <img src={wallet.icon} alt="" /> : null}
        <span>{wallet.name || wallet.rdns}</span>
        <button className="ghost" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <Link className="chip chip-link" to="/employee">
        No wallet detected
      </Link>
    );
  }

  if (available.length === 1) {
    const only = available[0]!;
    return (
      <button
        className="connect"
        disabled={connecting}
        onClick={() => void connect(only.api)}
      >
        {connecting ? "Connecting…" : `Connect ${only.api.name || only.key}`}
      </button>
    );
  }

  return (
    <div className="wallet-menu" ref={box}>
      <button className="connect" disabled={connecting} onClick={() => setOpen((v) => !v)}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open ? (
        <div className="wallet-menu-list">
          {available.map(({ key, api }) => (
            <button
              key={key}
              disabled={connecting}
              onClick={() => {
                setOpen(false);
                void connect(api);
              }}
            >
              {api.icon ? <img src={api.icon} alt="" /> : null}
              <span>{api.name || key}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
