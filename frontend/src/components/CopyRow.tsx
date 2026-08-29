// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { truncate } from "../lib/format";

/**
 * A long, monospace value worth copying — an address or a key. Middle-truncated
 * with the full string in `title`, because these are values you hand to other
 * people rather than read off the screen.
 */
export function CopyRow({
  label,
  value,
  badge,
}: {
  label?: string;
  value: string;
  badge?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="row">
      <div className="k">
        {badge ? <span className="badge">{badge}</span> : label}
      </div>
      <div className="v" title={value}>
        {truncate(value)}
      </div>
      <button className={copied ? "copy done" : "copy"} onClick={() => void copy()}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
