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
  aside,
}: {
  /** Small caps above the title — the area, not the instance. */
  eyebrow: string;
  /** One line, in the hero's own light-on-dark voice. */
  title: React.ReactNode;
  /**
   * The standing figures, or nothing.
   *
   * Omitted on gated states, which have no figures to show but still deserve
   * the page's identity — an identity that only appears once you are
   * authorised is not one.
   */
  metrics?: DashMetric[];
  /**
   * A standing note beside the title — what this console IS, not what it holds.
   *
   * When given, the head moves out of the dark block and onto the page, with
   * the figures alone in the dark. The identity of a page and the state of its
   * money are two statements, and stacking them inside one black rectangle made
   * the smaller one furniture.
   */
  aside?: React.ReactNode;
}) {
  if (aside) {
    return (
      <>
        <section className="dash-intro">
          <div className="dash-hero-head light">
            <h1>{eyebrow}</h1>
            <p>{title}</p>
          </div>
          <div className="dash-aside">{aside}</div>
        </section>
        {metrics ? <MetricRow metrics={metrics} /> : null}
      </>
    );
  }

  return (
    <section className={metrics ? "dash-hero" : "dash-hero bare"}>
      <div className="dash-hero-head">
        <h1>{eyebrow}</h1>
        <p>{title}</p>
      </div>
      {metrics ? (
        <div className="dash-metrics">
          {metrics.map((metric) => (
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
      ) : null}
    </section>
  );
}

/** The figures alone, in the dark, when the head has moved onto the page. */
function MetricRow({ metrics }: { metrics: DashMetric[] }) {
  return (
    <section className="dash-hero metrics-only">
      <div className="dash-metrics">
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
