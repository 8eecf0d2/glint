import { BufferGeometry, Float32BufferAttribute } from "three";

const STEPS = 10;
const COUNT = 4 * (STEPS + 1);

// Convex rounded windows have a fixed triangle fan. Resizing updates vertices
// in place instead of repeatedly triangulating a path near degenerate corners.
export function createRoundedWindowGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array((COUNT + 1) * 3), 3));
  const indices: number[] = [];
  for (let index = 0; index < COUNT; index++) indices.push(0, index + 1, (index + 1) % COUNT + 1);
  geometry.setIndex(indices);
  return geometry;
}

export function updateRoundedWindowGeometry(geometry: BufferGeometry, width: number, height: number, radius: number): void {
  if (![width, height, radius].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Invalid window dimensions");
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const positions = geometry.getAttribute("position");
  positions.setXYZ(0, 0, 0, 0);
  const corners = [
    [width / 2 - r, height / 2 - r],
    [-width / 2 + r, height / 2 - r],
    [-width / 2 + r, -height / 2 + r],
    [width / 2 - r, -height / 2 + r],
  ];
  corners.forEach(([x, y], corner) => {
    for (let step = 0; step <= STEPS; step++) {
      const angle = (corner + step / STEPS) * Math.PI / 2;
      positions.setXYZ(1 + corner * (STEPS + 1) + step, x! + Math.cos(angle) * r, y! + Math.sin(angle) * r, 0);
    }
  });
  positions.needsUpdate = true;
  geometry.computeBoundingSphere();
}
