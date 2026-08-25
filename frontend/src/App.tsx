import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Public } from "./pages/Public";
import { EmployerOverview } from "./pages/EmployerOverview";
import { EmployerRoster } from "./pages/EmployerRoster";
import { EmployerSetup } from "./pages/EmployerSetup";
import { Payroll } from "./pages/Payroll";
import { Employee } from "./pages/Employee";
import { Claim } from "./pages/Claim";
import { useEmployerStage } from "./lib/useEmployerStage";
import { HeaderWallet } from "./components/HeaderWallet";
import { useWallet } from "./wallet/WalletContext";

// preview is the only live network. preprod is listed but unselectable, so the
// picker says "more is coming" without letting anyone pick a network that
// cannot answer; flip `live` when its deployment lands. The local devnet stays
// out entirely — it is a developer's own machine, not a network to announce.
const NETWORKS = [
  { id: "preview", label: "preview", live: true },
  { id: "preprod", label: "preprod (coming soon)", live: false },
];

function Header({
  showWordmark,
  showNetwork,
}: {
  showWordmark: boolean;
  showNetwork: boolean;
}) {
  const { networkId, setNetworkId } = useWallet();

  return (
    <div className="top">
      <div>
        {/* Hidden wherever the page below already carries the name at full
            size — the landing hero and the public network page both do, and a
            second wordmark 80px above is an echo, not navigation. */}
        {showWordmark ? (
          <Link to="/" className="wordmark">
            IncomeLayer<span className="zk">ZK</span>
          </Link>
        ) : null}
      </div>
      <div className="top-right">
        {/* Which testnet you are on is an operator's concern, not a visitor's.
            It belongs beside the app, not in the first thing anyone reads. */}
        {!showNetwork ? null : NETWORKS.length > 1 ? (
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
        <HeaderWallet />
      </div>
    </div>
  );
}

/**
 * Four areas, in the order the privacy story reads: the public sees the system,
 * an employer sees its own payroll, an employee sees their own records, and a
 * claim proves something about those records without revealing them.
 *
 * There is no "unemployed" area, and that is a position rather than an
 * omission: a system that has to classify you before it can help you has
 * already published the thing you most wanted kept private. Claiming is
 * something you do, not something you are.
 *
 * pEUR is not here either. A nav item named after a smart-contract module
 * describes the codebase rather than the system; it lives under Employer →
 * Setup, where someone inspecting the architecture will look for it.
 */
const AREAS = [
  { to: "/app", label: "Public" },
  { to: "/employer", label: "Employer" },
  { to: "/employee", label: "Employee" },
  { to: "/claim", label: "Claim" },
];

/**
 * The employer lifecycle, in order: see where you are, connect and register,
 * add the people, pay them.
 *
 * Each stage names its prerequisite. A new employer clicking straight to
 * Payroll used to land on another wallet-connect screen, which made four tabs
 * feel like four separate tools rather than one workflow; a locked tab says
 * what is missing instead.
 */
const EMPLOYER_TABS: {
  to: string;
  label: string;
  end?: boolean;
  needs?: "contract" | "employees";
  blocked?: string;
}[] = [
  { to: "/employer", label: "Overview", end: true },
  { to: "/employer/setup", label: "Setup" },
  {
    to: "/employer/roster",
    label: "Roster",
    needs: "contract",
    blocked: "Register and get your payroll contract first",
  },
  {
    // Gated on the contract, not on employees existing. Adding an employee has
    // no store of its own — the only evidence a roster was assembled is a filed
    // period, and filing one is what this tab does. Locking it behind employees
    // means a new employer can never reach the page that would unlock it.
    to: "/employer/payroll",
    label: "Payroll",
    needs: "contract",
    blocked: "Register and get your payroll contract first",
  },
];

function Nav() {
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="nav">
      {AREAS.map((area) => (
        <NavLink key={area.to} to={area.to} className={link}>
          {area.label}
        </NavLink>
      ))}
    </nav>
  );
}

function EmployerTabs() {
  const stage = useEmployerStage();
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "subnav-link active" : "subnav-link";

  // Nothing is locked while the answer is still being read: a tab that greys
  // out and then un-greys a second later reads as a bug.
  const unlocked = (needs?: "contract" | "employees") =>
    !needs || stage.loading || (needs === "contract" ? stage.contract : stage.employees);

  const setupDone = stage.registered && stage.contract;

  return (
    <nav className="subnav">
      {EMPLOYER_TABS.map((tab) =>
        unlocked(tab.needs) ? (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={link}>
            {tab.label}
            {tab.to === "/employer/setup" && setupDone ? (
              <span className="tab-done" aria-label="complete">
                ✓
              </span>
            ) : null}
          </NavLink>
        ) : (
          <span key={tab.to} className="subnav-link locked" title={tab.blocked}>
            <span aria-hidden="true">🔒</span> {tab.label}
          </span>
        )
      )}
    </nav>
  );
}

export function App() {
  const { error } = useWallet();
  const pathname = useLocation().pathname;
  // The landing page is the product's front door, not part of the app shell:
  // it should not be framed by a network picker and area navigation.
  const isLanding = pathname === "/";
  // The public page opens with the wordmark as its own heading.
  const isPublic = pathname === "/app";
  const inEmployer = pathname.startsWith("/employer");

  return (
    <main className={isLanding ? "wide" : undefined}>
      <Header showWordmark={!isLanding && !isPublic} showNetwork={!isLanding} />
      {isLanding ? null : <Nav />}
      {inEmployer ? <EmployerTabs /> : null}
      {error ? <p className="status error">{error}</p> : null}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Public />} />

        <Route path="/employer" element={<EmployerOverview />} />
        <Route path="/employer/payroll" element={<Payroll />} />
        <Route path="/employer/roster" element={<EmployerRoster />} />
        <Route path="/employer/setup" element={<EmployerSetup />} />

        <Route path="/employee" element={<Employee />} />
        <Route path="/claim" element={<Claim />} />

        {/* The old flat routes, kept so a bookmark or a pasted link still lands
            somewhere sensible rather than on "page not found". */}
        <Route path="/payroll" element={<Navigate to="/employer/payroll" replace />} />
        <Route path="/register" element={<Navigate to="/employer/setup" replace />} />
        <Route path="/peur" element={<Navigate to="/employer/setup" replace />} />

        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Routes>
    </main>
  );
}
