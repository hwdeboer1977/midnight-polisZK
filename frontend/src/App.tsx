import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Public } from "./pages/Public";
import { Operator } from "./pages/Operator";
import { EmployerPayroll } from "./pages/EmployerPayroll";
import { EmployerEmployees } from "./pages/EmployerEmployees";
import { EmployerSettings } from "./pages/EmployerSettings";
import { EmployerHistory } from "./pages/EmployerHistory";
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
 * The four questions an employer has, one per tab.
 *
 *   Payroll   — what do I need to do this month?
 *   Employees — who works here?
 *   History   — what happened in previous months?
 *   Settings  — how is my company configured?
 *
 * This was `Overview / Setup / Roster / History`, which named the pages after
 * their implementation rather than their use. Two of those were actively
 * misleading. **Overview** was not an overview — it is where the month is
 * actually run, and calling the workspace a summary sent an employer looking
 * elsewhere for the work. **Setup** stops being setup the moment onboarding is
 * done; the page itself had already noticed, and re-titled its own heading
 * "Reference", which is a page arguing with its own tab. A permanent tab named
 * after a finished task makes a working product feel perpetually half-built.
 *
 * `Roster` → `Employees` for a plainer reason: it is what employers call them.
 *
 * The prerequisite locks stay. Each stage names what is missing rather than
 * failing silently — a new employer clicking straight to History used to land
 * on another wallet-connect screen, which made four tabs feel like four
 * separate tools rather than one workflow. Settings is never locked: it is
 * where an employer goes to fix the thing the lock is complaining about.
 */
const EMPLOYER_TABS: {
  to: string;
  label: string;
  end?: boolean;
  needs?: "contract" | "employees";
  blocked?: string;
}[] = [
  { to: "/employer", label: "Payroll", end: true },
  {
    to: "/employer/employees",
    label: "Employees",
    needs: "contract",
    blocked: "Register and get your payroll contract first",
  },
  {
    to: "/employer/history",
    label: "History",
    needs: "contract",
    blocked: "Register and get your payroll contract first",
  },
  { to: "/employer/settings", label: "Settings" },
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

        <Route path="/employer" element={<EmployerPayroll />} />
        <Route path="/employer/history" element={<EmployerHistory />} />
        <Route path="/employer/employees" element={<EmployerEmployees />} />
        <Route path="/employer/settings" element={<EmployerSettings />} />

        <Route path="/employee" element={<Employee />} />
        <Route path="/employee/benefit" element={<EmployeeBenefit />} />

        {/* The old flat routes, kept so a bookmark or a pasted link still lands
            somewhere sensible rather than on "page not found". */}
        <Route path="/payroll" element={<Navigate to="/employer/history" replace />} />
        {/* The previous employer IA. Every link written or bookmarked under
            Overview / Setup / Roster still lands on the page that took its
            job. */}
        <Route path="/employer/overview" element={<Navigate to="/employer" replace />} />
        <Route path="/employer/roster" element={<Navigate to="/employer/employees" replace />} />
        <Route path="/employer/setup" element={<Navigate to="/employer/settings" replace />} />
        <Route path="/employer/payroll" element={<Navigate to="/employer/history" replace />} />
        <Route path="/register" element={<Navigate to="/employer/settings" replace />} />
        <Route path="/peur" element={<Navigate to="/employer/settings" replace />} />
        {/* Claim was a top-level area until it became Employee → Unemployment
            benefit. Every link written while it was one still lands. */}
        <Route path="/claim" element={<Navigate to="/employee/benefit" replace />} />

        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Routes>
    </main>
  );
}
