import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Overview } from "./pages/Overview";
import { Register } from "./pages/Register";
import { Payroll } from "./pages/Payroll";
import { Peur } from "./pages/Peur";
import { useWallet } from "./wallet/WalletContext";

const NETWORKS = [
  { id: "preview", label: "preview" },
  { id: "preprod", label: "preprod" },
  { id: "undeployed", label: "local devnet" },
];

function Header() {
  const { networkId, setNetworkId, wallet, account, disconnect } = useWallet();

  return (
    <div className="top">
      <div>
        <Link to="/" className="wordmark">
          midnight-polis<span className="zk">ZK</span>
        </Link>
        <p className="sub">Private payroll on Midnight</p>
      </div>
      <div className="top-right">
        <select
          aria-label="Network"
          value={networkId}
          onChange={(event) => setNetworkId(event.target.value)}
        >
          {NETWORKS.map((network) => (
            <option key={network.id} value={network.id}>
              {network.label}
            </option>
          ))}
        </select>
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
      <Header />
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
