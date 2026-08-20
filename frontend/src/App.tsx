import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Overview } from "./pages/Overview";
import { Register } from "./pages/Register";
import { Payroll } from "./pages/Payroll";
import { Peur } from "./pages/Peur";
import { useWallet } from "./wallet/WalletContext";

// preview is the only live network. preprod is listed but unselectable, so the
// picker says "more is coming" without letting anyone pick a network that
// cannot answer; flip `live` when its deployment lands. The local devnet stays
// out entirely — it is a developer's own machine, not a network to announce.
const NETWORKS = [
  { id: "preview", label: "preview", live: true },
  { id: "preprod", label: "preprod (coming soon)", live: false },
];

function Header({ isLanding }: { isLanding: boolean }) {
  const { networkId, setNetworkId, wallet, account, disconnect } = useWallet();

  return (
    <div className="top">
      <div>
        {/* The landing hero carries the wordmark itself, at full size; repeating
            it in the masthead directly above would just be an echo. */}
        {isLanding ? null : (
          <Link to="/" className="wordmark">
            IncomeLayer<span className="zk">ZK</span>
          </Link>
        )}
      </div>
      <div className="top-right">
        {/* Which testnet you are on is an operator's concern, not a visitor's.
            It belongs beside the app, not in the first thing anyone reads. */}
        {isLanding ? null : NETWORKS.length > 1 ? (
          <select
            className="net-select"
            aria-label="Network"
            value={networkId}
            onChange={(event) => setNetworkId(event.target.value)}
          >
            {NETWORKS.map((network) => (
              <option key={network.id} value={network.id} disabled={!network.live}>
                {network.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="net" title="Network">
            {NETWORKS[0].label}
          </span>
        )}
        {account && wallet ? (
          <div className="chip">
            <span className="dot" />
            {wallet.icon ? <img src={wallet.icon} alt="" /> : null}
            <span>{wallet.name || wallet.rdns}</span>
            <button className="ghost" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Nav() {
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="nav">
      <NavLink to="/app" className={link}>
        Overview
      </NavLink>
      <NavLink to="/payroll" className={link}>
        Payroll
      </NavLink>
      <NavLink to="/peur" className={link}>
        pEUR
      </NavLink>
      <NavLink to="/register" className={link}>
        Register
      </NavLink>
    </nav>
  );
}

export function App() {
  const { error } = useWallet();
  // The landing page is the product's front door, not part of the app shell:
  // it should not be framed by a network picker and contract navigation.
  const isLanding = useLocation().pathname === "/";

  return (
    <main className={isLanding ? "wide" : undefined}>
      <Header isLanding={isLanding} />
      {isLanding ? null : <Nav />}
      {error ? <p className="status error">{error}</p> : null}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Overview />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/peur" element={<Peur />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Routes>
    </main>
  );
}
