import { platformActions } from "../lib/origin";

/**
 * Why a platform-operated action is not available, in terms the reader can act
 * on. Locally that means the service is not started; on a hosted build it means
 * there is nothing to start.
 */
export function ServiceUnavailable({ what }: { what: string }) {
  return (
    <p className="note">
      {platformActions ? (
        <>
          The {what} service is not running. Start it with{" "}
          <code>npm run server</code>, or send the details above to the
          platform operator instead.
        </>
      ) : (
        <>
          The {what} service runs on the platform operator's own machine and is
          not part of this hosted app — it holds the platform signing key, which
          does not belong on a web host. Send the details above to the operator,
          or run the project locally with <code>npm run server</code>.
        </>
      )}
    </p>
  );
}
