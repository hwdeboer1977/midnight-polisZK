import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Public } from "./pages/Public";
import { Operator } from "./pages/Operator";
import { EmployerOverview } from "./pages/EmployerOverview";
import { EmployerRoster } from "./pages/EmployerRoster";
import { EmployerSetup } from "./pages/EmployerSetup";
import { Payroll } from "./pages/Payroll";
import { Employee } from "./pages/Employee";
import { EmployeeBenefit } from "./pages/EmployeeBenefit";
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
 * the operator runs it, an employer sees its own payroll, an employee sees their
 * own records.
 *
 * Operator is listed for everyone rather than revealed to the platform key,
 * even though every card on it is. A tab that materialises for one wallet makes
 * the shape of the system depend on who is looking, and the honest answer to
 * "who moves the money into the national contracts" is a page anyone can open
 * and find locked — not a page that does not appear to exist.
 *
 * Claim used to be a fourth, and moving it under Employee is a position rather
 * than tidying. There is no "unemployed" area because a system that has to
 * classify you before it can help you has already published the thing you most
 * wanted kept private — and a top-level Claim tab was quietly reintroducing
 * that role through the navigation. A claimant is an employee: same wallet,
 * same records, a different question asked of them. Claiming is something you
 * do, not something you are.
 *
 * It also fixes an ordering trap. The claim key must exist before the employer
 * files a write-once termination, and the page that said so was not the page
 * anyone opened on the day they were dismissed.
 *
 * pEUR is not here either. A nav item named after a smart-contract module
 * describes the codebase rather than the system; it lives under Employer →
 * Setup, where someone inspecting the architecture will look for it.
 */
const AREAS = [
  { to: "/app", label: "Public" },
  { to: "/operator", label: "Operator" },
  { to: "/employer", label: "Employer" },
  { to: "/employee", label: "Employee" },
];

/**
 * The two questions an employee asks of the same records: what was I paid, and
 * what am I owed now that it has stopped.
 *
 * Neither is locked. Unlike the employer tabs, there is no prerequisite to
 * state — the benefit tab is where the claim key is created, which is precisely
 * the thing that must happen BEFORE anything else, so gating it on employment
 * having ended would close the window it exists to keep open.
 */
const EMPLOYEE_TABS = [
  { to: "/employee", label: "Salary", end: true },
  { to: "/employee/benefit", label: "Unemployment benefit" },
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
    // "History", not "Payroll": running one moved to Overview, where it sits in
    // the month it belongs to. This page is the record — every period filed,
    // and the payslips for them — and two tabs that both looked like the place
    // to file was the confusion worth removing.
    to: "/employer/payroll",
    label: "History",
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

function EmployeeTabs() {
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "subnav-link active" : "subnav-link";

  return (
    <nav className="subnav">
      {EMPLOYEE_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={link}>
          {tab.label}
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

  // No tick on Setup any more.
  //
  // It meant "a wallet is connected and controls a contract", which is a
  // fraction of setting up — and once Setup became a reference page it stopped
  // being a thing that completes at all. Meanwhile the checklist below it can
  // read "0 of 2 claim-key hashes collected", so a tick in the tab was
  // announcing completion over the top of outstanding work.

  return (
    <nav className="subnav">
      {EMPLOYER_TABS.map((tab) =>
        unlocked(tab.needs) ? (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={link}>
            {tab.label}
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
  // Ordered so /employer does not also match the employee prefix — it does not,
  // but the two reads sit next to each other and the asymmetry is worth naming.
  const inEmployee = pathname.startsWith("/employee");

  return (
    <main className={isLanding ? "wide" : undefined}>
      <Header showWordmark={!isLanding && !isPublic} showNetwork={!isLanding} />
      {isLanding ? null : <Nav />}
      {inEmployer ? <EmployerTabs /> : null}
      {inEmployee ? <EmployeeTabs /> : null}
      {error ? <p className="status error">{error}</p> : null}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Public />} />
        <Route path="/operator" element={<Operator />} />

        <Route path="/employer" element={<EmployerOverview />} />
        <Route path="/employer/payroll" element={<Payroll />} />
        <Route path="/employer/roster" element={<EmployerRoster />} />
        <Route path="/employer/setup" element={<EmployerSetup />} />

        <Route path="/employee" element={<Employee />} />
        <Route path="/employee/benefit" element={<EmployeeBenefit />} />

        {/* The old flat routes, kept so a bookmark or a pasted link still lands
            somewhere sensible rather than on "page not found". */}
        <Route path="/payroll" element={<Navigate to="/employer/payroll" replace />} />
        <Route path="/register" element={<Navigate to="/employer/setup" replace />} />
        <Route path="/peur" element={<Navigate to="/employer/setup" replace />} />
        {/* Claim was a top-level area until it became Employee → Unemployment
            benefit. Every link written while it was one still lands. */}
        <Route path="/claim" element={<Navigate to="/employee/benefit" replace />} />

        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Routes>
    </main>
  );
}
