import { Link } from "react-router-dom";

/**
 * What a page says when its prerequisite is not met.
 *
 * The alternative — showing a wallet picker on Payroll to someone who has not
 * registered — answers a question they were not asking and hides the one they
 * need answered, which is "what do I have to do first?". A locked tab and a
 * page that explains itself are the same statement made twice, on purpose:
 * whoever arrives here by URL never saw the tab.
 */
export function StageGate({
  title,
  needs,
  to,
  action,
}: {
  title: string;
  needs: string;
  to: string;
  action: string;
}) {
  return (
    <section className="card pending">
      <h2>{title}</h2>
      <p className="note" style={{ marginTop: 0 }}>
        {needs}
      </p>
      <div className="actions">
        <Link className="button" to={to}>
          {action}
        </Link>
      </div>
    </section>
  );
}
