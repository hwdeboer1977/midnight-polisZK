import { useCallback, useRef, useState } from "react";

interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  deployTxHash: string;
  assignTxHash: string;
}

type Job =
  | { status: "running"; log: string[] }
  | { status: "done"; log: string[]; result: OnboardResult }
  | { status: "failed"; log: string[]; error: string };

/**
 * Drives the demo onboarding service.
 *
 * Deploying and assigning takes minutes — far longer than an HTTP request should
 * stay open — so the service returns a job id and this polls it. The log lines
 * are surfaced as they arrive, because a button that sits silent for three
 * minutes reads as broken.
 */
export function useOnboarding() {
  const [job, setJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const timer = useRef<number | null>(null);

  const poll = useCallback((jobId: string) => {
    const tick = async () => {
      try {
        const response = await fetch(`/api/onboard/${jobId}`);
        if (!response.ok) throw new Error(`Service returned ${response.status}`);
        const next = (await response.json()) as Job;
        setJob(next);
        if (next.status === "running") {
          timer.current = window.setTimeout(() => void tick(), 2000);
        }
      } catch (cause) {
        setJob({
          status: "failed",
          log: [],
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    };
    void tick();
  }, []);

  const start = useCallback(
    async (instance: string, employerKey: string) => {
      setSubmitting(true);
      setUnavailable(false);
      setJob(null);
      try {
        const response = await fetch("/api/onboard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instance, employerKey }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Service returned ${response.status}`);
        }

        const { jobId } = (await response.json()) as { jobId: string };
        setJob({ status: "running", log: [] });
        poll(jobId);
      } catch (cause) {
        // A missing service is a setup problem, not a failed onboarding, and
        // deserves different wording.
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
          setUnavailable(true);
        } else {
          setJob({ status: "failed", log: [], error: message });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [poll]
  );

  const reset = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setJob(null);
    setUnavailable(false);
  }, []);

  return { job, submitting, unavailable, start, reset };
}
