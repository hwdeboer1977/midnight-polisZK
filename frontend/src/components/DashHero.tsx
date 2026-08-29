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
}) {
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
}
