// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useServiceJob } from "./useServiceJob";

export interface OnboardResult {
  instance: string;
  key: string;
  contractAddress: string;
  /** Always empty now — onboarding assigns an existing contract, it deploys none. */
  deployTxHash: string;
  assignTxHash: string;
  /** Periods whose rule set this run recorded; empty when all were already set. */
  periodsRecorded?: number[];
}

/** Assigns the platform's payroll contract to the employer, in one job. */
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
