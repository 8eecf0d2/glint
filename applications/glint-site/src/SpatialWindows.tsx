import { useEffect, useRef } from "react";
import {
  CircleGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera,
  Scene, Shape, ShapeGeometry, WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";

type WindowRect = { x: number; y: number; width: number; height: number };
type WindowShape = { group: Group; fill: Mesh; lights: Mesh[]; materials: Material[] };
type WindowState = WindowShape & {
  active: boolean;
  phase: "move" | "close" | "spawn";
  fromRotation: number;
  slot: WindowRect;
  inset: number;
  currentRect: WindowRect;
  fromRect: WindowRect;
  targetRect: WindowRect;
  startedAt: number;
  duration: number;
  moving: boolean;
};
type Beat = {
  column: number;
  split?: number;
  exchangeWith?: number;
  inset?: number;
  stagger: number;
  duration: number;
  rest: number;
};

// Short, varied phrases: paired snaps, individual resizes and occasional
// cross-screen exchanges. At least two windows stay anchored in every beat.
const beats: Beat[] = [
  { column: 0, split: 0.5, stagger: 0.12, duration: 0.42, rest: 0.85 },
  { column: 1, split: 0.5, stagger: 0.1, duration: 0.4, rest: 0.65 },
  { column: 2, inset: 0.2, stagger: 0, duration: 0.4, rest: 0.55 },
  { column: 2, inset: 0, stagger: 0, duration: 0.38, rest: 1.2 },
  { column: 0, exchangeWith: 2, stagger: 0.12, duration: 0.52, rest: 1.4 },
  { column: 2, split: 0.5, stagger: 0.14, duration: 0.42, rest: 0.75 },
  { column: 0, inset: 0.16, stagger: 0, duration: 0.38, rest: 0.5 },
  { column: 0, inset: 0, stagger: 0, duration: 0.4, rest: 0.9 },
  { column: 0, split: 1 / 3, stagger: 0.1, duration: 0.44, rest: 0.7 },
  { column: 1, split: 2 / 3, stagger: 0.12, duration: 0.42, rest: 1.3 },
  { column: 0, exchangeWith: 2, stagger: 0.1, duration: 0.5, rest: 0.85 },
  { column: 2, split: 1 / 3, stagger: 0.12, duration: 0.4, rest: 1.6 },
];

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
    // Keep at least one window in each column; open with four or five, not six.
    const initiallyHidden = new Set<number>();
    const shuffledColumns = [0, 1, 2].sort(() => Math.random() - 0.5);
    for (const column of shuffledColumns.slice(0, Math.random() < 0.5 ? 1 : 2)) {
      initiallyHidden.add(column * 2 + Math.floor(Math.random() * 2));
    }
    const windowStates: WindowState[] = Array.from({ length: 6 }, (_, index) => {
      const shape = createWindow();
      const column = Math.floor(index / 2);
      const split = column === 1 ? 2 / 3 : 1 / 3;
      const lower = index % 2 === 1;
      const slot = { x: column / 3, y: lower ? split : 0, width: 1 / 3, height: lower ? 1 - split : split };
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      shape.materials.forEach((material) => { material.opacity = 1; });
      // Stable stacking keeps overlapping window controls with their own window.
      shape.group.position.z = index * 0.03;
      scene.add(shape.group);
      return { ...shape, active: !initiallyHidden.has(index), phase: "move", fromRotation: 0, slot, inset: 0, currentRect: rect, fromRect: rect, targetRect: rect,
        startedAt: 0, duration: 0.4, moving: false };
    });

    const resolveRect = (state: WindowState): WindowRect => {
      const index = windowStates.indexOf(state);
      const sibling = windowStates[index ^ 1]!;
      // A surviving window takes the space of its closed partner.
      const slot = sibling.active ? state.slot : { ...state.slot, y: 0, height: 1 };
      const outerInset = 0.12;
      const gap = 0.11;
      const usableWidth = viewportWidth - outerInset * 2;
      const usableHeight = viewportHeight - outerInset * 2;
      // Mobile has one complete pair, rather than a cropped six-window layout.
      const left = compact ? 0 : slot.x;
      const width = compact ? 1 : slot.width;
      return {
        x: -viewportWidth / 2 + outerInset + (left + width / 2) * usableWidth,
        y: viewportHeight / 2 - outerInset - (slot.y + slot.height / 2) * usableHeight,
        width: (width * usableWidth - gap) * (1 - state.inset),
        height: (slot.height * usableHeight - gap) * (1 - state.inset),
      };
    };

    let frame = 0;
    let timer = 0;
    let beatIndex = 0;
    let beatsUntilLifecycle = 2;
    let restAfterMovement = 0.85;
    let disposed = false;
    const canAnimate = () => !disposed && !motionPreference.matches && !document.hidden;
    const render = () => renderer.render(scene, camera);
    const cancel = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    const settle = () => {
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
      timer = window.setTimeout(introPending ? beginOpening : beginBeat, seconds * 1000);
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
        // Elasticity follows spatial progress, so it settles with the snap.
        const squeeze = Math.sin(progress * Math.PI);
        state.currentRect.width *= 1 - squeeze * 0.012;
        state.currentRect.height *= 1 - squeeze * 0.018;
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
          // A new window opens freely, hangs briefly, then finds its slot.
          state.phase = "move";
          state.fromRect = { ...state.currentRect };
          state.targetRect = resolveRect(state);
          state.startedAt = now + 240;
          state.duration = 0.5;
          state.fromRotation = 0;
          state.moving = true;
          state.group.scale.setScalar(1);
        }
        moving ||= state.moving;
      });
      render();
      if (moving) frame = window.requestAnimationFrame(animate);
      else schedule(restAfterMovement);
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

    function beginLifecycle() {
      const eligible = windowStates.filter((_, index) => !compact || index < 2);
      const closed = eligible.filter((state) => !state.active);
      const closable = eligible.filter((state) => state.active && windowStates[windowStates.indexOf(state) ^ 1]!.active);
      const shouldOpen = closed.length > 0 && (closable.length === 0 || Math.random() < 0.55);
      const candidates = shouldOpen ? closed : closable;
      if (candidates.length === 0) return false;
      const state = candidates[Math.floor(Math.random() * candidates.length)]!;
      const sibling = windowStates[windowStates.indexOf(state) ^ 1]!;
      const now = performance.now();
      state.active = shouldOpen;
      state.inset = 0;
      state.phase = shouldOpen ? "spawn" : "close";
      state.fromRotation = 0;
      state.group.visible = true;
      state.group.scale.setScalar(shouldOpen ? 0.08 : 1);
      state.materials.forEach((material) => { material.opacity = shouldOpen ? 0 : 1; });
      if (shouldOpen) {
        const destination = resolveRect(state);
        const width = destination.width * (0.72 + Math.random() * 0.2);
        const height = destination.height * (0.72 + Math.random() * 0.2);
        state.currentRect = {
          width, height,
          x: Math.max(-viewportWidth / 2 + width / 2 + 0.12,
            Math.min(viewportWidth / 2 - width / 2 - 0.12, destination.x + (Math.random() - 0.5) * viewportWidth * 0.25)),
          y: Math.max(-viewportHeight / 2 + height / 2 + 0.12,
            Math.min(viewportHeight / 2 - height / 2 - 0.12, destination.y + (Math.random() - 0.5) * 1.2)),
        };
      }
      state.fromRect = { ...state.currentRect };
      state.targetRect = { ...state.currentRect };
      state.startedAt = now;
      state.duration = shouldOpen ? 0.38 : 0.34;
      state.moving = true;
      if (sibling.active) {
        sibling.phase = "move";
        sibling.fromRotation = 0;
        sibling.fromRect = { ...sibling.currentRect };
        sibling.targetRect = resolveRect(sibling);
        sibling.startedAt = now + 140;
        sibling.duration = 0.46;
        sibling.moving = true;
      }
      restAfterMovement = 0.55 + Math.random() * 0.6;
      frame = window.requestAnimationFrame(animate);
      return true;
    }

    function beginBeat() {
      if (!canAnimate()) return;
      if (--beatsUntilLifecycle <= 0) {
        beatsUntilLifecycle = 2 + Math.floor(Math.random() * 3);
        if (beginLifecycle()) return;
      }
      let beat = beats[beatIndex++ % beats.length]!;
      while (compact && (beat.column !== 0 || beat.exchangeWith !== undefined)) beat = beats[beatIndex++ % beats.length]!;
      const firstIndex = beat.column * 2;
      const indices = beat.exchangeWith !== undefined
        ? [firstIndex, firstIndex + 1, beat.exchangeWith * 2, beat.exchangeWith * 2 + 1]
        : beat.split === undefined ? [firstIndex] : [firstIndex, firstIndex + 1];
      const firstX = windowStates[firstIndex]!.slot.x;
      const otherX = beat.exchangeWith === undefined ? firstX : windowStates[beat.exchangeWith * 2]!.slot.x;
      const now = performance.now();
      indices.forEach((index, offset) => {
        const state = windowStates[index]!;
        if (beat.exchangeWith !== undefined) {
          state.slot.x = offset < 2 ? otherX : firstX;
        } else if (beat.split !== undefined) {
          state.slot.y = offset === 0 ? 0 : beat.split;
          state.slot.height = offset === 0 ? beat.split : 1 - beat.split;
        } else {
          state.inset = beat.inset ?? 0;
        }
        if (!state.active) return;
        state.phase = "move";
        state.fromRotation = 0;
        state.fromRect = { ...state.currentRect };
        state.targetRect = resolveRect(state);
        state.startedAt = now + offset * beat.stagger * 1000;
        state.duration = beat.duration;
        state.moving = true;
      });
      restAfterMovement = beat.rest * (0.8 + Math.random() * 0.4);
      frame = window.requestAnimationFrame(animate);
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
