// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Drop the URL in here to surface the demo link under the hero; empty
// renders nothing rather than a dead play button.
const DEMO_VIDEO_URL = "";

// What the closing block offers. Same rule as the video: an empty string
// renders no link rather than a promise the page cannot keep. Point the papers
// at a file dropped in frontend/public/, or at wherever they are hosted.
const POSITION_PAPER_URL = "/position-paper.pdf";
const WHITE_PAPER_URL = "/white-paper.pdf";
const REPO_URL = "https://github.com/hwdeboer1977/midnight-polisZK";
const CONTACT_EMAIL = "hwdeboer@gmail.com";

type Diagram = { src: string; title: string; alt: string };

// The two diagrams are the argument, so they are also the two things a reader
// most wants to enlarge. Held as data so the inline figure and the lightbox
// can never drift apart.
const PAYROLL_DIAGRAM: Diagram = {
  src: "/payroll-privacy.svg",
  title: "A payroll period",
  alt: "A payroll period for ten employees. Each employee's gross, income tax, social insurance contribution and net pay is sealed; only the headcount and the four column totals are public on chain.",
};

const CLAIM_DIAGRAM: Diagram = {
  src: "/insurance-claim.svg",
  title: "A claim against it",
  alt: "An unemployment claim. One month's sealed salary opening feeds a zero-knowledge proof; the fund learns only that the claim is valid, while the benefit amount and the claimant stay sealed. The fund publishes counts and withholding totals — never its balance.",
};

/**
 * The entry page. Deliberately explains the privacy model before asking anyone
 * to connect a wallet — "what does this publish about my staff?" is the first
 * question a payroll product has to answer.
 */
export function Landing() {
  // Which diagram, if any, is open full size. The inline layout stays as it is;
  // the labels in these SVGs are simply too small to read at column width.
  const [zoomed, setZoomed] = useState<Diagram | null>(null);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(null);
    };
    window.addEventListener("keydown", onKey);
    // Freeze the page behind the overlay, so scrolling acts on the diagram.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed]);

  const figure = (diagram: Diagram) => (
    <figure className="figure">
      <button
        type="button"
        className="figure-zoom"
        onClick={() => setZoomed(diagram)}
        aria-label={`View full size: ${diagram.title}`}
      >
        <img src={diagram.src} alt={diagram.alt} />
        <span className="figure-hint" aria-hidden="true">
          🔍 View full size
        </span>
      </button>
    </figure>
  );

  return (
    <div className="landing">
      <section className="hero">
        {/* The wordmark and the positioning line are one lockup here, so the
            masthead drops its copy on this route rather than saying it twice. */}
        <h1 className="brand">
          IncomeLayer<span className="zk">ZK</span>
        </h1>
        <p className="tagline">
          Private payroll and social protection on Midnight
        </p>
        <p className="lede">
          Run payroll, withhold tax, pool contributions, and pay unemployment
          benefits — with every individual figure sealed and every aggregate
          provably correct.
        </p>
        {/* The problem the product is an answer to, stated before the buttons:
            the first line is the number, the second says why it is not a
            funding number. */}
        <p className="hero-stat">
          <strong>
            Only 16.7% of the world's unemployed receive a benefit.
          </strong>{" "}
          Not because the money is unaffordable, but because proving who
          qualifies has always meant building a register.
        </p>

        {/* Understanding before commitment: a jury reads what the system does
            before it is asked to connect a wallet, so the explainer leads. */}
        <div className="cta">
          <a className="button" href="#how-it-works">
            How it works
          </a>
          <Link className="button secondary" to="/app">
            Launch app
          </Link>
        </div>
        {DEMO_VIDEO_URL ? (
          <p className="demo-link">
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer noopener">
              ▶ Watch the two-minute demo
            </a>
          </p>
        ) : null}
      </section>

      {/* The argument compressed. It is the premise, not the conclusion, so it
          comes before the mechanism: a policy reader who lands cold needs to
          know what is being contested before being shown how. The band is the
          navy the diagrams are drawn in, so the thesis is visibly not one more
          section of the page. */}
      <section className="thesis">
        <div className="thesis-inner">
          <p>
            The ILO says pool the risk, because social security is a right. The
            World Bank says you can't pool what you can't verify. Both are right
            — and both assume that verifying an income history needs an
            apparatus poor states can't afford and citizens have reason to
            distrust.
          </p>
          {/* Its own paragraph rather than a bolder run inside the one above:
              the break is what gives the line its weight. */}
          <p className="thesis-turn">That assumption is now contestable.</p>
          {/* What turns the first two sentences from a slogan into a citation. */}
          <p className="thesis-source">
            ILO, World Social Protection Report 2024–26 · World Bank, Protecting
            All, 2019
          </p>
        </div>
      </section>

      {/* The two diagrams carry the argument better than prose does: one shows a
          payroll period, one shows what a claim against it discloses. */}
      <section className="usecase" id="how-it-works">
        <div className="usecase-text">
          <h2>A payroll period</h2>
          <p>
            Every row — the employee, their gross, their income tax, their social
            insurance contribution, their net pay — is sealed on the employer's
            machine. What the chain gets is the headcount and four column totals,
            provably consistent with the rows behind them.
          </p>
          <p className="note">
            Each employee is paid their net as a shielded coin: the transfer settles
            on chain, the amount never appears.
          </p>
        </div>
        {figure(PAYROLL_DIAGRAM)}
      </section>

      <section className="usecase reverse">
        <div className="usecase-text">
          <h2>A claim against it</h2>
          <p>
            One month's sealed opening and a proof of membership in that month's
            claim tree. The fund learns that the claim is valid. Not the salary it
            was derived from, not the benefit paid, not which employer she left,
            not who she is — and she is indistinguishable from everyone terminated
            in the same month across every employer here.
          </p>
          <p className="note">
            What settles publicly is a count and one opaque nullifier.{" "}
            <strong>The fund's balance is not published</strong> — it is a shielded
            coin, so this fund is deliberately not publicly solvent. That cannot be
            fixed without also revealing what each claimant received, because
            successive balances would give away the differences between them.
          </p>
        </div>
        {figure(CLAIM_DIAGRAM)}
      </section>

      <section className="explain">
        <h2>What actually reaches the chain</h2>
        <div className="split">
          <div className="col public">
            <h4>Public</h4>
            <ul>
              <li>Number of employees</li>
              <li>Total monthly payroll</li>
              <li>One opaque commitment per employee</li>
              <li>Who the employer is (a public key)</li>
              <li>Total pEUR in circulation</li>
            </ul>
          </div>
          <div className="col private">
            <h4>Never published</h4>
            <ul>
              <li>Any individual salary</li>
              <li>Employee names and addresses</li>
              <li>Who holds how much pEUR</li>
              <li>What any single payment was worth</li>
            </ul>
          </div>
        </div>
        <p className="note">
          The whole roster is submitted in one transaction on purpose. Paying people
          one at a time would move the public total by exactly one salary each time,
          and anyone watching blocks could read every amount off the differences.
        </p>
      </section>

      {/* The ask. The band argues the case in section two; by here a reader has
          seen the mechanism and is finally ready to leave for a long PDF. */}
      <section className="closing">
        <h2>Read the argument in full</h2>
        {POSITION_PAPER_URL || WHITE_PAPER_URL ? (
          <p className="closing-links">
            {POSITION_PAPER_URL ? (
              <a className="button secondary" href={POSITION_PAPER_URL}>
                Read the position paper
              </a>
            ) : null}
            {WHITE_PAPER_URL ? (
              <a className="button secondary" href={WHITE_PAPER_URL}>
                Read the white paper
              </a>
            ) : null}
          </p>
        ) : null}
        <p className="closing-meta">
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
          {CONTACT_EMAIL ? (
            <>
              {" · "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </>
          ) : null}
        </p>
      </section>

      {zoomed ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={zoomed.title}
          onClick={() => setZoomed(null)}
        >
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={zoomed.src} alt={zoomed.alt} />
          </div>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setZoomed(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
