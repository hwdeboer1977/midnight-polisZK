import { servedLocally } from "../lib/origin";

/**
 * Why a platform action is not available, in terms the reader can act on.
 *
 * Three answers, not two, and conflating the last two is what made a hosted
 * employer read "run the project locally" about their own starter allowance.
 *
 *   · running locally, nothing listening   → start the server;
 *   · operator-only action, hosted page    → it needs the platform signing key,
 *                                            which does not belong on a web
 *                                            host, so it never will be here;
 *   · open action, hosted page             → there IS a route for this, the
 *                                            build just has no backend pointed
 *                                            at it (VITE_API_BASE), or it is
 *                                            down. Nothing about it is private.
 *
 * `operatorOnly` picks between the last two. It defaults true because most
 * callers here are the faucet, the mint and fund+pay, which genuinely are
 * operator actions — `/api/claim` is the one that is not.
 */
export function ServiceUnavailable({
  what,
  operatorOnly = true,
}: {
  what: string;
  operatorOnly?: boolean;
}) {
  if (servedLocally) {
    return (
      <p className="note">
        The {what} service is not running. Start it with <code>npm run server</code>,
        or send the details above to the platform operator instead.
      </p>
    );
  }

  if (operatorOnly) {
    return (
      <p className="note">
        The {what} service runs on the platform operator's own machine and is not
        part of this hosted app — it holds the platform signing key, which does not
        belong on a web host. Send the details above to the operator, or run the
        project locally with <code>npm run server</code>.
      </p>
    );
  }

  return (
    <p className="note">
      This deployment has no platform service to ask, or it is not answering. The{" "}
      {what} does not need one of the operator's credentials — it is bounded by
      the chain rather than by a secret — so this is a configuration gap rather
      than something withheld: the hosted build needs <code>VITE_API_BASE</code>{" "}
      pointed at a running backend. Ask the operator, or run the project locally
      with <code>npm run server</code>.
    </p>
  );
}
