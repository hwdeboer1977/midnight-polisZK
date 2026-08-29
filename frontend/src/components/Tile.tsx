// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

export function Tile({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "tile accent" : "tile"}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="unit">{unit}</div>
    </div>
  );
}
