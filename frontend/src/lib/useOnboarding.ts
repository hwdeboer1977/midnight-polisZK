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
    (instance: string, employerKey: string, companyName?: string) =>
      start({ instance, employerKey, companyName }),
    [start]
  );

  return { job, submitting, unavailable, start: begin, reset };
}
