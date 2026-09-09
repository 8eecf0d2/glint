import { useEffect, useRef } from "react";
import {
  CircleGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera,
  Scene, Shape, ShapeGeometry, WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";

type WindowRect = { x: number; y: number; width: number; height: number };
type WindowShape = { group: Group; fill: Mesh; lights: Mesh[]; materials: Material[] };
type WindowState = WindowShape & {
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
  inset?: number;
  stagger: number;
  duration: number;
  rest: number;
};

// Local adjustments preserve the other windows and return to the opening layout.
// A short follow-up occasionally punctuates the longer, quiet holds.
const beats: Beat[] = [
  { column: 0, split: 0.5, stagger: 0.14, duration: 0.42, rest: 4.4 },
  { column: 2, inset: 0.08, stagger: 0, duration: 0.38, rest: 0.9 },
  { column: 2, inset: 0, stagger: 0, duration: 0.4, rest: 5.2 },
  { column: 1, split: 0.5, stagger: 0, duration: 0.44, rest: 3.6 },
  { column: 2, split: 0.5, stagger: 0.18, duration: 0.42, rest: 5.6 },
  { column: 0, inset: 0.06, stagger: 0, duration: 0.36, rest: 1.1 },
  { column: 0, inset: 0, stagger: 0, duration: 0.4, rest: 4.8 },
  { column: 0, split: 1 / 3, stagger: 0, duration: 0.44, rest: 3.8 },
  { column: 1, split: 2 / 3, stagger: 0.16, duration: 0.42, rest: 4.6 },
  { column: 2, split: 1 / 3, stagger: 0, duration: 0.4, rest: 5.4 },
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
  windowState.group.position.set(rect.x, rect.y, 0);
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

    const windowStates: WindowState[] = Array.from({ length: 6 }, (_, index) => {
      const shape = createWindow();
      const column = Math.floor(index / 2);
      const split = column === 1 ? 2 / 3 : 1 / 3;
      const lower = index % 2 === 1;
      const slot = { x: column / 3, y: lower ? split : 0, width: 1 / 3, height: lower ? 1 - split : split };
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      shape.materials.forEach((material) => { material.opacity = 1; });
      // The opening is already calm: no floating, rotation or six-window entrance.
      scene.add(shape.group);
      return { ...shape, slot, inset: 0, currentRect: rect, fromRect: rect, targetRect: rect,
        startedAt: 0, duration: 0.4, moving: false };
    });

    const resolveRect = (state: WindowState): WindowRect => {
      const slot = state.slot;
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
    let restAfterMovement = 4;
    let disposed = false;
    const canAnimate = () => !disposed && !motionPreference.matches && !document.hidden;
    const render = () => renderer.render(scene, camera);
    const cancel = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    const settle = () => {
      windowStates.forEach((state) => {
        state.currentRect = resolveRect(state);
        state.fromRect = { ...state.currentRect };
        state.targetRect = { ...state.currentRect };
        state.moving = false;
        setWindowRect(state, state.currentRect);
      });
    };
    const schedule = (seconds: number) => {
      if (canAnimate()) timer = window.setTimeout(beginBeat, seconds * 1000);
    };
    const animate = (now: number) => {
      if (!canAnimate()) return;
      let moving = false;
      windowStates.forEach((state) => {
        if (!state.moving) return;
        const raw = Math.min(Math.max((now - state.startedAt) / (state.duration * 1000), 0), 1);
        const progress = easeOutCubic(raw);
        state.currentRect = interpolateRect(state.fromRect, state.targetRect, progress);
        // Elasticity follows spatial progress, so it settles with the snap.
        const squeeze = Math.sin(progress * Math.PI);
        state.currentRect.width *= 1 - squeeze * 0.012;
        state.currentRect.height *= 1 - squeeze * 0.018;
        setWindowRect(state, state.currentRect);
        state.moving = raw < 1;
        moving ||= state.moving;
      });
      render();
      if (moving) frame = window.requestAnimationFrame(animate);
      else schedule(restAfterMovement);
    };
    function beginBeat() {
      if (!canAnimate()) return;
      let beat = beats[beatIndex++ % beats.length]!;
      while (compact && beat.column !== 0) beat = beats[beatIndex++ % beats.length]!;
      const firstIndex = beat.column * 2;
      const indices = beat.split === undefined ? [firstIndex] : [firstIndex, firstIndex + 1];
      const now = performance.now();
      indices.forEach((index, offset) => {
        const state = windowStates[index]!;
        if (beat.split !== undefined) {
          state.slot.y = offset === 0 ? 0 : beat.split;
          state.slot.height = offset === 0 ? beat.split : 1 - beat.split;
        } else {
          state.inset = beat.inset ?? 0;
        }
        state.fromRect = { ...state.currentRect };
        state.targetRect = resolveRect(state);
        state.startedAt = now + offset * beat.stagger * 1000;
        state.duration = beat.duration;
        state.moving = true;
      });
      restAfterMovement = beat.rest;
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
      schedule(3.2);
    };
    const resume = () => {
      cancel();
      // No catch-up burst after switching tabs or changing motion preferences.
      settle();
      render();
      schedule(3.2);
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
