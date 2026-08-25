import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { EXPLORERS } from "../lib/chain";
import { formatPeur, formatPeurTile, group } from "../lib/format";
import { useNetworkStats } from "../lib/useNetworkStats";
import { useWallet } from "../wallet/WalletContext";

/**
 * What the network publishes about itself. The default landing spot inside the
 * app, deliberately: someone opening it for the first time should meet the
 * system, not a wallet prompt. Nothing here needs a wallet, because nothing
 * here is anyone's private business.
 */
export function Public() {
  const { networkId } = useWallet();
  const { stats, loading, error } = useNetworkStats(networkId);
  const explorer = EXPLORERS[networkId] ?? "";
  const peurContract = stats.deployed.find((d) => d.deployment.contractName === "peur");
  const payrollContracts = stats.deployed.filter(
    (d) => d.deployment.contractName === "payroll"
  );

  return (
    <>
      <section className="net-head">
        <h1 className="brand-head">
          IncomeLayer<span className="zk">ZK</span> Network
        </h1>
        <p className="lede">
          Private payroll and social protection with publicly verifiable
          aggregates. Every figure below is derived directly from on-chain
          contract state — no individual salary, identity or payment amount is
          exposed.
        </p>
      </section>

      {error ? <p className="status error">Could not read the chain: {error}</p> : null}

      <h2 className="eyebrow">Network</h2>
      <div className="stats">
        <Stat
          value={loading ? "…" : group(BigInt(stats.employers))}
          label="Registered employers"
          note="payroll contracts with an employer assigned"
        />
        <Stat
          value={loading ? "…" : group(BigInt(stats.workersCovered))}
          label="Workers covered"
          note="headcount on the latest filed period"
        />
        <Stat
          value={
            loading
              ? "…"
              : `${group(BigInt(stats.periodsSettled))} of ${group(BigInt(stats.periodsFiled))}`
          }
          label="Periods settled"
          note="every slot in the period paid"
        />
      </div>

      <h2 className="eyebrow">Payroll</h2>
      {/* One figure, not two identical ones. Filed and settled are genuinely
          different claims — committed to, versus actually paid — but when they
          are equal, showing the same number twice reads as a rendering fault
          and buries the fact that nothing is outstanding. */}
      <div className="stats two">
        <Stat
          value={loading ? "…" : `€${formatPeurTile(stats.payrollFiled)}`}
          exact={loading ? undefined : `€${formatPeur(stats.payrollFiled)}`}
          label={
            loading
              ? "Gross payroll filed"
              : stats.payrollSettled === stats.payrollFiled
                ? "Gross payroll filed · fully settled"
                : "Gross payroll filed"
          }
          accent
          note={
            stats.payrollSettled === stats.payrollFiled
              ? "committed on chain, and every worker in every period has been paid"
              : "committed on chain, proved consistent with the rows behind it"
          }
        />
        {stats.payrollSettled === stats.payrollFiled ? (
          <Stat
            value={loading ? "…" : group(BigInt(stats.commitments))}
            label="Salary commitments"
            note="one opaque commitment per worker per period — none of them readable"
          />
        ) : (
          <Stat
            value={loading ? "…" : `€${formatPeurTile(stats.payrollSettled)}`}
            exact={loading ? undefined : `€${formatPeur(stats.payrollSettled)}`}
            label="of which settled"
            note="periods where every worker has actually been paid"
          />
        )}
      </div>

      <p className="note">
        Amounts are in <strong>pEUR</strong>, the euro stablecoin salaries settle
        in — see <a href="#settlement">settlement asset</a> below.
      </p>

      {/* The identity the system exists to make publicly checkable. Each term is
          its own published total, read from the contract — this page does no
          arithmetic, so a reader can check the four against each other and
          catch us if they disagree. */}
      <section className="card">
        <h2>Payroll breakdown</h2>
        <div className="identity">
          <div className="term real">
            <span className="term-value">
              {loading ? "…" : `€${formatPeur(stats.payrollFiled)}`}
            </span>
            <span className="term-label">Gross payroll filed</span>
          </div>
          <span className="op">=</span>
          <div className="term real">
            <span className="term-value">
              {loading ? "…" : `€${formatPeurTile(stats.taxFiled)}`}
            </span>
            <span className="term-label">Tax withheld</span>
          </div>
          <span className="op">+</span>
          <div className="term real">
            <span className="term-value">
              {loading ? "…" : `€${formatPeurTile(stats.socialFiled)}`}
            </span>
            <span className="term-label">Social contributions</span>
          </div>
          <span className="op">+</span>
          <div className="term real">
            <span className="term-value">
              {loading ? "…" : `€${formatPeur(stats.netFiled)}`}
            </span>
            <span className="term-label">Net payroll</span>
          </div>
        </div>
        <Why>
          <p className="note">
            Anyone can check that gross equals tax plus contributions plus net,
            across every employer, without seeing a single worker's figures. The
            circuit enforces the identity <em>per employee</em>, not only on these
            totals — balancing an overstatement for one worker against an
            understatement for another would satisfy the sums and lie about both.
          </p>
          <p className="note">
            The amounts are not filed by employers. They are computed inside the
            circuit from the gross salary and a published rule set, so an employer
            can neither choose a rate nor pick a cheaper version of the rules.
          </p>
        </Why>
      </section>

      {/* One box rather than two cards and two loose paragraphs: here the
          sentence is the point, and the two figures are its evidence. */}
      <section className="card">
        <h2>Privacy</h2>
        <div className="figures">
          <div className="figure-cell">
            <div className="figure-value">
              {loading ? "…" : group(BigInt(stats.commitments))}
            </div>
            <div className="figure-label">Salary commitments</div>
            <div className="figure-note">
              one opaque commitment per worker per payroll period
            </div>
          </div>
          <div className="figure-cell">
            <div className="figure-value">0</div>
            <div className="figure-label">Individual salaries published</div>
            <div className="figure-note">
              not withheld — the ledger has no field for one
            </div>
          </div>
        </div>
        <p className="note">
          What is <em>not</em> here: no individual salary, no employee name or
          address, no holder of any pEUR balance, and no amount for any single
          payment. Those are not withheld from this page — they were never
          published in the first place.
        </p>
      </section>

      <h2 className="eyebrow">Social protection fund</h2>
      {/* Every figure here is a real read. The one a dashboard would normally
          lead with — the fund's balance — is absent because it is not published
          at all, and saying that is better than leaving a gap where a number
          belongs. */}
      <section className={stats.fund ? "card" : "card pending"}>
        {/* The heading follows the figures. A fund that has paid nothing yet must
            not be introduced as one that has — that is the same overclaim as
            showing an assessed figure as collected, one card down. */}
        <h2>
          {!stats.fund
            ? "No fund deployed on this network"
            : stats.fund.claimsPaid > 0
              ? "Benefits paid, and nothing about who received them"
              : "Ready to pay benefits — none claimed yet"}
        </h2>
        <div className="flow">
          <span>Contributions</span>
          <span className="arrow">→</span>
          <span className="node">Social Protection Fund</span>
          <span className="arrow">→</span>
          <span>Benefits</span>
        </div>

        <div className="stats four">
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : stats.fund ? stats.fund.claimsPaid : "—"}
            </div>
            <div className="stat-label">Claims settled</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : stats.fund ? stats.fund.claimTrees : "—"}
            </div>
            <div className="stat-label">Periods claimable</div>
          </div>
          <div className="stat">
            <div
              className="stat-value"
              title={
                stats.fund
                  ? `Exactly €${formatPeur(stats.fund.taxHeld + stats.fund.taxRemitted)}`
                  : undefined
              }
            >
              {loading || !stats.fund
                ? "—"
                : `€${formatPeurTile(stats.fund.taxHeld + stats.fund.taxRemitted)}`}
            </div>
            <div className="stat-label">Tax withheld from benefits</div>
          </div>
          <div className="stat">
            <div
              className="stat-value"
              title={
                stats.fund
                  ? `Exactly €${formatPeur(stats.fund.socialHeld + stats.fund.socialRemitted)}`
                  : undefined
              }
            >
              {loading || !stats.fund
                ? "—"
                : `€${formatPeurTile(stats.fund.socialHeld + stats.fund.socialRemitted)}`}
            </div>
            <div className="stat-label">Contributions withheld</div>
          </div>
        </div>

        <p className="note">
          A claim proves the claimant was employed long enough and what her final
          salary was, and discloses neither. What settles on chain is a count and
          one opaque nullifier — never who claimed, which employer she left, or
          what she received. Each claimant is indistinguishable from everyone
          terminated in the same month across every employer here.
          {stats.fund && stats.fund.claimsPaid === 0
            ? " The fund holds money and a rule set is published; the count above is zero because nobody has claimed against this contract yet."
            : ""}
        </p>
        <Why label="Why there is no balance here">
          <p className="note">
            <strong>The fund's balance is not published at all.</strong> It is a
            shielded coin, so this fund is deliberately not publicly solvent — and
            that cannot be fixed without also revealing what each claimant
            received, because successive balances would give away the differences
            between them. The withholding totals above are public for the opposite
            reason: tax that is never remitted is not tax, and remitting requires
            the contract to know what it owes.
          </p>
        </Why>
      </section>

      {/* Separate card, because these two zeroes mean something different from
          the figures above and running them together would read as one story. */}
      <section className="card pending">
        <h2>Payroll withholding — assessed, not collected</h2>
        <div className="stats pending-stats">
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : `€${formatPeurTile(stats.taxFiled)}`}
            </div>
            <div className="stat-label">Tax assessed</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : `€${formatPeurTile(stats.taxHeld + stats.taxRemitted)}`}
            </div>
            <div className="stat-label">Tax collected</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : `€${formatPeurTile(stats.socialFiled)}`}
            </div>
            <div className="stat-label">Contributions assessed</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {loading ? "…" : `€${formatPeurTile(stats.socialHeld + stats.socialRemitted)}`}
            </div>
            <div className="stat-label">Contributions collected</div>
          </div>
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          Assessed is provable per employer. Collected is genuinely zero — the
          money has not moved.
        </p>
        <Why label="Why collected is zero">
          <p className="note">
            Every payroll period computes tax and contributions in circuit and
            publishes the totals, so the assessed figures are provable per employer
            without seeing a salary. The collected figures are what has actually
            moved into the contracts' pools — and they are genuinely zero:{" "}
            <code>fundWithholding</code> is deployed and nothing calls it yet, so
            employers keep the withheld money. Showing the assessed figure as
            though it had been collected is the one thing this page will not do.
          </p>
        </Why>
      </section>

      <section className="card">
        <h2>Deployed on Midnight {networkId}</h2>
        {payrollContracts.length === 0 ? (
          <p className="muted">
            {loading ? "Reading deployments…" : `No payroll contracts on ${networkId} yet.`}
          </p>
        ) : (
          payrollContracts.map((entry) => (
            <div key={entry.name} className="deployed-row">
              <CopyRow badge={entry.label} value={entry.deployment.contractAddress} />
              {explorer ? (
                <a
                  className="explorer"
                  href={`${explorer}${entry.deployment.contractAddress}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Explorer ↗
                </a>
              ) : null}
            </div>
          ))
        )}
        <p className="note">
          One contract per employer, assigned once and permanently. The platform
          deploys it and then cannot write payroll to it, cannot reassign it and
          cannot take it back.
        </p>
      </section>

      {/* Its own section rather than a row in the contract list: which asset
          salaries settle in is a property of the system, and the caveats that
          come with a demo token deserve to be read rather than skimmed past in
          a footnote. */}
      <section className="card" id="settlement">
        <h2>Settlement asset — pEUR</h2>
        <p className="lead-sm">
          Salaries settle in shielded <strong>pEUR</strong>. Individual balances
          and payment amounts are not public.
        </p>

        {peurContract ? (
          <div className="deployed-row">
            <CopyRow badge="pEUR issuer" value={peurContract.deployment.contractAddress} />
            {explorer ? (
              <a
                className="explorer"
                href={`${explorer}${peurContract.deployment.contractAddress}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Explorer ↗
              </a>
            ) : null}
          </div>
        ) : (
          <p className="muted">No pEUR deployment on {networkId} yet.</p>
        )}

        {stats.peurSupply !== null ? (
          <div className="row">
            <div className="k">Test token supply</div>
            <div className="v">€{formatPeur(stats.peurSupply)}</div>
          </div>
        ) : null}

        <p className="warn-line">
          ⚠ Demo asset — permissionless minting is enabled for testing.
        </p>

        {/* Everything below is documentation rather than a fact about the
            system, so it is one click away instead of in the way. */}
        <details className="details">
          <summary>Technical details</summary>
          <p className="note">
            Anyone may mint pEUR, in any amount, without permission. That makes
            it worthless as a store of value and is deliberate: a demo should not
            need a faucet queue or an operator in the loop. So the supply above
            measures the faucet, not economic activity, which is why it is kept
            out of the aggregates. A real deployment settles in an asset whose
            supply is controlled and auditable against reserves — restoring that
            is one issuer check in the contract.
          </p>
          <p className="note">
            pEUR is shielded, so a balance is a set of coins in the Zswap tree
            rather than a number attached to an address. Nobody's holding is
            public and neither is the value of any single transfer.
          </p>
          <p className="note">
            Contract addresses are searchable on an explorer; a token type is not
            — it is a derived identifier, and shielded coins leave only
            commitments behind. To confirm pEUR exists, read this contract's own
            ledger, which holds its token id, issuer and total supply, rather
            than looking for a balance.
          </p>
        </details>
      </section>

      {/* Moved here from the top of the page. It is a real caveat and it stays,
          but it is a note about this build's decoder, not a defect in the
          figures — and leading with a warning about contracts that contribute
          nothing to any total told a first-time reader the system was broken
          before they had seen a single working number. Those contracts are now
          excluded from the query as well as the totals, so the list and the
          counts above agree. */}
      {!loading && stats.unreadable > 0 ? (
        <section className="card">
          <h2>Older contracts, not shown</h2>
          <p className="note" style={{ marginTop: 0 }}>
            {stats.unreadable} payroll contract
            {stats.unreadable === 1 ? " was" : "s were"} deployed from an earlier
            version of <code>payroll.compact</code> and cannot be decoded by this
            build — the ledger layout changed when terminations were added.
            {stats.unreadable === 1 ? " It is" : " They are"} excluded from every
            figure and every list on this page, rather than counted as zero.
          </p>
          <p className="note">
            Nothing is lost on chain: they hold whatever they held, and an older
            build still reads them. Verifier keys are fixed at deploy, so a
            contract change always means a redeploy — see the README.
          </p>
        </section>
      ) : null}

      <section className="card">
        <h2>Where to go next</h2>
        <div className="next-areas">
          <Link to="/employer" className="area-link">
            <strong>Employer</strong>
            <span>File a payroll period, fund it, pay it.</span>
          </Link>
          <Link to="/employee" className="area-link">
            <strong>Employee</strong>
            <span>Your own income record — visible only to you.</span>
          </Link>
          <Link to="/claim" className="area-link">
            <strong>Claim</strong>
            <span>Prove an entitlement without revealing what it rests on.</span>
          </Link>
        </div>
      </section>
    </>
  );
}

/**
 * The reasoning behind a figure, folded away by default.
 *
 * Every panel here was a headline number followed by two or three paragraphs,
 * and the effect was that the argument buried the evidence: someone skimming
 * met prose before they met a working number. The prose is the best part of
 * this page and none of it is cut — it is one click away instead, so the
 * figures carry the page and the reasoning rewards whoever stops.
 */
function Why({ label = "Why this is checkable", children }: { label?: string; children: React.ReactNode }) {
  return (
    <details className="why">
      <summary>{label}</summary>
      {children}
    </details>
  );
}

function Stat({
  value,
  label,
  note,
  accent,
  exact,
}: {
  value: string;
  label: string;
  note: string;
  accent?: boolean;
  /**
   * The unrounded figure, shown on hover.
   *
   * Tiles round to two decimals so they can be compared at a glance; nothing is
   * lost, because the exact minor-unit value is here. A page whose claim is
   * that its numbers are checkable should not round without saying so.
   */
  exact?: string;
}) {
  return (
    <div className={accent ? "stat accent" : "stat"}>
      <div className="stat-value" title={exact && exact !== value ? `Exactly ${exact}` : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
