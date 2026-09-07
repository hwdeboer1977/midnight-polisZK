// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The dark block a working page opens with.
 *
 * Shared by Operator and Employer, and the top level of the four the dashboard
 * system uses: dark hero, tinted work zone, white analytical cards, neutral
 * management rows. Public does not use it — a visitor is reading rather than
 * operating, and it stays white on purpose.
 *
 * Title and standing figures live in the same block because they are one
 * statement: who you are, and what is outstanding. Splitting them put the
 * answer to "is there anything to do" below the fold on a page whose whole job
 * is to answer it on arrival.
 */
export function DashHero({
  eyebrow,
  title,
  metrics,
  status,
}: {
  /**
   * Small caps above the title — the area, not the instance.
   *
   * Optional, with the title: a page whose identity is already stated by a
   * `PageHead` above passes figures alone, and gets the dark strip without a
   * second heading inside it. Operator reads that way now.
   */
  eyebrow?: string;
  /** One line, in the hero's own light-on-dark voice. */
  title?: React.ReactNode;
  /**
   * The standing figures, or nothing.
   *
   * Omitted on gated states, which have no figures to show but still deserve
   * the page's identity — an identity that only appears once you are
   * authorised is not one.
   */
  metrics?: DashMetric[];
  /**
   * One line, in place of the figures, when there are no figures yet.
   *
   * A single surviving metric rendered as a metric cell was worse than the row
   * of dashes it replaced: the grid is four columns wide whatever it holds, so
   * "Not filed" got a quarter of the block and broke across two lines at 27px
   * with its note stacked six lines deep beside it. A page with nothing to
   * count should say so in a sentence, not in a dashboard cell.
   */
  status?: React.ReactNode;
}) {
  // Figures alone. The page said who it is in its own header.
  if (!eyebrow) return metrics ? <MetricRow metrics={metrics} /> : null;

  const filled = metrics && metrics.length > 0;

  return (
    <section className={filled || status ? "dash-hero" : "dash-hero bare"}>
      <div className="dash-hero-head">
        <h1>{eyebrow}</h1>
        <p>{title}</p>
      </div>
      {filled ? (
        // The count drives the columns. Fixed at four, a block holding two
        // figures rendered them into the left half and left the right half
        // empty, which reads as content that failed to load.
        <div className="dash-metrics" data-count={metrics!.length}>
          {metrics!.map((metric) => (
            <div
              key={metric.label}
              className={metric.attention ? "dash-metric attention" : "dash-metric"}
            >
              <div className="dash-metric-value" title={metric.exact}>
                {metric.value}
              </div>
              <div className="dash-metric-label">{metric.label}</div>
              <div className="dash-metric-note">{metric.note}</div>
            </div>
          ))}
        </div>
      ) : status ? (
        <div className="dash-status">{status}</div>
      ) : null}
    </section>
  );
}

/** The figures alone, in the dark, when the head has moved onto the page. */
function MetricRow({ metrics }: { metrics: DashMetric[] }) {
  return (
    <section className="dash-hero metrics-only">
      <div className="dash-metrics" data-count={metrics.length}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={metric.attention ? "dash-metric attention" : "dash-metric"}
          >
            {metric.icon ? (
              <span className="dash-metric-icon" aria-hidden="true">
                {metric.icon}
              </span>
            ) : null}
            <div className="dash-metric-body">
              <div className="dash-metric-value" title={metric.exact}>
                {metric.value}
              </div>
              <div className="dash-metric-label">{metric.label}</div>
              <div className="dash-metric-note">{metric.note}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface DashMetric {
  value: string;
  label: string;
  note: string;
  /** The unrounded figure, on hover. Nothing here rounds without saying so. */
  exact?: string;
  /**
   * Brightens the figure to the hero's accent.
   *
   * For "you owe an action", never for "something is wrong" — nothing in a hero
   * is an error, and a red figure in a header is read as a fault rather than as
   * work.
   */
  attention?: boolean;
  /** A small mark for the figure. Decoration, so it is hidden from readers. */
  icon?: React.ReactNode;
}
