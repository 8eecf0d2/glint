import { useEffect, useRef } from "react";
import {
  CircleGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera,
  Scene, Shape, ShapeGeometry, WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";
import { initialLayout, planRelocation, regions } from "./windowLayout";
import type { Divider, LayoutRect, Placement } from "./windowLayout";

type WindowRect = LayoutRect;
type WindowShape = { group: Group; fill: Mesh; lights: Mesh[]; materials: Material[] };
type WindowState = WindowShape & {
  id: number;
  active: boolean;
  slot: number;
  phase: "move" | "close" | "spawn";
  fromRotation: number;
  currentRect: WindowRect;
  fromRect: WindowRect;
  targetRect: WindowRect;
  startedAt: number;
  duration: number;
  moving: boolean;
};

function interpolateRect(from: WindowRect, to: WindowRect, progress: number): WindowRect {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
  };
}

function roundedRectangleShape(width: number, height: number, radius: number) {
  const shape = new Shape();
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const resolvedRadius = Math.min(radius, halfWidth, halfHeight);
  shape.moveTo(-halfWidth + resolvedRadius, -halfHeight);
  shape.lineTo(halfWidth - resolvedRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + resolvedRadius);
  shape.lineTo(halfWidth, halfHeight - resolvedRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - resolvedRadius, halfHeight);
  shape.lineTo(-halfWidth + resolvedRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - resolvedRadius);
  shape.lineTo(-halfWidth, -halfHeight + resolvedRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + resolvedRadius, -halfHeight);
  return shape;
}

function createWindow(): WindowShape {
  const group = new Group();
  const materials: Material[] = [];
  const fillMaterial = new MeshBasicMaterial({ color: 0xf7f7f7, transparent: true, opacity: 0 });
  const fill = new Mesh(new ShapeGeometry(), fillMaterial);
  fill.position.z = -0.01;
  materials.push(fillMaterial);
  group.add(fill);

  const lightMaterial = new MeshBasicMaterial({ color: 0xc9c9c9, transparent: true, opacity: 0 });
  const lightGeometry = new CircleGeometry(0.065, 16);
  const lights: Mesh[] = [];
  materials.push(lightMaterial);
  for (let lightIndex = 0; lightIndex < 3; lightIndex += 1) {
    const light = new Mesh(lightGeometry, lightMaterial);
    lights.push(light);
    group.add(light);
  }
  return { group, fill, lights, materials };
}

function setWindowRect(windowState: WindowShape, rect: WindowRect) {
  const titlebarY = rect.height / 2 - 0.36;
  windowState.group.position.x = rect.x;
  windowState.group.position.y = rect.y;
  // Position-only movement can reuse its geometry.
  const size = windowState.fill.userData;
  if (size.width !== rect.width || size.height !== rect.height) {
    windowState.fill.geometry.dispose();
    windowState.fill.geometry = new ShapeGeometry(roundedRectangleShape(rect.width, rect.height, 0.18));
    size.width = rect.width;
    size.height = rect.height;
  }
  windowState.lights.forEach((light, lightIndex) => {
    light.position.set(-rect.width / 2 + 0.25 + lightIndex * 0.22, titlebarY + 0.17, 0);
  });
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function SpatialWindows() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new Scene();
    const viewportHeight = 10;
    let viewportWidth = viewportHeight;
    let compact = false;
    const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.position.z = 10;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    mount.appendChild(renderer.domElement);

    // Scatter across the whole desktop, with varied sizes and natural overlap.
    // Generate once so resize preserves the opening composition.
    const scatter = Array.from({ length: 6 }, (_, index) => ({
      x: 0.24 + (index % 3) * 0.25 + (Math.random() - 0.5) * 0.12,
      y: 0.32 + Math.floor(index / 3) * 0.3 + (Math.random() - 0.5) * 0.16,
      width: 0.29 + Math.random() * 0.17,
      height: 0.32 + Math.random() * 0.2,
    }));
    let introPending = !motionPreference.matches;
    const layout = initialLayout();
    const windowStates: WindowState[] = Array.from({ length: 6 }, (_, index) => {
      const shape = createWindow();
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      shape.materials.forEach((material) => { material.opacity = 1; });
      shape.group.position.z = index * 0.03;
      scene.add(shape.group);
      return { ...shape, id: index, active: [0, 1, 2, 4].includes(index), slot: index,
        phase: "move", fromRotation: 0, currentRect: rect, fromRect: rect, targetRect: rect,
        startedAt: 0, duration: 0.4, moving: false };
    });
    const visibleStates = () => windowStates.filter((state) => state.active && (!compact || state.id < 2));
    const occupied = (): Placement[] => visibleStates().map(({ id, slot }) => ({ id, slot }));
    const cells = () => regions(layout, compact, Math.min(0.2, 1.1 / viewportWidth), 0.2);
    const resolveRect = (state: WindowState): WindowRect => {
      const slot = cells()[state.slot] ?? cells()[0]!;
      const outerInset = 0.22;
      const gap = 0.18;
      const usableWidth = viewportWidth - outerInset * 2;
      // The canvas already reserves the footer gap; do not add a second bottom inset.
      const usableHeight = viewportHeight - outerInset + gap / 2;
      return {
        x: -viewportWidth / 2 + outerInset + (slot.x + slot.width / 2) * usableWidth,
        y: viewportHeight / 2 - outerInset - (slot.y + slot.height / 2) * usableHeight,
        width: slot.width * usableWidth - gap,
        height: slot.height * usableHeight - gap,
      };
    };

    let frame = 0;
    let timer = 0;
    let beatIndex = 0;
    const pending: (() => void)[] = [];
    let wasCompact = false;
    let restAfterMovement = 0.85;
    let disposed = false;
    const canAnimate = () => !disposed && !motionPreference.matches && !document.hidden;
    const render = () => renderer.render(scene, camera);
    const cancel = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    const settle = () => {
      pending.length = 0;
      // Re-establish unique ownership when switching between two and six cells.
      if (wasCompact !== compact) {
        windowStates.forEach((state) => {
          state.slot = state.id;
          state.active = [0, 1, 2, 4].includes(state.id);
        });
        wasCompact = compact;
      }
      windowStates.forEach((state, index) => {
        state.group.visible = state.active && (!compact || index < 2);
        state.group.scale.setScalar(1);
        state.group.rotation.z = 0;
        state.materials.forEach((material) => { material.opacity = 1; });
        state.phase = "move";
        const messy = scatter[index]!;
        state.currentRect = introPending ? {
          x: (compact ? (index % 2 === 0 ? -0.08 : 0.08) : messy.x - 0.5) * viewportWidth,
          y: (compact ? (index % 2 === 0 ? 0.18 : -0.15) : 0.5 - messy.y) * viewportHeight,
          width: viewportWidth * (compact ? 0.78 : messy.width),
          height: viewportHeight * messy.height,
        } : resolveRect(state);
        state.fromRect = { ...state.currentRect };
        state.targetRect = { ...state.currentRect };
        state.moving = false;
        setWindowRect(state, state.currentRect);
      });
    };
    const schedule = (seconds: number) => {
      if (!canAnimate()) return;
      timer = window.setTimeout(() => {
        if (!canAnimate()) return;
        if (introPending) beginOpening();
        else if (pending.length) pending.shift()!();
        else beginBeat();
      }, seconds * 1000);
      if (introPending) frame = window.requestAnimationFrame(animate);
    };
    const animate = (now: number) => {
      if (!canAnimate()) return;
      if (introPending) {
        windowStates.forEach((state, index) => {
          if (!state.group.visible) return;
          const time = now / 1000;
          const phase = index * 1.7;
          state.currentRect = {
            ...state.fromRect,
            x: state.fromRect.x + Math.sin(time * 1.05 + phase) * 0.045,
            y: state.fromRect.y + Math.sin(time * 1.3 + phase) * 0.085,
          };
          state.group.rotation.z = Math.sin(time * 0.8 + phase) * 0.012;
          setWindowRect(state, state.currentRect);
        });
        render();
        frame = window.requestAnimationFrame(animate);
        return;
      }
      let moving = false;
      windowStates.forEach((state) => {
        if (!state.moving) return;
        const raw = Math.min(Math.max((now - state.startedAt) / (state.duration * 1000), 0), 1);
        const progress = state.phase === "close" ? raw * raw : easeOutCubic(raw);
        state.currentRect = interpolateRect(state.fromRect, state.targetRect, progress);
        setWindowRect(state, state.currentRect);
        state.group.rotation.z = state.fromRotation * (1 - progress);
        if (state.phase === "close" || state.phase === "spawn") {
          const appearance = state.phase === "close" ? 1 - progress : progress;
          state.group.scale.setScalar(0.08 + appearance * 0.92);
          state.materials.forEach((material) => { material.opacity = appearance; });
        }
        state.moving = raw < 1;
        if (raw === 1 && state.phase === "close") {
          state.group.visible = false;
        } else if (raw === 1 && state.phase === "spawn") {
          state.phase = "move";
          state.group.scale.setScalar(1);
        }
        moving ||= state.moving;
      });
      render();
      if (moving) frame = window.requestAnimationFrame(animate);
      else schedule(pending.length ? 0.1 : restAfterMovement);
    };
    function beginOpening() {
      if (!canAnimate()) return;
      introPending = false;
      window.cancelAnimationFrame(frame);
      const now = performance.now();
      windowStates.forEach((state, index) => {
        if (!state.group.visible) return;
        state.fromRect = { ...state.currentRect };
        state.fromRotation = state.group.rotation.z;
        state.targetRect = resolveRect(state);
        state.startedAt = now + (Math.floor(index / 2) * 0.38 + (index % 2) * 0.14) * 1000;
        state.duration = 0.58;
        state.moving = true;
      });
      restAfterMovement = 0.7;
      frame = window.requestAnimationFrame(animate);
    }

    function transition(states: WindowState[], duration = 0.48, targets?: WindowRect[]) {
      const now = performance.now();
      states.forEach((state, index) => {
        state.fromRect = { ...state.currentRect };
        state.targetRect = targets?.[index] ?? resolveRect(state);
        state.fromRotation = 0;
        state.startedAt = now;
        state.duration = duration;
        state.moving = true;
      });
      frame = window.requestAnimationFrame(animate);
    }

    function resizeBoundary(divider: Divider, ratio: number) {
      layout[divider] = ratio;
      // Every affected neighbor shares the same clock/easing. Delaying even one
      // would let the growing side overrun the shrinking side mid-animation.
      visibleStates().forEach((state) => { state.phase = "move"; });
      transition(visibleStates(), 0.46);
    }

    function queueTravel(placements: Placement[]) {
      const movers = placements.map(({ id }) => windowStates[id]!);
      // Fit inside both source and destination before crossing the desktop.
      // Growth happens after arrival, wholly inside the reserved empty region.
      const targets = placements.map(({ slot }, index) => resolveRect({ ...movers[index]!, slot }));
      const travelSizes = targets.map((target, index) => ({
        width: Math.min(target.width, movers[index]!.currentRect.width),
        height: Math.min(target.height, movers[index]!.currentRect.height),
      }));
      const needsFit = movers.some((state, index) =>
        state.currentRect.width > travelSizes[index]!.width + 0.001
        || state.currentRect.height > travelSizes[index]!.height + 0.001);
      if (needsFit) pending.push(() => transition(movers, 0.24,
        movers.map((state, index) => ({ ...state.currentRect, ...travelSizes[index]! }))));
      pending.push(() => {
        placements.forEach(({ slot }, index) => {
          movers[index]!.slot = slot;
          movers[index]!.group.position.z = 1 + index * 0.03;
        });
        transition(movers, 0.52, targets.map((target, index) => ({ ...target, ...travelSizes[index]! })));
      });
      if (targets.some((target, index) => target.width > travelSizes[index]!.width + 0.001
        || target.height > travelSizes[index]!.height + 0.001)) {
        pending.push(() => transition(movers, 0.28, targets));
      }
    }

    function beginRelocation() {
      const owners = occupied();
      const capacity = compact ? 2 : 6;
      const vacancies = Array.from({ length: capacity }, (_, i) => i)
        .filter((slot) => !owners.some((owner) => owner.slot === slot));
      if (!vacancies.length) return false;
      const source = owners[Math.floor(Math.random() * owners.length)]!;
      const neighbors = owners.filter((owner) => owner.id !== source.id);
      const target = neighbors.length && Math.random() < 0.65
        ? neighbors[Math.floor(Math.random() * neighbors.length)]!.slot
        : vacancies[Math.floor(Math.random() * vacancies.length)]!;
      const stages = planRelocation(owners, source.id, target, capacity);
      stages.forEach((stage) => queueTravel(stage));
      // Two independent moves may share a travel phase when there is room.
      if (stages.length === 1 && vacancies.length > 1 && neighbors.length && Math.random() < 0.6) {
        pending.length = 0;
        const companion = neighbors[Math.floor(Math.random() * neighbors.length)]!;
        queueTravel([{ id: source.id, slot: target },
          { id: companion.id, slot: vacancies.find((slot) => slot !== target)! }]);
      }
      if (!pending.length) return false;
      pending.shift()!();
      return true;
    }

    function beginLifecycle() {
      const eligible = windowStates.filter((state) => !compact || state.id < 2);
      const active = visibleStates();
      const capacity = compact ? 2 : 6;
      const vacancies = Array.from({ length: capacity }, (_, i) => i)
        .filter((slot) => !active.some((state) => state.slot === slot));
      const closed = eligible.filter((state) => !state.active);
      const shouldOpen = active.length <= (compact ? 1 : 3)
        || (active.length < (compact ? 2 : 5) && Math.random() < 0.55);
      const choices = shouldOpen ? closed : active;
      if (!choices.length || (shouldOpen && !vacancies.length)) return false;
      const state = choices[Math.floor(Math.random() * choices.length)]!;
      state.active = shouldOpen;
      state.phase = shouldOpen ? "spawn" : "close";
      state.group.visible = true;
      if (shouldOpen) {
        state.slot = vacancies[Math.floor(Math.random() * vacancies.length)]!;
        state.currentRect = resolveRect(state);
      }
      state.group.scale.setScalar(shouldOpen ? 0.08 : 1);
      state.materials.forEach((material) => { material.opacity = shouldOpen ? 0 : 1; });
      transition([state], shouldOpen ? 0.32 : 0.28, [{ ...state.currentRect }]);
      return true;
    }

    function beginBeat() {
      if (!canAnimate()) return;
      windowStates.forEach((state) => { state.group.position.z = state.id * 0.03; });
      restAfterMovement = 0.38 + Math.random() * 0.42;
      const beat = beatIndex++;
      // Establish the cause/effect with a readable 50/50 → 75/25 opening.
      if (beat === 0) { resizeBoundary(compact ? "rows" : "top", compact ? 0.6 : 0.75); return; }
      if (beat % 5 === 4 && beginLifecycle()) return;
      if (beat % 3 === 2 && beginRelocation()) return;
      const dividers: Divider[] = compact ? ["rows"] : ["top", "rows", "bottom", "lowerLeft", "lowerRight"];
      const before = cells();
      const choices = dividers.flatMap((divider) => (divider === "top" || divider === "bottom"
        ? [0.25, 0.5, 0.75] : [0.2, 0.4, 0.6, 0.8])
        .filter((ratio) => Math.abs(ratio - layout[divider]) > 0.1)
        .map((ratio) => ({ divider, ratio })))
        .filter(({ divider, ratio }) => {
          const after = regions({ ...layout, [divider]: ratio }, compact, Math.min(0.2, 1.1 / viewportWidth), 0.2);
          return visibleStates().some(({ slot }) => {
            const a = before[slot]!;
            const b = after[slot]!;
            return Math.max(Math.abs(a.width - b.width), Math.abs(a.height - b.height)) > 0.14;
          });
        });
      const choice = choices[Math.floor(Math.random() * choices.length)];
      if (choice) resizeBoundary(choice.divider, choice.ratio);
      else schedule(0.4);
    }

    const resize = () => {
      cancel();
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      compact = width < 620;
      viewportWidth = viewportHeight * width / height;
      renderer.setSize(width, height, false);
      camera.left = -viewportWidth / 2;
      camera.right = viewportWidth / 2;
      camera.updateProjectionMatrix();
      windowStates.forEach((state, index) => { state.group.visible = !compact || index < 2; });
      settle();
      render();
      schedule(introPending ? 1.45 : 0.85);
    };
    const resume = () => {
      cancel();
      // Reduced motion shows the settled desktop, without playing the entrance.
      if (motionPreference.matches) introPending = false;
      // No catch-up burst after switching tabs or changing motion preferences.
      settle();
      render();
      schedule(introPending ? 1.45 : 0.85);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    motionPreference.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    resize();

    return () => {
      disposed = true;
      cancel();
      observer.disconnect();
      motionPreference.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      windowStates.forEach((state) => {
        const geometries = new Set<ShapeGeometry | CircleGeometry>();
        state.group.traverse((object: Object3D) => {
          if (object instanceof Mesh) geometries.add(object.geometry);
        });
        geometries.forEach((geometry) => geometry.dispose());
        state.materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="spatial-background" ref={mountRef} aria-hidden="true" />;
}
