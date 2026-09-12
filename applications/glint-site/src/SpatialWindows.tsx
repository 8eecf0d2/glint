import { useEffect, useRef } from "react";
import { CircleGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera, Scene, WebGLRenderer } from "three";
import type { BufferGeometry, Material, Object3D } from "three";
import { initialLayout, regions, planRelocation } from "./windowLayout";
import type { LayoutRect } from "./windowLayout";
import { initialLooseLayout, looseWindowCells, followLooseLayout } from "./localWindowLayout";
import { createRoundedWindowGeometry, updateRoundedWindowGeometry } from "./roundedWindowGeometry";

type WindowRect = LayoutRect;
type WindowShape = { group: Group; fill: Mesh; lights: Mesh[]; materials: Material[] };
type WindowState = WindowShape & {
  id: number; slot: number; currentRect: WindowRect; fromRect: WindowRect;
  targetRect: WindowRect; fromRotation: number; startedAt: number; duration: number; moving: boolean;
};

function interpolateRect(from: WindowRect, to: WindowRect, progress: number): WindowRect {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
  };
}

function createWindow(): WindowShape {
  const group = new Group();
  const materials: Material[] = [];
  const fillMaterial = new MeshBasicMaterial({ color: 0xf7f7f7, transparent: true, opacity: 0 });
  const fill = new Mesh(createRoundedWindowGeometry(), fillMaterial);
  fill.position.z = -0.01;
  fill.userData.cornerRadius = 0.18;
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
  if (size.width !== rect.width || size.height !== rect.height || size.lastRadius !== size.cornerRadius) {
    updateRoundedWindowGeometry(windowState.fill.geometry, rect.width, rect.height, size.cornerRadius);
    size.width = rect.width;
    size.height = rect.height;
    size.lastRadius = size.cornerRadius;
  }
  windowState.lights.forEach((light, lightIndex) => {
    light.position.set(-rect.width / 2 + 0.25 + lightIndex * 0.22, titlebarY + 0.17, 0);
  });
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function SpatialWindows({ onPhase }: { onPhase: (phase: number) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerPreference = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointer = { x: 0, y: 0, active: false, hovered: -1 };
    let seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const layout = initialLooseLayout(random);
    const rowOptions = [[0.25, 0.625], [0.375, 0.75], [0.25, 0.75], [0.375, 0.625]];
    const splitOptions = [0.25, 0.375, 0.625, 0.75];
    const entranceDelays = [160, 0, 290, 80, 380];
    layout.rows = rowOptions[Math.floor(random() * rowOptions.length)]!.slice();
    layout.columns = layout.columns.map(() => splitOptions[Math.floor(random() * splitOptions.length)]!);
    const mobileLayout = initialLayout();
    const initialSlots = [0, 1, 2, 4, 5];
    let localBand = 0;
    let clock = 0;
    let phase = 0;
    let lastPointerAt = -Infinity;
    let lastTime = 0;
    let nextMoveAt = Infinity;
    let frame = 0;
    let disposed = false;
    let compact = false;
    let wasCompact = false;
    let introPending = !motionPreference.matches;
    const viewportHeight = 10;
    let viewportWidth = viewportHeight;
    let viewportPixelHeight = Math.max(mount.clientHeight, 1);
    const scene = new Scene();
    const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.position.z = 10;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch { onPhase(4); return; }
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    mount.appendChild(renderer.domElement);
    const scatter = Array.from({ length: 5 }, () => ({
      x: 0.14 + random() * 0.72, y: 0.12 + random() * 0.76,
      width: 0.18 + random() * 0.17, height: 0.32 + random() * 0.2,
    }));
    const states: WindowState[] = initialSlots.map((slot, id) => {
      const shape = createWindow();
      (shape.fill.material as MeshBasicMaterial).color.setHex([0xe6e6e6, 0xf2f2f2, 0xdcdcdc, 0xebebeb][id % 4]!);
      shape.materials.forEach((material) => { material.opacity = introPending ? 0 : 0.55; });
      shape.group.position.z = id * 0.03;
      scene.add(shape.group);
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      return { ...shape, id, slot, currentRect: rect, fromRect: rect, targetRect: rect,
        fromRotation: 0, startedAt: 0, duration: 0.58, moving: false };
    });
    const visible = () => states.filter((state) => !compact || state.id < 2);
    const canAnimate = () => !disposed && !motionPreference.matches && !document.hidden;
    const render = () => renderer.render(scene, camera);
    const resolveRect = (state: WindowState): WindowRect => {
      const cells = compact ? regions(mobileLayout, true) : looseWindowCells(layout);
      const slot = cells[state.slot] ?? cells[0]!;
      const gap = 10 * viewportHeight / viewportPixelHeight;
      const width = viewportWidth - 0.44;
      const height = viewportHeight - 0.22 + gap / 2;
      return { x: -viewportWidth / 2 + 0.22 + (slot.x + slot.width / 2) * width,
        y: viewportHeight / 2 - 0.22 - (slot.y + slot.height / 2) * height,
        width: slot.width * width - gap, height: slot.height * height - gap };
    };
    const normalizedPointerY = () => (viewportHeight / 2 - 0.22 - pointer.y)
      / (viewportHeight - 0.22 + 5 * viewportHeight / viewportPixelHeight);
    const resetPointer = () => { pointer.active = false; pointer.hovered = -1; };
    const cancel = () => { window.cancelAnimationFrame(frame); frame = 0; nextMoveAt = Infinity; };
    const settle = () => {
      if (wasCompact !== compact) {
        states.forEach((state) => { state.slot = compact ? state.id : initialSlots[state.id]!; });
        wasCompact = compact;
      }
      states.forEach((state) => {
        state.group.visible = !compact || state.id < 2;
        state.group.rotation.z = 0;
        const messy = scatter[state.id]!;
        state.currentRect = introPending ? {
          x: (compact ? (state.id % 2 === 0 ? -0.08 : 0.08) : messy.x - 0.5) * viewportWidth,
          y: (compact ? (state.id % 2 === 0 ? 0.18 : -0.15) : 0.5 - messy.y) * viewportHeight,
          width: viewportWidth * (compact ? 0.78 : messy.width), height: viewportHeight * messy.height,
        } : resolveRect(state);
        state.fromRect = { ...state.currentRect };
        state.targetRect = { ...state.currentRect };
        state.moving = false;
        setWindowRect(state, state.currentRect);
      });
    };
    const beginMove = (state: WindowState, delay = 0) => {
      state.fromRect = { ...state.currentRect };
      state.fromRotation = state.group.rotation.z;
      state.startedAt = clock + delay;
      state.duration = 0.58;
      state.moving = true;
    };
    const beginOpening = () => {
      introPending = false;
      visible().forEach((state) => beginMove(state, [40, 0, 85, 20, 65][state.id]));
    };
    const relocate = () => {
      // Change shared partitions before travel: every window arrives already fitted.
      if (clock - lastPointerAt > 1800) {
        if (compact) mobileLayout.rows = [0.375, 0.5, 0.625][Math.floor(random() * 3)]!;
        else {
          const band = Math.floor(random() * 3);
          layout.columns[band] = splitOptions[Math.floor(random() * splitOptions.length)]!;
          layout.rows = rowOptions[Math.floor(random() * rowOptions.length)]!.slice();
        }
        visible().forEach((state) => beginMove(state));
      }
      const owners = visible().map(({ id, slot }) => ({ id, slot }));
      const vacancies = Array.from({ length: compact ? 2 : 6 }, (_, slot) => slot)
        .filter((slot) => !owners.some((owner) => owner.slot === slot));
      const candidates = owners.filter((owner) => owner.id !== pointer.hovered);
      if (!vacancies.length || !candidates.length) { nextMoveAt = clock + 1000; return; }
      const source = candidates[Math.floor(random() * candidates.length)]!;
      const target = vacancies[Math.floor(random() * vacancies.length)]!;
      const placement = planRelocation(owners, source.id, target, compact ? 2 : 6)[0]?.[0];
      if (!placement) { nextMoveAt = clock + 1000; return; }
      states.forEach((state) => { state.group.position.z = state.id * 0.03; });
      const state = states[placement.id]!;
      state.slot = placement.slot;
      state.group.position.z = 1;
      beginMove(state);
    };
    const animate = (timestamp: number) => {
      if (!canAnimate()) return;
      const elapsed = lastTime ? Math.min(timestamp - lastTime, 50) : 16;
      lastTime = timestamp;
      clock += elapsed;
      const nextPhase = clock < 220 ? 0 : clock < 900 ? 1 : clock < 1450 ? 2 : clock < 2550 ? 3 : 4;
      if (nextPhase > phase) { phase = nextPhase; onPhase(phase); }
      const soften = Math.min(Math.max((clock - 2450) / 900, 0), 1);
      visible().forEach((state) => {
        const entrance = Math.min(Math.max((clock - 240 - entranceDelays[state.id]!) / 420, 0), 1);
        state.materials.forEach((material) => { material.opacity = easeOutCubic(entrance) * (1 - soften * 0.45); });
      });
      if (clock >= nextMoveAt) {
        nextMoveAt = Infinity;
        if (introPending) beginOpening(); else relocate();
      }
      if (introPending) {
        visible().forEach((state) => {
          const phase = state.id * 1.7;
          const arriving = 1 - easeOutCubic(Math.min(Math.max((clock - 240 - entranceDelays[state.id]!) / 600, 0), 1));
          state.currentRect = { ...state.fromRect,
            x: state.fromRect.x + Math.sin(clock / 1000 * 1.05 + phase) * 0.045
              + (state.id % 2 ? -1 : 1) * arriving * viewportWidth * 0.15,
            y: state.fromRect.y + Math.sin(clock / 1000 * 1.3 + phase) * 0.085
              - arriving * 1.2 };
          state.group.rotation.z = Math.sin(clock / 1000 * 0.8 + phase) * 0.012;
          setWindowRect(state, state.currentRect);
        });
      } else {
        // Input is never gated on travel. Shared layout and moving destinations
        // update in the same frame; translation and size finish together.
        if (pointer.active && clock > 3300 && clock - lastPointerAt < 1800) {
          const x = (pointer.x + viewportWidth / 2 - 0.22) / (viewportWidth - 0.44);
          const y = normalizedPointerY();
          const follow = 1 - Math.exp(-elapsed / 1000 * 26);
          if (compact) mobileLayout.rows += (Math.max(0.2, Math.min(0.8, y)) - mobileLayout.rows) * follow;
          else followLooseLayout(layout, x, y, localBand, follow);
        }
        const hadMovement = states.some((state) => state.moving);
        visible().forEach((state) => {
          state.targetRect = resolveRect(state);
          if (state.moving) {
            const raw = Math.min(Math.max((clock - state.startedAt) / (state.duration * 1000), 0), 1);
            const progress = easeOutCubic(raw);
            state.currentRect = interpolateRect(state.fromRect, state.targetRect, progress);
            state.group.rotation.z = state.fromRotation * (1 - progress);
            state.moving = raw < 1;
          } else state.currentRect = state.targetRect;
          setWindowRect(state, state.currentRect);
        });
        if (hadMovement && !states.some((state) => state.moving)) nextMoveAt = clock + 2300 + random() * 1600;
      }
      render();
      frame = window.requestAnimationFrame(animate);
    };
    const movePointer = (event: PointerEvent) => {
      if (!canAnimate() || event.pointerType !== "mouse" || !pointerPreference.matches
        || (event.target instanceof Element && event.target.closest("footer"))) { resetPointer(); return; }
      const bounds = mount.getBoundingClientRect();
      if (event.clientY < bounds.top || event.clientY > bounds.bottom) { resetPointer(); return; }
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * viewportWidth;
      pointer.y = (0.5 - (event.clientY - bounds.top) / bounds.height) * viewportHeight;
      pointer.active = true;
      lastPointerAt = clock;
      if (!compact) {
        const y = normalizedPointerY();
        const cuts = layout.rows;
        if (Math.min(Math.abs(y - cuts[0]!), Math.abs(y - cuts[1]!)) > 0.02)
          localBand = y < cuts[0]! ? 0 : y < cuts[1]! ? 1 : 2;
      }
      pointer.hovered = visible().find((state) => {
        const rect = resolveRect(state);
        return Math.abs(rect.x - pointer.x) < rect.width / 2 && Math.abs(rect.y - pointer.y) < rect.height / 2;
      })?.id ?? -1;
    };
    const restart = () => {
      cancel(); resetPointer();
      if (motionPreference.matches) { introPending = false; onPhase(4); states.forEach((state) => state.materials.forEach((material) => { material.opacity = 0.55; })); }
      settle(); render(); lastTime = 0;
      if (canAnimate()) { nextMoveAt = introPending ? 1450 : clock + 2800; frame = window.requestAnimationFrame(animate); }
    };
    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      viewportPixelHeight = Math.max(mount.clientHeight, 1);
      compact = width < 620;
      viewportWidth = viewportHeight * width / viewportPixelHeight;
      renderer.setSize(width, viewportPixelHeight, false);
      camera.left = -viewportWidth / 2; camera.right = viewportWidth / 2;
      camera.updateProjectionMatrix();
      states.forEach((state) => { state.fill.userData.cornerRadius = 12 * viewportHeight / viewportPixelHeight; });
      restart();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    document.documentElement.addEventListener("pointerleave", resetPointer);
    pointerPreference.addEventListener("change", restart);
    motionPreference.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    resize();
    return () => {
      disposed = true; cancel(); observer.disconnect();
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("blur", resetPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      pointerPreference.removeEventListener("change", restart);
      motionPreference.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
      states.forEach((state) => {
        const geometries = new Set<BufferGeometry>();
        state.group.traverse((object: Object3D) => { if (object instanceof Mesh) geometries.add(object.geometry); });
        geometries.forEach((geometry) => geometry.dispose());
        state.materials.forEach((material) => material.dispose());
      });
      renderer.dispose(); mount.removeChild(renderer.domElement);
    };
  }, [onPhase]);
  return <div className="spatial-background" ref={mountRef} aria-hidden="true" />;
}
