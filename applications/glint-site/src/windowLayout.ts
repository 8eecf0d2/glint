export type LayoutRect = { x: number; y: number; width: number; height: number };
export type Divider = "rows" | "top" | "bottom" | "lowerLeft" | "lowerRight";
export type Layout = Record<Divider, number>;
type Region = { slot: number } | { divider: Divider; axis: "x" | "y"; children: [Region, Region] };

const desktop: Region = {
  divider: "rows", axis: "y", children: [
    { divider: "top", axis: "x", children: [{ slot: 0 }, { slot: 1 }] },
    { divider: "bottom", axis: "x", children: [
      { divider: "lowerLeft", axis: "y", children: [{ slot: 2 }, { slot: 3 }] },
      { divider: "lowerRight", axis: "y", children: [{ slot: 4 }, { slot: 5 }] },
    ] },
  ],
};
const mobile: Region = { divider: "rows", axis: "y", children: [{ slot: 0 }, { slot: 1 }] };
export const initialLayout = (): Layout => ({ rows: 0.4, top: 0.5, bottom: 0.5, lowerLeft: 0.6, lowerRight: 0.4 });

// Shared partitions guarantee clear settled rectangles, including when several
// boundaries change together. Minimum sizes propagate up to their parents.
export function regions(layout: Layout, compact = false, minWidth = 0.12, minHeight = 0.2): LayoutRect[] {
  const result: LayoutRect[] = [];
  const minimum = (node: Region, axis: "x" | "y"): number => {
    if ("slot" in node) return axis === "x" ? minWidth : minHeight;
    const a = minimum(node.children[0], axis);
    const b = minimum(node.children[1], axis);
    return node.axis === axis ? a + b : Math.max(a, b);
  };
  const visit = (node: Region, rect: LayoutRect) => {
    if ("slot" in node) { result[node.slot] = rect; return; }
    const horizontal = node.axis === "x";
    const span = horizontal ? rect.width : rect.height;
    const lower = minimum(node.children[0], node.axis) / span;
    const upper = 1 - minimum(node.children[1], node.axis) / span;
    // Snap actual screen dimensions, not relative percentages of a nested cell.
    // Otherwise a quarter of a short region creates tiny, granular windows.
    const step = horizontal ? 1 / 4 : 0.2;
    const firstStep = Math.ceil((lower * span - 1e-9) / step);
    const lastStep = Math.floor((upper * span + 1e-9) / step);
    const requestedStep = Math.round(span * layout[node.divider] / step);
    const snapped = Math.max(firstStep, Math.min(lastStep, requestedStep)) * step;
    const ratio = firstStep <= lastStep ? snapped / span
      : Math.max(lower, Math.min(upper, layout[node.divider]));
    const [first, second] = node.children;
    if (horizontal) {
      visit(first, { ...rect, width: span * ratio });
      visit(second, { ...rect, x: rect.x + span * ratio, width: span * (1 - ratio) });
    } else {
      visit(first, { ...rect, height: span * ratio });
      visit(second, { ...rect, y: rect.y + span * ratio, height: span * (1 - ratio) });
    }
  };
  visit(compact ? mobile : desktop, { x: 0, y: 0, width: 1, height: 1 });
  return result;
}

export type Placement = { id: number; slot: number };
// Reserve the destination by relocating its occupant before the incoming move.
// An always-empty desktop slot makes this bounded and avoids eviction chains.
export function planRelocation(occupied: Placement[], id: number, target: number, capacity: number): Placement[][] {
  const source = occupied.find((entry) => entry.id === id);
  if (!source || source.slot === target || target < 0 || target >= capacity) return [];
  const occupant = occupied.find((entry) => entry.slot === target);
  if (!occupant) return [[{ id, slot: target }]];
  const vacancy = Array.from({ length: capacity }, (_, i) => i)
    .find((slot) => !occupied.some((entry) => entry.slot === slot));
  if (vacancy === undefined) return [];
  return [[{ id: occupant.id, slot: vacancy }], [{ id, slot: target }]];
}
