import type { LayoutRect } from "./windowLayout";
export type LooseLayout = { rows: number[][]; columns: number[] };
export function initialLooseLayout(random: () => number): LooseLayout {
  return {
    rows: [0, 1].map(() => [0.25 + random() * 0.1, 0.62 + random() * 0.1]),
    columns: Array.from({ length: 6 }, () => 0.3 + random() * 0.4),
  };
}
export function looseWindowCells(layout: LooseLayout): LayoutRect[] {
  return [0, 1].flatMap((zone) => {
    const rows = [0, ...layout.rows[zone]!, 1];
    return [0, 1, 2].flatMap((band) => {
      const split = layout.columns[zone * 3 + band]!;
      const y = rows[band]!;
      const height = rows[band + 1]! - y;
      return [
        { x: zone * 0.5, y, width: split * 0.5, height },
        { x: zone * 0.5 + split * 0.5, y, width: (1 - split) * 0.5, height },
      ];
    });
  });
}
// Each cursor-controlled edge is shared: one neighbor grows as the other shrinks.
export function followLooseLayout(layout: LooseLayout, x: number, y: number, band: number, amount: number): void {
  const zone = x < 0.5 ? 0 : 1;
  const index = zone * 3 + band;
  const width = Math.max(0.25, Math.min(0.75, x * 2 - zone));
  layout.columns[index] = layout.columns[index]! + (width - layout.columns[index]!) * amount;
  const boundary = Math.min(band, 1);
  const rows = layout.rows[zone]!;
  const lower = boundary === 0 ? 0.18 : rows[0]! + 0.18;
  const upper = boundary === 0 ? rows[1]! - 0.18 : 0.82;
  rows[boundary] = rows[boundary]! + (Math.max(lower, Math.min(upper, y)) - rows[boundary]!) * amount;
}
