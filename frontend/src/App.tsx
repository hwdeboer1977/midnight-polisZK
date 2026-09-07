// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Public } from "./pages/Public";
import { Operator } from "./pages/Operator";
import { TaxRules } from "./pages/TaxRules";
import { EmployerPayroll } from "./pages/EmployerPayroll";
import { EmployerEmployees } from "./pages/EmployerEmployees";
import { EmployerSettings } from "./pages/EmployerSettings";
import { EmployerHistory } from "./pages/EmployerHistory";
import { Employee } from "./pages/Employee";
import { EmployeeBenefit } from "./pages/EmployeeBenefit";
import { useEmployerStage } from "./lib/useEmployerStage";
import { HeaderWallet } from "./components/HeaderWallet";
import {
  CONTACT_EMAIL,
  POSITION_PAPER_URL,
  REPO_URL,
  WHITE_PAPER_URL,
} from "./lib/links";
import { useWallet } from "./wallet/WalletContext";

// preview is the only live network. preprod is listed but unselectable, so the
// picker says "more is coming" without letting anyone pick a network that
// cannot answer; flip `live` when its deployment lands. The local devnet stays
// out entirely — it is a developer's own machine, not a network to announce.
const NETWORKS = [
  { id: "preview", label: "preview", live: true },
  { id: "preprod", label: "preprod (coming soon)", live: false },
];

/**
 * The masthead's one call to action, outside the docs nav so it does not pick
 * up that group's separator dots.
 *
 * It is a mailto, but a mailto alone is not enough: the browser only acts on
 * one if a mail handler is registered, and on a desktop with no mail client
 * installed the click does nothing whatsoever — a button that appears dead.
 * So the click also puts the address on the clipboard. Where a handler exists
 * the link still hands off to it as before; where none does, the reader comes
 * away with the address instead of with nothing. Hovering shows it too, for
 * anyone who would rather read it than trust a button.
 */
function ContactButton() {
  const [copied, setCopied] = useState(false);

  return (
    <a
      className="top-contact"
      href={`mailto:${CONTACT_EMAIL}`}
      title={CONTACT_EMAIL}
      onClick={() => {
        // Deliberately not preventing the default: the mail client should
        // still open for the people who have one.
        navigator.clipboard?.writeText(CONTACT_EMAIL).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          },
          // Clipboard access is refused on an insecure origin and can be
          // denied outright. The mailto is unaffected, so there is nothing to
          // report — swallow it rather than logging at a visitor.
          () => {}
        );
      }}
    >
      {copied ? "Address copied" : "Contact"}
    </a>
  );
}

function Header({
  showWordmark,
  showNetwork,
  showWallet,
  showDocs,
}: {
  showWordmark: boolean;
  showNetwork: boolean;
  showWallet: boolean;
  showDocs: boolean;
}) {
  const { networkId, setNetworkId } = useWallet();

  return (
    <div className="top">
      <div>
        {/* Hidden only on the landing page, whose hero IS the wordmark.
            
            It used to be hidden on the public area too, on the grounds that
            the page below already carries the name at full size and a second
            wordmark 80px above is an echo. True as typography and wrong as
            navigation: this is the only route back to the front door, so
            Overview and Tax parameters were the two pages in the app with no
            way out, and an echo beats a dead end. The two do read close on
            /app, where the heading is the wordmark plus one word — if that
            wants fixing, it is the heading that should change, not the only
            link home. */}
        {showWordmark ? (
          <Link to="/" className="wordmark">
            {/* The mark alone, not the full lockup — that one carries the
                wordmark and two taglines of its own, and a masthead is not the
                place to say the name three times. Decorative here, so it is
                hidden from readers: the link's text already names it. */}
            <img src="/logo-mark.png" alt="" aria-hidden="true" />
            <span>
              IncomeLayer<span className="zk">ZK</span>
            </span>
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
        {/* The landing page asks nobody to connect. A wallet button above the
            first sentence of a payroll product is a request for commitment
            from a reader who has not yet been told what the thing does, and
            the page's own argument is that understanding comes first. The
            slot it vacates goes to the documents, which is what a visitor
            standing here actually wants next — they were buried at the
            bottom of a long page, four screens past the point where a policy
            reader decides whether to keep reading. */}
        {showDocs ? (
          <nav className="top-docs" aria-label="Documents">
            {POSITION_PAPER_URL ? (
              <a href={POSITION_PAPER_URL} target="_blank" rel="noreferrer noopener">
                Position paper
              </a>
            ) : null}
            {WHITE_PAPER_URL ? (
              <a href={WHITE_PAPER_URL} target="_blank" rel="noreferrer noopener">
                White paper
              </a>
            ) : null}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
          </nav>
        ) : null}
        {showDocs && CONTACT_EMAIL ? <ContactButton /> : null}
        {showWallet ? <HeaderWallet /> : null}
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
 * What the network publishes, in two parts.
 *
 * The overview is the figures; the parameters are the schedule that produced
 * them. They were one page and a disclosure, which buried the half that makes
 * the other half checkable — a total nobody can reproduce is a claim, not a
 * proof, and the rules behind it should not be three clicks into "Technical
 * details".
 *
 * Neither is locked and neither needs a wallet. Nothing here is anyone's
 * private business.
 */
const PUBLIC_TABS = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/rules", label: "Tax parameters" },
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

/**
 * The shell's one status line, directly under the navigation on every page.
 *
 * This was a bare orange sentence rendered between the nav and each page's
 * title, at the same weight as the page's own content. A wallet that has not
 * finished syncing is a temporary system state, not a level of the information
 * hierarchy — but sitting where it did, it read as the first thing each page
 * had to say, on nine pages at once.
 *
 * So: one compact strip, one position, a dot rather than a paragraph, and
 * nothing at all once the condition clears.
 */
function GlobalStatus() {
  const { error } = useWallet();
  if (!error) return null;
  return (
    <div className="global-status" role="status">
      <span className="global-status-dot" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

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

function PublicTabs() {
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "subnav-link active" : "subnav-link";

  return (
    <nav className="subnav">
      {PUBLIC_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={link}>
          {tab.label}
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
  const pathname = useLocation().pathname;
  // The landing page is the product's front door, not part of the app shell:
  // it should not be framed by a network picker and area navigation.
  const isLanding = pathname === "/";
  const inPublic = pathname === "/app" || pathname.startsWith("/app/");
  const inEmployer = pathname.startsWith("/employer");
  // Ordered so /employer does not also match the employee prefix — it does not,
  // but the two reads sit next to each other and the asymmetry is worth naming.
  const inEmployee = pathname.startsWith("/employee");

  return (
    <main className={isLanding ? "wide" : undefined}>
      <Header
        showWordmark={!isLanding}
        showNetwork={!isLanding}
        showWallet={!isLanding}
        showDocs={isLanding}
      />
      {isLanding ? null : <Nav />}
      {inPublic ? <PublicTabs /> : null}
      {inEmployer ? <EmployerTabs /> : null}
      {inEmployee ? <EmployeeTabs /> : null}
      <GlobalStatus />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Public />} />
        {/* A tab of the public area, not a page of its own: an employer is held
            to these rules rather than owning them, and the totals on the
            overview cannot be checked without them. */}
        <Route path="/app/rules" element={<TaxRules />} />
        <Route path="/operator" element={<Operator />} />

        <Route path="/employer" element={<EmployerPayroll />} />
        <Route path="/employer/history" element={<EmployerHistory />} />
        <Route path="/employer/employees" element={<EmployerEmployees />} />
        <Route path="/employer/settings" element={<EmployerSettings />} />

        <Route path="/employee" element={<Employee />} />
        <Route path="/employee/benefit" element={<EmployeeBenefit />} />

        {/* The old flat routes, kept so a bookmark or a pasted link still lands
            somewhere sensible rather than on "page not found". */}
        <Route path="/rules" element={<Navigate to="/app/rules" replace />} />
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
