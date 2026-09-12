import type { LayoutRect } from "./windowLayout";
export type LooseLayout = { rows: number[]; columns: number[] };
export function initialLooseLayout(random: () => number): LooseLayout {
  return {
    rows: [0.28 + random() * 0.07, 0.63 + random() * 0.07],
    columns: Array.from({ length: 3 }, () => 0.35 + random() * 0.3),
  };
}
// Five windows occupy six adjoining regions: one vacancy, not a sparse grid.
export function looseWindowCells(layout: LooseLayout): LayoutRect[] {
  const rows = [0, ...layout.rows, 1];
  return [0, 1, 2].flatMap((band) => {
    const split = layout.columns[band]!;
    const y = rows[band]!;
    const height = rows[band + 1]! - y;
    return [
      { x: 0, y, width: split, height },
      { x: split, y, width: 1 - split, height },
    ];
  });
}
// Width changes stay in their row; height changes affect its shared neighbor.
export function followLooseLayout(layout: LooseLayout, x: number, y: number, band: number, amount: number): void {
  const width = Math.max(0.25, Math.min(0.75, x));
  layout.columns[band] = layout.columns[band]! + (width - layout.columns[band]!) * amount;
  const boundary = Math.min(band, 1);
  const rows = layout.rows;
  const lower = boundary === 0 ? 0.22 : rows[0]! + 0.22;
  const upper = boundary === 0 ? rows[1]! - 0.22 : 0.78;
  rows[boundary] = rows[boundary]! + (Math.max(lower, Math.min(upper, y)) - rows[boundary]!) * amount;
}
