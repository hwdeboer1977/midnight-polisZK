import { useCallback } from "react";
import { useServiceJob } from "./useServiceJob";

export interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  deployTxHash: string;
  assignTxHash: string;
}

/** Deploys a payroll contract and assigns it to the employer, in one job. */
export function useOnboarding() {
  const { job, submitting, unavailable, start, reset } =
    useServiceJob<OnboardResult>("/api/onboard");

  const begin = useCallback(
    (instance: string, employerKey: string, companyName?: string, signupCode?: string) =>
      // Sent only when supplied. The server ignores it unless SIGNUP_CODE is
      // configured, so an open deployment and an invite-only one take the same
      // request — the difference is one environment variable on the operator's
      // side, not a different build of this page.
      start({ instance, employerKey, companyName, ...(signupCode ? { signupCode } : {}) }),
    [start]
  );

  return { job, submitting, unavailable, start: begin, reset };
}
