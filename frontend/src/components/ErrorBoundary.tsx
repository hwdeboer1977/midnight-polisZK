// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Named in the fallback, so it is clear which part failed. */
  what: string;
}

interface State {
  error: Error | null;
}

/**
 * Contains a render failure to one card instead of blanking the page.
 *
 * Ledger state is decoded lazily: `contract.ledger(...)` returns an object whose
 * fields decode when they are read, so a contract deployed from an older version
 * of payroll.compact throws during render — inside a component, well past the
 * try/catch that wrapped the fetch. Without a boundary that throw unmounts the
 * whole app, and a stale deployment is indistinguishable from a broken build.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.what}]`, error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="card">
        <h2>{this.props.what} could not be displayed</h2>
        <p className="status error">{error.message}</p>
        <p className="note">
          The usual cause is a contract deployed from an earlier version of{" "}
          <code>payroll.compact</code>: its on-chain state has no field this build
          expects. Redeploy the contract, then reload this page.
        </p>
      </section>
    );
  }
}
