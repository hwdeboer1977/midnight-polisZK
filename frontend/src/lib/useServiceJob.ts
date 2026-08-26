import { useCallback, useRef, useState } from "react";
import { apiUrl } from "./origin";

/**
 * A unit of work on the demo service — onboarding, funding, minting.
 *
 * A discriminated union rather than optional fields, so a `done` job carries a
 * result and a `failed` one carries an error without either being checked for
 * at every use.
 */
export type ServiceJob<TResult> =
  | { status: "running"; log: string[] }
  | { status: "done"; log: string[]; result: TResult }
  | { status: "failed"; log: string[]; error: string };

/** The service was never reached, as opposed to reached and refusing. */
class ServiceUnreachable extends Error {}

/**
 * Turns a failed response into the error it deserves.
 *
 * The service answers JSON for every error it raises itself, so a body that is
 * not JSON did not come from the service at all: Vite's dev proxy replies with a
 * plain-text 500 of its own when it cannot reach the target. Reporting that as a
 * service error is what makes a service nobody started read as "Service returned
 * 500" — pointing at the operation instead of at the missing process.
 */
async function failureFor(response: Response): Promise<Error> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return new Error(parsed.error ?? `Service returned ${response.status}`);
  } catch {
    return new ServiceUnreachable("The demo service is not reachable");
  }
}

/**
 * A connection that never completed. This is the shape the same outage takes
 * when nothing proxies the request — a production build, or `vite preview` —
 * so both it and the proxy's 500 have to mean "not running".
 */
function isUnreachable(cause: unknown): boolean {
  if (cause instanceof ServiceUnreachable) return true;
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.includes("Failed to fetch") || message.includes("NetworkError");
}

/**
 * Starts one operation on the demo service and follows it to completion.
 *
 * Everything the service does takes minutes — deploying, syncing a wallet,
 * proving — which is far longer than an HTTP request should stay open, so it
 * answers with a job id and this polls for progress. The log lines are surfaced
 * as they arrive, because a button that sits silent for three minutes reads as
 * broken.
 */
export function useServiceJob<TResult>(path: string) {
  const [job, setJob] = useState<ServiceJob<TResult> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const timer = useRef<number | null>(null);

  const poll = useCallback((jobId: string) => {
    const tick = async () => {
      try {
        const response = await fetch(apiUrl(`/api/job/${jobId}`));
        if (!response.ok) throw await failureFor(response);
        const next = (await response.json()) as ServiceJob<TResult>;
        setJob(next);
        if (next.status === "running") {
          timer.current = window.setTimeout(() => void tick(), 2000);
        }
      } catch (cause) {
        // Losing the service mid-job is not the same as the job failing: the
        // transactions may well have landed. Saying so keeps someone from
        // running it a second time and paying for it twice.
        const message = isUnreachable(cause)
          ? "Lost contact with the demo service. The operation may still have completed — check your balances before trying again."
          : cause instanceof Error
            ? cause.message
            : String(cause);
        setJob((previous) => ({
          status: "failed",
          log: previous?.log ?? [],
          error: message,
        }));
      }
    };
    void tick();
  }, []);

  const start = useCallback(
    async (body: unknown) => {
      setSubmitting(true);
      setUnavailable(false);
      setJob(null);
      try {
        const response = await fetch(apiUrl(path), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw await failureFor(response);

        const { jobId } = (await response.json()) as { jobId: string };
        setJob({ status: "running", log: [] });
        poll(jobId);
      } catch (cause) {
        // A missing service is a setup problem, not a failed operation, and
        // deserves different wording.
        if (isUnreachable(cause)) {
          setUnavailable(true);
        } else {
          setJob({
            status: "failed",
            log: [],
            error: cause instanceof Error ? cause.message : String(cause),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [path, poll]
  );

  const reset = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setJob(null);
    setUnavailable(false);
  }, []);

  return { job, submitting, unavailable, start, reset };
}
