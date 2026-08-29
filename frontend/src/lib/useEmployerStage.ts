// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { loadDeployments, type Deployments } from "./deployments";
import { usePayrollInstances, type PayrollInstance } from "./usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * How far along an employer is, in one place.
 *
 * The employer area is a lifecycle — set up, then add people, then pay them —
 * and each stage has a prerequisite. Answering "can they do this yet?" in the
 * navigation, on the dashboard and on each page separately meant three
 * definitions of the same thing, which is two too many.
 */
export interface EmployerStage {
  /** A wallet is connected, so there is a signing key to register. */
  registered: boolean;
  /** That key controls a payroll contract. */
  contract: boolean;
  /**
   * At least one employee exists.
   *
   * Read from filed periods, because nothing in this system stores an employee
   * record — a filed period is the only on-chain evidence a roster was ever
   * assembled. It means the flag lands slightly later than "added someone"
   * would, and it resolves itself if roster storage ever exists.
   */
  employees: boolean;
  /** At least one period is filed, funded and fully paid. */
  settled: boolean;
  /** True while the answer is still being read from chain. */
  loading: boolean;
  /** The employer's own contract, once there is one. */
  instance: PayrollInstance | null;
  periods: bigint[];
}

export function useEmployerStage(): EmployerStage {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  const [read, setRead] = useState(false);

  useEffect(() => {
    void loadDeployments().then((loaded) => {
      setDeployments(loaded);
      setRead(true);
    });
  }, []);

  const { instances, loading } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

  const instance = instances.find((i) => i.role === "employer") ?? null;
  const periods = instance?.state
    ? [...instance.state.periods].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    : [];

  // A period counts as settled only when every slot in it is paid. A half-paid
  // month is not a payroll run anyone should be congratulated for.
  const state = instance?.state ?? null;
  const settled = periods.some((period) => {
    if (!state) return false;
    const count = state.employeeCountFor.member(period)
      ? Number(state.employeeCountFor.lookup(period))
      : 0;
    if (count === 0 || !state.paidFor.member(period)) return false;
    const flags = state.paidFor.lookup(period);
    for (let i = 0; i < count; i += 1) {
      if (!flags.member(BigInt(i)) || !flags.lookup(BigInt(i))) return false;
    }
    return true;
  });

  return {
    registered: Boolean(account),
    contract: instance !== null,
    employees: periods.length > 0,
    settled,
    loading: Boolean(account) && (!read || loading),
    instance,
    periods,
  };
}
