// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { EXPLORERS } from "../lib/chain";
import { formatPeur, formatPeurTile, group } from "../lib/format";
import { useNetworkStats } from "../lib/useNetworkStats";
import { useWallet } from "../wallet/WalletContext";

/**
 * What the network publishes about itself.
 *
 * Structured around the four questions a first-time reader actually has, in the
 * order they have them: how big is this, what is private, where did the
 * contributions go, and can I check any of it. Each one gets a headline figure
 * and one sentence; everything else is one disclosure away.
 *
 * ── What was moved, and why moved rather than reworded ─────────────────────
 *
 * This page used to lead with, among other things, a card headed **"Payroll
 * withholding — assessed, not collected"** carrying four figures, two of them
 * zero. Every word of it was true and it was in the wrong place: it describes
 * how far the implementation has got, not what the system does, and a visitor
 * met it before they had seen that the machinery underneath works. It says the
 * same thing in a line under Technical details now.
 *
 * The same treatment for the test-token supply, the permissionless-minting
 * warning, the pEUR issuer notes and the older-contracts caveat. None of it is
 * deleted — a page whose whole claim is that its figures are checkable cannot
 * start hiding the awkward ones — but a diagnostic nobody asked for should be
 * opened deliberately rather than met on the way past.
 *
 * ── On nesting ─────────────────────────────────────────────────────────────
 *
 * Cards inside cards inside sections were doing the work whitespace and a rule
 * should do. There is one card left — the payroll identity, which earns a box
 * because it is the single thing worth looking at longest — and everything else
 * is a titled band separated by a hairline.
 *
 * Nothing here needs a wallet, because nothing here is anyone's private
 * business.
 */
export function Public() {
  const { networkId } = useWallet();
  const { stats, loading, error } = useNetworkStats(networkId);

  const explorer = EXPLORERS[networkId] ?? "";
  const peurContract = stats.deployed.find((d) => d.deployment.contractName === "peur");
  const payrollContracts = stats.deployed.filter(
    (d) => d.deployment.contractName === "payroll"
  );

  const money = (value: bigint) => `€${formatPeurTile(value)}`;
  const exact = (value: bigint) => `Exactly €${formatPeur(value)}`;

  return (
    <>
      <section className="net-head">
        <h1 className="brand-head">
          IncomeLayer<span className="zk">ZK</span> Network
        </h1>
        <p className="lede">
          Private payroll and social protection with publicly verifiable
          aggregates. Every figure below is read directly from on-chain contract
          state — no individual salary, identity or payment amount is exposed.
        </p>
      </section>

      {error ? <p className="status error">Could not read the chain: {error}</p> : null}

      {/* The ambiguity every figure below inherits, settled once: none of this
          is a snapshot of today or of the latest run. */}
      <p className="totals-scope">
        <span className="live-dot" aria-hidden="true" /> All-time network totals ·
        read from on-chain state
      </p>

      {/* ── 1. How big is the network? ──────────────────────────────────────
          Three counts, named exactly. This was one line reading
          "1 employer · 2 workers · 1 payroll period", which set the scale of the
          pilot in the same breath as its terminology: "workers" appears nowhere
          else in a product built on Employer and Employee, and a bare count
          leaves a reader guessing whether a period means filed or settled. */}
      <Band title="Network activity" variant="plain">
        <div className="figures three">
          <Figure
            value={loading ? "…" : group(BigInt(stats.employers))}
            label="Registered employers"
            note={
              stats.contracts > stats.employers
                ? `${group(BigInt(stats.contracts))} payroll contracts deployed`
                : "each holding one payroll contract"
            }
          />
          <Figure
            value={loading ? "…" : group(BigInt(stats.workersCovered))}
            // Not "Employees": nothing on chain is an employee registry, and a
            // count that implies one would be describing a record the contract
            // does not keep. This is who appears on the newest filed period of
            // each employer — which is what the ledger can actually answer.
            label="Employees on latest payroll"
            note="summed across every employer's most recent filed period"
          />
          <Figure
            value={loading ? "…" : group(BigInt(stats.periodsFiled))}
            label="Payroll periods filed"
            note={
              stats.periodsSettled === stats.periodsFiled
                ? "all fully settled"
                : `${group(BigInt(stats.periodsSettled))} fully settled`
            }
          />
        </div>
      </Band>

      {/* ── 2. What has been paid, ever ─────────────────────────────────────
          Four published totals and the identity between them. This was one
          enormous gross figure with the other three beneath it as satellites,
          which made the page open on a number whose meaning — all time? this
          month? — it never stated. The four are equals: each is its own total
          read from the contract, and the page does no arithmetic beyond the
          percentages, so a reader can check them against each other and catch
          us if they disagree. */}
      <Band title="Cumulative payroll" variant="feature">
        <div className="figures four">
          <Figure
            value={loading ? "…" : money(stats.payrollFiled)}
            exact={loading ? undefined : exact(stats.payrollFiled)}
            label="Gross payroll"
            note={loading ? "all periods, all employers" : "100% · all periods"}
          />
          <Figure
            value={loading ? "…" : money(stats.taxFiled)}
            exact={loading ? undefined : exact(stats.taxFiled)}
            label="Income tax"
            note={share(stats.taxFiled, stats.payrollFiled, loading)}
          />
          <Figure
            value={loading ? "…" : money(stats.socialFiled)}
            exact={loading ? undefined : exact(stats.socialFiled)}
            label="Social contributions"
            note={share(stats.socialFiled, stats.payrollFiled, loading)}
          />
          <Figure
            value={loading ? "…" : money(stats.netFiled)}
            exact={loading ? undefined : exact(stats.netFiled)}
            label="Net salaries"
            note={share(stats.netFiled, stats.payrollFiled, loading)}
          />
        </div>

        {/* The identity itself, on one line. Four figures in a row state the
            terms; this states that they add up, which is the claim anyone can
            check without seeing a single employee's figures. */}
        {loading ? null : (
          <p className="equation">
            <strong>{money(stats.payrollFiled)}</strong> gross{" "}
            <span className="op">=</span> <strong>{money(stats.taxFiled)}</strong> tax{" "}
            <span className="op">+</span> <strong>{money(stats.socialFiled)}</strong>{" "}
            contributions <span className="op">+</span>{" "}
            <strong>{money(stats.netFiled)}</strong> net
            {stats.payrollSettled === stats.payrollFiled && stats.payrollFiled > 0n ? (
              <span className="settled-mark"> · fully settled</span>
            ) : null}
          </p>
        )}

        <Why>
          <p className="note">
            Anyone can check that gross equals tax plus contributions plus net,
            across every employer, without seeing a single employee's figures.
            The circuit enforces the identity <em>per employee</em>, not only on
            these totals — balancing an overstatement for one against an
            understatement for another would satisfy the sums and lie about both.
          </p>
          <p className="note">
            The amounts are not filed by employers. They are computed inside the
            circuit from the gross salary and a published rule set, so an
            employer can neither choose a rate nor pick a cheaper version of the
            rules — <Link to="/app/rules">the rules, and which months are pinned
            to them</Link>.
          </p>
          <p className="note">
            Amounts are in <strong>pEUR</strong>, the euro stablecoin salaries
            settle in, and are cumulative across every period ever filed on this
            network. Figures round to two decimals; hover any of them for the
            exact minor-unit value.
          </p>
        </Why>
      </Band>

      {/* ── 2. What is private? ─────────────────────────────────────────────
          Two figures and one sentence. The argument ran to three paragraphs and
          it is the best writing on the page, which is exactly why it was burying
          the number that proves it. */}
      <Band title="Privacy" variant="quiet">
        <div className="figures three">
          <Figure
            value={loading ? "…" : group(BigInt(stats.commitments))}
            label="Salary records committed"
            note="one sealed commitment per employee, per period"
          />
          {/* The two zeros are the claim the rest of the page supports, so they
              are figures rather than a sentence — and green, because here a zero
              is the achievement rather than an absence. */}
          <Figure
            value="0"
            label="Individual salaries exposed"
            note="no ledger field holds one"
            tone="good"
          />
          <Figure
            value="0"
            label="Identities exposed"
            note="no name, address or payee is published"
            tone="good"
          />
        </div>
        <p className="band-line">
          Individual payroll records stay private. Only the verified aggregate
          totals above are published.
        </p>
        <Why label="How privacy works">
          <p className="note">
            Each employee's salary for each period is sealed into one opaque
            commitment. The commitment is what the chain holds; the figure behind
            it stays on the employer's machine and reaches the employee in a
            payslip. Nothing on chain opens it.
          </p>
          <p className="note">
            What is <em>not</em> here: no individual salary, no employee name or
            address, no holder of any pEUR balance, and no amount for any single
            payment. Those are not withheld from this page — the ledger has no
            field for them, so they were never published in the first place.
          </p>
          <p className="note">
            pEUR is shielded, so a balance is a set of coins in the Zswap tree
            rather than a number attached to an address. Nobody's holding is
            public and neither is the value of any single transfer.
          </p>
        </Why>
      </Band>

      {/* ── 3. What happened to the social contributions? ───────────────────
          The question the old page answered in two places at once and in
          different units: an ASSESSED figure up top, and a
          WITHHELD-FROM-BENEFITS figure down here, neither of which is what
          reached the fund. `contributed` is the fund's own `contributedTotal`,
          so the money is followed rather than described. */}
      <Band title="Social protection" variant="feature" accent="ok">
        {stats.fund === null ? (
          <p className="band-line">
            {loading
              ? "Reading the fund…"
              : `No unemployment fund is deployed on ${networkId}.`}
          </p>
        ) : (
          <>
            <div className="figures four">
              <Figure
                value={loading ? "…" : money(stats.fund.contributed)}
                exact={loading ? undefined : exact(stats.fund.contributed)}
                label="Contributions received"
                note="money in, from every employer"
                tone="good"
              />
              {/* The question a visitor asks next, answered with the reason
                  rather than a figure. There is no published total of benefits
                  paid and there deliberately cannot be one: benefits leave as
                  shielded coins, and a running total beside `claimsPaid` would
                  give away the average benefit. Saying so here is stronger than
                  omitting the row — this is the property the fund exists to
                  demonstrate, met at the moment someone looks for it. */}
              <Figure
                value="Not published"
                label="Benefits paid"
                note="shielded — see below"
                tone="sealed"
              />
              <Figure
                value={loading ? "…" : group(BigInt(stats.fund.claimsPaid))}
                label="Claims settled"
                note="counted, never itemised"
              />
              <Figure
                value={loading ? "…" : group(BigInt(stats.fund.claimTrees))}
                label="Claimable periods"
                note="months with a published claim tree"
              />
            </div>

            {/* The counterpart to the payroll identity, and deliberately the
                same shape. Where that one ends in a figure, this one ends in a
                thing a normal dashboard would put an amount in — which is the
                claim, made visually rather than argued. */}
            {loading ? null : (
              <>
                <p className="equation ok">
                  <strong>{money(stats.fund.contributed)}</strong> contributions{" "}
                  <span className="op">→</span> Social Protection Fund{" "}
                  <span className="op">→</span> Private benefit payments
                </p>
                <p className="equation-sub">
                  {stats.fund.claimsPaid === 0
                    ? "No claim settled yet"
                    : `${group(BigInt(stats.fund.claimsPaid))} claim${
                        stats.fund.claimsPaid === 1 ? "" : "s"
                      } settled`}
                  <span className="dot">·</span> amount private
                  <span className="dot">·</span>
                  {group(BigInt(stats.fund.claimTrees))} claimable period
                  {stats.fund.claimTrees === 1 ? "" : "s"}
                </p>
              </>
            )}

            <p className="band-line">
              A claim proves the claimant worked long enough and that their final
              salary met the rules, without revealing either. What settles on
              chain is a count and one opaque nullifier.
            </p>

            <Why label="What the fund does and does not publish">
              <p className="note">
                <strong>Contributions received is money in, not a balance.</strong> The
                fund's balance is not published at all: it holds a shielded coin,
                so this fund is deliberately not publicly solvent — and that
                cannot be fixed without also revealing what each claimant
                received, because successive balances would give away the
                differences between them.
              </p>
              <p className="note">
                Each claimant is indistinguishable from everyone terminated in
                the same month across every employer here. Never who claimed,
                which employer they left, or what they received.
              </p>
              <p className="note">
                <strong>Benefits paid is not published, and cannot be.</strong>{" "}
                A benefit leaves as a shielded coin, so no amount appears on
                chain — and a running total beside the claim count would give
                away the average benefit, which is the same disclosure by
                arithmetic.
              </p>
              <p className="note">
                Benefits are themselves taxed, and those totals <em>are</em>{" "}
                public — for the opposite reason to everything above: tax that is
                never remitted is not tax, and remitting requires the contract to
                know what it owes. Withheld from benefits so far:{" "}
                <strong title={exact(stats.fund.taxHeld + stats.fund.taxRemitted)}>
                  {money(stats.fund.taxHeld + stats.fund.taxRemitted)}
                </strong>{" "}
                tax and{" "}
                <strong title={exact(stats.fund.socialHeld + stats.fund.socialRemitted)}>
                  {money(stats.fund.socialHeld + stats.fund.socialRemitted)}
                </strong>{" "}
                contributions.
              </p>
              <p className="note">
                {stats.fund.claimsPaid === 0
                  ? "The count above is zero because nobody has claimed against this contract yet."
                  : "A claimable period is one whose claim tree has been published. A claimant needs a path through that tree, which is why she cannot build one herself — the path is what keeps her anonymous inside it."}
              </p>
            </Why>
          </>
        )}
      </Band>

      {/* ── 4. Can I verify this? ───────────────────────────────────────────
          Addresses, then everything that is documentation rather than a fact
          about the system. */}
      <Band title={`Verify on Midnight ${networkId}`} variant="plain">
        {/* The end of the progression: here are the numbers, here is what they
            do not expose, and here is where you check them without asking us. */}
        <p className="verified-line">
          <span className="live-dot" aria-hidden="true" /> Live on Midnight{" "}
          {networkId} — every figure above was read from the contracts below.
        </p>

        {payrollContracts.length === 0 && !peurContract ? (
          <p className="band-line">
            {loading ? "Reading deployments…" : `Nothing deployed on ${networkId} yet.`}
          </p>
        ) : null}

        {payrollContracts.map((entry) => (
          <ContractRow
            key={entry.name}
            label={entry.label}
            address={entry.deployment.contractAddress}
            explorer={explorer}
          />
        ))}
        {peurContract ? (
          <ContractRow
            label="Settlement asset"
            address={peurContract.deployment.contractAddress}
            explorer={explorer}
          />
        ) : null}

        <details className="details advanced">
          <summary>Technical details</summary>

          <h3 className="detail-head">Protocol status</h3>
          <p className="note">
            Tax and contributions: <strong>assessed ✓</strong> ·{" "}
            {stats.taxHeld + stats.taxRemitted + stats.socialHeld + stats.socialRemitted >
            0n
              ? "collection in progress"
              : "collection pending"}
            . Every payroll period computes both in circuit and publishes the
            totals, so the assessed figures are provable per employer without
            seeing a salary. What has actually moved into the contracts' pools is
            a separate figure and a separate transaction.
          </p>
          <div className="kv">
            <Kv
              k="Tax assessed"
              v={loading ? "…" : money(stats.taxFiled)}
              title={loading ? undefined : exact(stats.taxFiled)}
            />
            <Kv
              k="Tax collected"
              v={loading ? "…" : money(stats.taxHeld + stats.taxRemitted)}
              title={loading ? undefined : exact(stats.taxHeld + stats.taxRemitted)}
            />
            <Kv
              k="Contributions assessed"
              v={loading ? "…" : money(stats.socialFiled)}
              title={loading ? undefined : exact(stats.socialFiled)}
            />
            <Kv
              k="Contributions collected"
              v={loading ? "…" : money(stats.socialHeld + stats.socialRemitted)}
              title={loading ? undefined : exact(stats.socialHeld + stats.socialRemitted)}
            />
          </div>
          <p className="note">
            Showing an assessed figure as though it had been collected is the one
            thing this page will not do. Moving collected withholding into the
            national contracts, and assigning a payroll contract to a company,
            are the platform's own steps — <Link to="/operator">Operator</Link>.
          </p>

          <h3 className="detail-head">Tax rules</h3>
          <p className="note">
            Every figure above was computed under a schedule published on chain and
            pinned per month, so these totals can be reproduced rather than trusted.
            The schedule, and which months are bound to it, are under{" "}
            <Link to="/app/rules">Tax parameters</Link>.
          </p>

          <h3 className="detail-head">Settlement asset — pEUR</h3>
          <p className="warn-line">
            ⚠ Demo asset — permissionless minting is enabled for testing.
          </p>
          {stats.peurSupply !== null ? (
            <div className="kv">
              <Kv
                k="Test token supply"
                v={money(stats.peurSupply)}
                title={exact(stats.peurSupply)}
              />
            </div>
          ) : null}
          <p className="note">
            Anyone may mint pEUR, in any amount, without permission. That makes
            it worthless as a store of value and is deliberate: a demo should not
            need a faucet queue or an operator in the loop. So the supply above
            measures the faucet, not economic activity, which is why it is kept
            out of every aggregate on this page. A real deployment settles in an
            asset whose supply is controlled and auditable against reserves —
            restoring that is one issuer check in the contract.
          </p>
          <p className="note">
            Contract addresses are searchable on an explorer; a token type is not
            — it is a derived identifier, and shielded coins leave only
            commitments behind. To confirm pEUR exists, read the contract's own
            ledger, which holds its token id, issuer and total supply, rather
            than looking for a balance.
          </p>

          <h3 className="detail-head">Contract ownership</h3>
          <p className="note">
            One live employer per payroll contract. The platform deploys it and
            names the employer, and cannot write payroll to it afterwards — but
            it can take the seat back and assign it again, so an employer's hold
            on their instance rests on the platform's word rather than on the
            contract.
          </p>

          {!loading && stats.unreadable > 0 ? (
            <>
              <h3 className="detail-head">Older contracts, not shown</h3>
              <p className="note">
                {stats.unreadable} payroll contract
                {stats.unreadable === 1 ? " was" : "s were"} deployed from an
                earlier version of <code>payroll.compact</code> and cannot be
                decoded by this build — the ledger layout changed when
                terminations were added.{" "}
                {stats.unreadable === 1 ? "It is" : "They are"} excluded from
                every figure and every list on this page, rather than counted as
                zero. Nothing is lost on chain: they hold whatever they held, and
                an older build still reads them. Verifier keys are fixed at
                deploy, so a contract change always means a redeploy.
              </p>
            </>
          ) : null}
        </details>
      </Band>

      <div className="next-areas">
        <Link to="/employer" className="area-link">
          <strong>Employer</strong>
          <span>File a payroll period, fund it, pay it.</span>
        </Link>
        <Link to="/employee" className="area-link">
          <strong>Employee</strong>
          <span>Your own income record — visible only to you.</span>
        </Link>
        <Link to="/employee/benefit" className="area-link">
          <strong>Unemployment benefit</strong>
          <span>Prove an entitlement without revealing what it rests on.</span>
        </Link>
      </div>
    </>
  );
}

/**
 * A titled band, which is what most of this page is instead of a card.
 *
 * A card draws a box, and a box says "this is a thing apart". Four questions in
 * sequence are not four things apart — they are one argument — so they get a
 * heading and a hairline and share the page's background. It also removes the
 * card-inside-card nesting that came of putting a bordered panel inside a
 * bordered section inside another card.
 */
/**
 * One published figure: the number, what it is, and one line qualifying it.
 *
 * The qualifier is not decoration. "1 employer" and "2 workers" said nothing
 * about whether a period meant filed or settled, or whether €560 was this month
 * or every month — and a reader who has to guess at that cannot check anything.
 */
function Figure({
  value,
  label,
  note,
  exact,
  tone,
}: {
  value: string;
  label: string;
  note?: string;
  /** The unrounded figure, on hover. Nothing here rounds without saying so. */
  exact?: string;
  /**
   * `good` for a zero that is an achievement rather than an absence;
   * `sealed` for a figure that is deliberately not published, which is a
   * different statement from one that is missing or still loading.
   */
  tone?: "good" | "sealed";
}) {
  return (
    <div className="figure-cell">
      <div className={tone ? `figure-value ${tone}` : "figure-value"} title={exact}>
        {value}
      </div>
      <div className="figure-label">{label}</div>
      {note ? <div className="figure-note">{note}</div> : null}
    </div>
  );
}

/**
 * A term as a percentage of gross, for the payroll row.
 *
 * Computed here rather than published, and the only arithmetic on this page —
 * so it is stated as a share of a figure standing beside it rather than
 * presented as a fact from the chain.
 */
function share(part: bigint, whole: bigint, loading: boolean): string {
  if (loading) return "share of gross";
  if (whole === 0n) return "—";
  // Two decimals, from integer arithmetic: these are minor units, and the
  // published schedule's own rates are quoted to the same precision.
  const basisPoints = Number((part * 10000n) / whole) / 100;
  return `${basisPoints.toFixed(2)}% of gross`;
}

/**
 * One section of the dashboard.
 *
 * Every section is a panel, so this page reads as the same system as the
 * operator console rather than as a different kind of page. What separates them
 * is treatment, not whether they have a border: `feature` lifts (the two money
 * flows), `quiet` tints (the privacy claim that qualifies them), and `plain` is
 * the neutral card the counts and the contract list sit in.
 */
function Band({
  title,
  children,
  variant,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  variant?: "feature" | "quiet" | "plain";
  /**
   * Which of the two money flows this is.
   *
   * Payroll and social protection are equals — one is what an employer pays,
   * the other is what the country insures with it — so they share the panel and
   * differ only in colour. Without that they read as a feature and its
   * footnotes.
   */
  accent?: "ok";
}) {
  return (
    <section
      className={
        ["band", variant, accent && `accent-${accent}`].filter(Boolean).join(" ")
      }
    >
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

/** One deployed contract, with the explorer link when the network has one. */
function ContractRow({
  label,
  address,
  explorer,
}: {
  label: string;
  address: string;
  explorer: string;
}) {
  return (
    <div className="deployed-row">
      <CopyRow badge={label} value={address} />
      {explorer ? (
        <a
          className="explorer"
          href={`${explorer}${address}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          Explorer ↗
        </a>
      ) : null}
    </div>
  );
}

function Kv({ k, v, title }: { k: string; v: string; title?: string }) {
  return (
    <div className="row">
      <div className="k">{k}</div>
      <div className="v" title={title}>
        {v}
      </div>
    </div>
  );
}

/**
 * The reasoning behind a figure, folded away by default.
 *
 * Every panel here was a headline number followed by two or three paragraphs,
 * and the effect was that the argument buried the evidence: someone skimming met
 * prose before they met a working number. The prose is the best part of this
 * page and none of it is cut — it is one click away instead, so the figures
 * carry the page and the reasoning rewards whoever stops.
 */
function Why({
  label = "Why this is checkable",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="why">
      <summary>{label}</summary>
      {children}
    </details>
  );
}
