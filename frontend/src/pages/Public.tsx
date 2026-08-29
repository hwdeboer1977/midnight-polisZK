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

      {/* ── 1. How big is the network? ──────────────────────────────────────
          One line, not three tiles. The scale of a pilot is context for the
          figures below it, and giving it the same visual weight as the money
          made three small integers compete with the thing they qualify. */}
      <p className="scale-strip">
        {loading ? (
          "Reading the chain…"
        ) : (
          <>
            <strong>{group(BigInt(stats.employers))}</strong>{" "}
            {stats.employers === 1 ? "employer" : "employers"}
            <span className="dot">·</span>
            <strong>{group(BigInt(stats.workersCovered))}</strong>{" "}
            {stats.workersCovered === 1 ? "worker" : "workers"}
            <span className="dot">·</span>
            <strong>{group(BigInt(stats.periodsFiled))}</strong> payroll{" "}
            {stats.periodsFiled === 1 ? "period" : "periods"}
            {stats.periodsSettled < stats.periodsFiled ? (
              <span className="faint">
                {" "}
                ({group(BigInt(stats.periodsSettled))} fully settled)
              </span>
            ) : null}
          </>
        )}
      </p>

      {/* The one card on the page, and the reason the rest are not cards. This
          identity is what the system exists to make publicly checkable, and each
          term is its own published total read from the contract — the page does
          no arithmetic, so a reader can check the four against each other and
          catch us if they disagree. */}
      <section className="card headline-figure">
        <div
          className="headline-value"
          title={loading ? undefined : exact(stats.payrollFiled)}
        >
          {loading ? "…" : money(stats.payrollFiled)}
        </div>
        <div className="headline-label">
          Gross payroll
          {!loading && stats.payrollSettled === stats.payrollFiled
            ? " · fully settled"
            : ""}
        </div>

        <div className="identity">
          <div className="term real">
            <span className="term-value" title={loading ? undefined : exact(stats.taxFiled)}>
              {loading ? "…" : money(stats.taxFiled)}
            </span>
            <span className="term-label">tax</span>
          </div>
          <span className="op">+</span>
          <div className="term real">
            <span
              className="term-value"
              title={loading ? undefined : exact(stats.socialFiled)}
            >
              {loading ? "…" : money(stats.socialFiled)}
            </span>
            <span className="term-label">contributions</span>
          </div>
          <span className="op">+</span>
          <div className="term real">
            <span className="term-value" title={loading ? undefined : exact(stats.netFiled)}>
              {loading ? "…" : money(stats.netFiled)}
            </span>
            <span className="term-label">net pay</span>
          </div>
        </div>

        <Why>
          <p className="note">
            Anyone can check that gross equals tax plus contributions plus net,
            across every employer, without seeing a single worker's figures. The
            circuit enforces the identity <em>per employee</em>, not only on
            these totals — balancing an overstatement for one worker against an
            understatement for another would satisfy the sums and lie about both.
          </p>
          <p className="note">
            The amounts are not filed by employers. They are computed inside the
            circuit from the gross salary and a published rule set, so an
            employer can neither choose a rate nor pick a cheaper version of the
            rules.
          </p>
          <p className="note">
            Amounts are in <strong>pEUR</strong>, the euro stablecoin salaries
            settle in. Figures round to two decimals; hover any of them for the
            exact minor-unit value.
          </p>
        </Why>
      </section>

      {/* ── 2. What is private? ─────────────────────────────────────────────
          Two figures and one sentence. The argument ran to three paragraphs and
          it is the best writing on the page, which is exactly why it was burying
          the number that proves it. */}
      <Band title="Privacy">
        <div className="figures">
          <div className="figure-cell">
            <div className="figure-value">
              {loading ? "…" : group(BigInt(stats.commitments))}
            </div>
            <div className="figure-label">Salary commitments</div>
          </div>
          <div className="figure-cell">
            <div className="figure-value">0</div>
            <div className="figure-label">Salaries exposed</div>
          </div>
        </div>
        <p className="band-line">
          Individual salaries, identities and payment amounts never appear on the
          public ledger.
        </p>
        <Why label="How privacy works">
          <p className="note">
            Each worker's salary for each period is sealed into one opaque
            commitment. The commitment is what the chain holds; the figure behind
            it stays on the employer's machine and reaches the worker in a
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
      <Band title="Social protection">
        {stats.fund === null ? (
          <p className="band-line">
            {loading
              ? "Reading the fund…"
              : `No unemployment fund is deployed on ${networkId}.`}
          </p>
        ) : (
          <>
            <div className="figures three">
              <div className="figure-cell">
                <div
                  className="figure-value"
                  title={loading ? undefined : exact(stats.fund.contributed)}
                >
                  {loading ? "…" : money(stats.fund.contributed)}
                </div>
                <div className="figure-label">Contributed</div>
              </div>
              <div className="figure-cell">
                <div className="figure-value">
                  {loading ? "…" : group(BigInt(stats.fund.claimsPaid))}
                </div>
                <div className="figure-label">
                  {stats.fund.claimsPaid === 1 ? "Claim settled" : "Claims settled"}
                </div>
              </div>
              <div className="figure-cell">
                <div className="figure-value">
                  {loading ? "…" : group(BigInt(stats.fund.claimTrees))}
                </div>
                <div className="figure-label">
                  {stats.fund.claimTrees === 1 ? "Claimable period" : "Claimable periods"}
                </div>
              </div>
            </div>

            <div className="flow">
              <span>Contributions</span>
              <span className="arrow">→</span>
              <span className="node">Fund</span>
              <span className="arrow">→</span>
              <span>Private benefits</span>
            </div>

            <p className="band-line">
              A claim proves the claimant was employed long enough and what her
              final salary was, and discloses neither. What settles on chain is a
              count and one opaque nullifier.
            </p>

            <Why label="What the fund does and does not publish">
              <p className="note">
                <strong>Contributed is money in, not a balance.</strong> The
                fund's balance is not published at all: it holds a shielded coin,
                so this fund is deliberately not publicly solvent — and that
                cannot be fixed without also revealing what each claimant
                received, because successive balances would give away the
                differences between them.
              </p>
              <p className="note">
                Each claimant is indistinguishable from everyone terminated in
                the same month across every employer here. Never who claimed,
                which employer she left, or what she received.
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
      <Band title={`Verify on Midnight ${networkId}`}>
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
function Band({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="band">
      <h2 className="eyebrow">{title}</h2>
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
