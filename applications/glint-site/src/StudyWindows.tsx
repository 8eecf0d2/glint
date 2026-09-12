import { useEffect, useRef } from "react";
import {
  BufferGeometry, CircleGeometry, Group, Line, LineBasicMaterial, LineDashedMaterial, Mesh, MeshBasicMaterial, OrthographicCamera, RingGeometry, Vector3,
  Scene, Shape, ShapeGeometry, WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";
import { initialLayout, planRelocation, regions } from "./windowLayout";
import type { Divider, LayoutRect, Placement } from "./windowLayout";
import { createRoundedWindowGeometry, updateRoundedWindowGeometry } from "./roundedWindowGeometry";
import { createEdgeSheen } from "./edgeSheen";
import { initialLooseLayout, looseWindowCells, followLooseLayout } from "./localWindowLayout";

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
  if (size.width !== rect.width || size.height !== rect.height || size.lastRadius !== size.cornerRadius) {
    if (size.stableRounded) {
      updateRoundedWindowGeometry(windowState.fill.geometry, rect.width, rect.height, size.cornerRadius);
    } else {
      windowState.fill.geometry.dispose();
      windowState.fill.geometry = new ShapeGeometry(roundedRectangleShape(rect.width, rect.height, 0.18));
    }
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

export function StudyWindows({ study }: { study: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const continuous = study === 11;
    const windowCount = study === 13 ? 5 : 6;
    const pointerPreference = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointer = { x: 0, y: 0, active: false, hovered: -1, changedAt: 0 };
    const wakeAt = Array(windowCount).fill(-10000) as number[];
    const traces = Array(windowCount).fill(0) as number[];
    let seed = 271828;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const looseLayout = initialLooseLayout(random);
    let localBand = 0;
    const initialSlots = [0, 1, 5, 8, 10];
    let clock = 0;
    let lastTime = 0;
    let nextBeatAt = Infinity;
    let lastPointerBeat = -1000;
    let realTime = 0;
    const blur = document.querySelector<HTMLElement>(".hero-blur");
    const scene = new Scene();
    const viewportHeight = 10;
    let viewportWidth = viewportHeight;
    let viewportPixelHeight = Math.max(mount.clientHeight, 1);
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
    const scatter = Array.from({ length: windowCount }, (_, index) => ({
      x: study === 13 ? 0.3 + random() * 0.4 : 0.24 + (index % 3) * 0.25 + (random() - 0.5) * 0.12,
      y: study === 13 ? 0.34 + random() * 0.32 : 0.32 + Math.floor(index / 3) * 0.3 + (random() - 0.5) * 0.16,
      width: (study === 13 ? 0.18 : 0.29) + random() * 0.17,
      height: 0.32 + random() * 0.2,
    }));
    let introPending = !motionPreference.matches && !continuous;
    const layout = initialLayout();
    const windowStates: WindowState[] = Array.from({ length: windowCount }, (_, index) => {
      const shape = createWindow();
      if (study === 13) {
        shape.fill.geometry.dispose();
        shape.fill.geometry = createRoundedWindowGeometry();
        shape.fill.userData.stableRounded = true;
        shape.fill.userData.cornerRadius = 0.18;
      }
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      shape.materials.forEach((material) => { material.opacity = 1; });
      shape.group.position.z = index * 0.03;
      scene.add(shape.group);
      return { ...shape, id: index, active: study === 13 || [0, 1, 2, 4].includes(index), slot: study === 13 ? initialSlots[index]! : index,
        phase: "move", fromRotation: 0, currentRect: rect, fromRect: rect, targetRect: rect,
        startedAt: 0, duration: 0.4, moving: false };
    });
    const visibleStates = () => windowStates.filter((state) => state.active && (!compact || state.id < 2));
    const occupied = (): Placement[] => visibleStates().map(({ id, slot }) => ({ id, slot }));
    const cells = () => study === 13 && !compact ? looseWindowCells(looseLayout)
      : regions(layout, compact, Math.min(0.2, 1.1 / viewportWidth), 0.2, !continuous);
    const cellRect = (state: WindowState): WindowRect => {
      const slot = cells()[state.slot] ?? cells()[0]!;
      const outerInset = 0.22;
      const gap = study === 13 ? 10 * viewportHeight / viewportPixelHeight : 0.18;
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

    const resolveRect = (state: WindowState): WindowRect => {
      const rect = cellRect(state);
      return rect;
    };

    let frame = 0;

    let beatIndex = 0;
    const pending: (() => void)[] = [];
    let wasCompact = false;
    let restAfterMovement = 0.85;
    let disposed = false;
    const canAnimate = () => !disposed && !motionPreference.matches && !document.hidden;
    // Study effects live outside the production renderer and never affect layout ownership.
    const outlines = [2, 5, 8].includes(study) ? windowStates.map(() => {
      const material = study === 2
        ? new LineDashedMaterial({ color: 0xa9a9a9, transparent: true, opacity: 0, dashSize: 0.09, gapSize: 0.065, depthTest: false })
        : new LineBasicMaterial({ color: 0xb1b1b1, transparent: true, opacity: 0, depthTest: false });
      const line = new Line(new BufferGeometry(), material);
      line.position.z = 2;
      scene.add(line);
      return line;
    }) : [];
    const sheens = study === 12 ? windowStates.map(() => {
      const sheen = createEdgeSheen();
      scene.add(sheen.mesh);
      return sheen;
    }) : [];
    const sheenStrength = Array(windowCount).fill(0) as number[];
    let renderAt = performance.now();
    const echoHistory: { time: number; rect: WindowRect }[][] = windowStates.map(() => []);
    const echoes = study === 3 ? windowStates.map(() => [0, 1].map(() => {
      const echo = createWindow();
      echo.lights.forEach((light) => { light.visible = false; });
      (echo.fill.material as MeshBasicMaterial).color.setHex(0xc9c9c9);
      echo.group.position.z = -0.3;
      scene.add(echo.group);
      return echo;
    })) : [];
    const ringMaterial = new MeshBasicMaterial({ color: 0xc9c9c9, transparent: true, opacity: 0, depthTest: false });
    const ring = new Mesh(new RingGeometry(0.989, 1, 96), ringMaterial);
    ring.position.z = 2;
    ring.visible = false;
    scene.add(ring);
    let ripple: { x: number; y: number; at: number } | null = null;
    const setOutline = (line: Line, rect: WindowRect) => {
      if (line.userData.width !== rect.width || line.userData.height !== rect.height) {
        const points = roundedRectangleShape(rect.width, rect.height, 0.18).getPoints(14);
        line.geometry.dispose();
        line.geometry = new BufferGeometry().setFromPoints(points.map((point) => new Vector3(point.x, point.y, 0)));
        if (study === 2) line.computeLineDistances();
        line.userData.width = rect.width;
        line.userData.height = rect.height;
      }
      line.position.x = rect.x;
      line.position.y = rect.y;
    };
    const render = () => {
      const renderNow = performance.now();
      const response = 1 - Math.exp(-Math.min(0.05, (renderNow - renderAt) / 1000) * 12);
      renderAt = renderNow;
      const animated = !motionPreference.matches;
      windowStates.forEach((state, index) => {
        if (animated && state.phase === "move") {
          let scale = 1;
          if (study === 1 && state.moving) {
            const progress = Math.max(0, Math.min(1, (clock - state.startedAt) / (state.duration * 1000)));
            scale -= Math.sin(progress * Math.PI) ** 2 * 0.055;
            scale -= Math.sin(progress * Math.PI * 3) ** 2 * (1 - progress) * 0.012;
          }
          if (study === 4) {
            const age = (realTime - wakeAt[index]!) / 1000;
            if (age >= 0 && age < 0.65) scale -= Math.sin(age / 0.65 * Math.PI) ** 2 * 0.055;
          }
          if (study === 6 && ripple) {
            const distance = Math.hypot(state.currentRect.x - ripple.x, state.currentRect.y - ripple.y);
            const age = (clock - ripple.at) / 1000 - distance / 13;
            if (age >= 0 && age < 0.42) scale -= Math.sin(age / 0.42 * Math.PI) ** 2 * 0.065;
          }
          state.group.scale.setScalar(scale);
        }
        const sheen = sheens[index];
        if (sheen) {
          const rect = state.currentRect;
          const dx = Math.max(Math.abs(pointer.x - rect.x) - rect.width / 2, 0);
          const dy = Math.max(Math.abs(pointer.y - rect.y) - rect.height / 2, 0);
          const target = pointer.active && animated && state.group.visible ? Math.exp(-(dx * dx + dy * dy) / 2.2) : 0;
          sheenStrength[index] = animated ? sheenStrength[index]! + (target - sheenStrength[index]!) * response : 0;
          sheen.mesh.visible = state.group.visible && sheenStrength[index]! > 0.002;
          sheen.mesh.position.x = rect.x;
          sheen.mesh.position.y = rect.y;
          sheen.mesh.scale.set(rect.width + 0.12, rect.height + 0.12, 1);
          sheen.material.uniforms.size!.value.set(rect.width, rect.height);
          sheen.material.uniforms.light!.value.lerp({ x: pointer.x - rect.x, y: pointer.y - rect.y }, response);
          sheen.material.uniforms.strength!.value = sheenStrength[index];
        }
        const line = outlines[index];
        if (line) {
          setOutline(line, study === 2 && state.moving ? state.targetRect : state.currentRect);
          line.visible = animated && state.group.visible;
          const material = line.material as LineBasicMaterial;
          if (study === 2) material.opacity = state.moving ? 0.65 * (1 - Math.max(0, Math.min(1, (clock - state.startedAt) / (state.duration * 1000)))) : 0;
          if (study === 5) material.opacity = pointer.hovered === index && pointer.active && !introPending ? 0.65 : 0;
          if (study === 8) {
            const dx = Math.max(Math.abs(pointer.x - state.currentRect.x) - state.currentRect.width / 2, 0);
            const dy = Math.max(Math.abs(pointer.y - state.currentRect.y) - state.currentRect.height / 2, 0);
            const target = pointer.active ? Math.exp(-(dx * dx + dy * dy) / 0.9) : 0;
            traces[index] = traces[index]! + (target - traces[index]!) * 0.1;
            material.opacity = traces[index]! * 0.8;
            line.geometry.setDrawRange(0, Math.floor(line.geometry.getAttribute("position").count * traces[index]!));
          }
        }
        if (study === 3) {
          const history = echoHistory[index]!;
          history.push({ time: clock, rect: { ...state.currentRect } });
          while (history.length > 1 && history[0]!.time < clock - 400) history.shift();
          echoes[index]!.forEach((echo, echoIndex) => {
            const previous = history.find((entry) => entry.time >= clock - (echoIndex + 1) * 95) ?? history[0]!;
            const distance = Math.abs(previous.rect.x - state.currentRect.x) + Math.abs(previous.rect.y - state.currentRect.y)
              + Math.abs(previous.rect.width - state.currentRect.width) + Math.abs(previous.rect.height - state.currentRect.height);
            echo.group.visible = animated && state.group.visible && distance > 0.025;
            echo.materials.forEach((material) => { material.opacity = (echoIndex === 0 ? 0.19 : 0.10) * Math.min(1, distance * 2); });
            setWindowRect(echo, previous.rect);
          });
        }
      });
      if (study === 6 && ripple && animated) {
        const age = (clock - ripple.at) / 1000;
        ring.visible = age < 1.3;
        ring.position.x = ripple.x;
        ring.position.y = ripple.y;
        ring.scale.setScalar(Math.max(0.001, age * 13));
        ringMaterial.opacity = Math.max(0, 0.35 * (1 - age / 1.3));
      }
      renderer.render(scene, camera);
    };
    const cancel = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      nextBeatAt = Infinity;
    };
    const settle = () => {
      pending.length = 0;
      // Re-establish unique ownership when switching between two and six cells.
      if (wasCompact !== compact) {
        windowStates.forEach((state) => {
          state.slot = study === 13 && !compact ? initialSlots[state.id]! : state.id;
          state.active = study === 13 || [0, 1, 2, 4].includes(state.id);
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
      if (canAnimate()) nextBeatAt = clock + seconds * 1000;
    };
    const animate = (timestamp: number) => {
      if (!canAnimate()) return;
      realTime = timestamp;
      const elapsed = lastTime ? Math.min(timestamp - lastTime, 50) : 16;
      lastTime = timestamp;
      const held = study === 5 && pointer.active && pointer.hovered >= 0 && !introPending;
      if (!held) clock += elapsed;
      const now = clock;
      if (continuous) {
        // Pointer coordinates map directly into the same inset used by resolveRect.
        // Clamp only at size limits. A short frame-rate-independent response keeps
        // cursor attachment tight; every neighbor is recomputed from one partition.
        if (pointer.active) {
          const minWidth = Math.min(0.2, 1.1 / viewportWidth);
          const x = Math.max(minWidth, Math.min(1 - minWidth,
            (pointer.x + viewportWidth / 2 - 0.22) / (viewportWidth - 0.44)));
          const y = Math.max(0.2, Math.min(compact ? 0.8 : 0.6,
            (viewportHeight / 2 - 0.22 - pointer.y) / (viewportHeight - 0.13)));
          const follow = 1 - Math.exp(-elapsed / 1000 * 32);
          layout.top += (x - layout.top) * follow;
          layout.bottom += (x - layout.bottom) * follow;
          if (compact) layout.rows += (y - layout.rows) * follow;
        }
        visibleStates().forEach((state) => {
          state.currentRect = resolveRect(state);
          setWindowRect(state, state.currentRect);
        });
        render();
        frame = window.requestAnimationFrame(animate);
        return;
      }
      if (now >= nextBeatAt) {
        nextBeatAt = Infinity;
        if (introPending) beginOpening();
        else if (pending.length) pending.shift()!();
        else beginBeat();
      }
      if (study === 7 && pointer.active && !introPending && !pending.length
        && now - lastPointerBeat > 180 && !windowStates.some((state) => state.moving)) {
        lastPointerBeat = now;
        const divider = compact ? "rows" : pointer.y > viewportHeight / 2 - layout.rows * viewportHeight ? "top" : "bottom";
        const position = compact ? 0.5 - pointer.y / viewportHeight : pointer.x / viewportWidth + 0.5;
        const ratio = Math.max(0.25, Math.min(0.75, Math.round(position * 4) / 4));
        if (Math.abs(layout[divider] - ratio) > 0.01) resizeBoundary(divider, ratio);
        nextBeatAt = now + 1800;
      }
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
      if (study === 13 && pointer.active) {
        const x = (pointer.x + viewportWidth / 2 - 0.22) / (viewportWidth - 0.44);
        const y = (viewportHeight / 2 - 0.22 - pointer.y) / (viewportHeight - 0.22 + 5 * viewportHeight / viewportPixelHeight);
        const follow = 1 - Math.exp(-elapsed / 1000 * 26);
        if (compact) layout.rows += (Math.max(0.2, Math.min(0.8, y)) - layout.rows) * follow;
        else followLooseLayout(looseLayout, x, y, localBand, follow);
      }
      const hadMovement = windowStates.some((state) => state.moving);
      let moving = false;
      windowStates.forEach((state) => {
        if (!state.moving) return;
        // A moving window follows the live destination, including its dimensions.
        // Cursor resizing remains active while it travels and it arrives full-size.
        if (study === 13) state.targetRect = resolveRect(state);
        const raw = Math.min(Math.max((now - state.startedAt) / (state.duration * 1000), 0), 1);
        const progress = state.phase === "close" ? raw * raw : study === 1 ? 1 - (1 + 8 * raw) * Math.exp(-8 * raw) + raw * 9 * Math.exp(-8) : study === 9 ? raw * raw * (3 - 2 * raw) : easeOutCubic(raw);
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
      if (study === 13) visibleStates().forEach((state) => {
        if (!state.moving) {
          state.currentRect = resolveRect(state);
          setWindowRect(state, state.currentRect);
        }
      });
      render();
      if (hadMovement && !moving) schedule(pending.length ? 0.1 : restAfterMovement);
      frame = window.requestAnimationFrame(animate);
    };
    function beginOpening() {
      if (!canAnimate()) return;
      introPending = false;
      const now = clock;
      windowStates.forEach((state, index) => {
        if (!state.group.visible) return;
        state.fromRect = { ...state.currentRect };
        state.fromRotation = state.group.rotation.z;
        state.targetRect = resolveRect(state);
        state.startedAt = now + (Math.floor(index / 2) * 0.38 + (index % 2) * 0.14) * 1000;
        state.duration = 0.58;
        state.moving = true;
      });
      restAfterMovement = study === 9 ? 2.2 : 0.7;
    }

    function transition(states: WindowState[], duration = 0.48, targets?: WindowRect[]) {
      const now = clock;
      states.forEach((state, index) => {
        state.fromRect = { ...state.currentRect };
        state.targetRect = targets?.[index] ?? resolveRect(state);
        state.fromRotation = 0;
        state.startedAt = now + (study === 2 ? 220 : 0);
        state.duration = duration * (study === 1 ? 1.6 : study === 2 ? 1.3 : study === 9 ? 2 : 1);
        state.moving = true;
      });
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
      if (study === 13) {
        pending.push(() => {
          placements.forEach(({ slot }, index) => {
            movers[index]!.slot = slot;
            movers[index]!.group.position.z = 1 + index * 0.03;
          });
          // Translation and resizing use the same transition; no fit/grow phases.
          transition(movers, 0.58);
        });
        return;
      }
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
      const capacity = compact ? 2 : study === 13 ? 12 : 6;
      const vacancies = Array.from({ length: capacity }, (_, i) => i)
        .filter((slot) => !owners.some((owner) => owner.slot === slot));
      if (!vacancies.length) return false;
      const candidates = study === 13 ? owners.filter((owner) => owner.id !== pointer.hovered) : owners;
      if (!candidates.length) return false;
      const source = candidates[Math.floor(random() * candidates.length)]!;
      const neighbors = owners.filter((owner) => owner.id !== source.id);
      const target = study !== 13 && neighbors.length && random() < 0.65
        ? neighbors[Math.floor(random() * neighbors.length)]!.slot
        : vacancies[Math.floor(random() * vacancies.length)]!;
      const stages = planRelocation(owners, source.id, target, capacity);
      stages.forEach((stage) => queueTravel(stage));
      // Two independent moves may share a travel phase when there is room.
      if (study !== 13 && stages.length === 1 && vacancies.length > 1 && neighbors.length && random() < 0.6) {
        pending.length = 0;
        const companion = neighbors[Math.floor(random() * neighbors.length)]!;
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
      const capacity = compact ? 2 : study === 13 ? 12 : 6;
      const vacancies = Array.from({ length: capacity }, (_, i) => i)
        .filter((slot) => !active.some((state) => state.slot === slot));
      const closed = eligible.filter((state) => !state.active);
      const shouldOpen = active.length <= (compact ? 1 : 3)
        || (active.length < (compact ? 2 : 5) && random() < 0.55);
      const choices = shouldOpen ? closed : active;
      if (!choices.length || (shouldOpen && !vacancies.length)) return false;
      const state = choices[Math.floor(random() * choices.length)]!;
      state.active = shouldOpen;
      state.phase = shouldOpen ? "spawn" : "close";
      state.group.visible = true;
      if (shouldOpen) {
        state.slot = vacancies[Math.floor(random() * vacancies.length)]!;
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
      restAfterMovement = 0.38 + random() * 0.42;
      const beat = beatIndex++;
      if (study === 13) {
        restAfterMovement = 1.0 + random() * 0.9;
        if (!beginRelocation()) schedule(1.0);
        return;
      }
      if (study === 9) {
        restAfterMovement = 2.4;
        const sequence: [Divider, number][] = compact
          ? [["rows", 0.6], ["rows", 0.4], ["rows", 0.8], ["rows", 0.4]]
          : [["top", 0.75], ["bottom", 0.25], ["rows", 0.6], ["top", 0.5], ["bottom", 0.5], ["rows", 0.4]];
        const [divider, ratio] = sequence[beat % sequence.length]!;
        resizeBoundary(divider, ratio);
        return;
      }
      if (study === 7 && pointer.active) { schedule(0.4); return; }
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
      const choice = choices[Math.floor(random() * choices.length)];
      if (choice) resizeBoundary(choice.divider, choice.ratio);
      else schedule(0.4);
    }

    const resetPointer = () => {
      pointer.active = false;
      pointer.hovered = -1;
      blur?.style.removeProperty("--lens-x");
      blur?.style.removeProperty("--lens-y");
    };
    const acceptsPointer = (event: PointerEvent) => {
      const target = event.target;
      return canAnimate() && event.pointerType === "mouse" && pointerPreference.matches
        && !(target instanceof Element && target.closest(continuous || study === 13 ? ".motion-study-panel, footer" : ".hero, .motion-study-panel, footer"));
    };
    const movePointer = (event: PointerEvent) => {
      if (!acceptsPointer(event)) { resetPointer(); return; }
      const bounds = mount.getBoundingClientRect();
      if (event.clientY < bounds.top || event.clientY > bounds.bottom) { resetPointer(); return; }
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * viewportWidth;
      pointer.y = (0.5 - (event.clientY - bounds.top) / bounds.height) * viewportHeight;
      pointer.active = true;
      if (study === 13 && !compact) {
        const zone = pointer.x < 0 ? 0 : 1;
        const y = (viewportHeight / 2 - 0.22 - pointer.y) / (viewportHeight - 0.22 + 5 * viewportHeight / viewportPixelHeight);
        const cuts = looseLayout.rows[zone]!;
        if (Math.min(Math.abs(y - cuts[0]!), Math.abs(y - cuts[1]!)) > 0.02) {
          localBand = y < cuts[0]! ? 0 : y < cuts[1]! ? 1 : 2;
        }
      }
      const hovered = visibleStates().find((state) => {
        const rect = study === 13 ? cellRect(state) : state.currentRect;
        return Math.abs(rect.x - pointer.x) < rect.width / 2 && Math.abs(rect.y - pointer.y) < rect.height / 2;
      })?.id ?? -1;
      if (hovered !== pointer.hovered) {
        pointer.hovered = hovered;
        pointer.changedAt = clock;
        if (hovered >= 0) wakeAt[hovered] = performance.now();
      }
      if (study === 10 && blur) {
        const blurBounds = blur.getBoundingClientRect();
        blur.style.setProperty("--lens-x", `${event.clientX - blurBounds.left}px`);
        blur.style.setProperty("--lens-y", `${event.clientY - blurBounds.top}px`);
      }
    };
    const clickPointer = (event: PointerEvent) => {
      if (study !== 6 || !canAnimate() || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest(".hero, .motion-study-panel, footer")) return;
      const bounds = mount.getBoundingClientRect();
      if (event.clientY > bounds.bottom) return;
      ripple = { x: ((event.clientX - bounds.left) / bounds.width - 0.5) * viewportWidth,
        y: (0.5 - (event.clientY - bounds.top) / bounds.height) * viewportHeight, at: clock };
    };
    const resize = () => {
      cancel();
      resetPointer();
      echoHistory.forEach((history) => { history.length = 0; });
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      viewportPixelHeight = height;
      compact = width < 620;
      viewportWidth = viewportHeight * width / height;
      renderer.setSize(width, height, false);
      if (study === 13) windowStates.forEach((state) => { state.fill.userData.cornerRadius = 12 * viewportHeight / height; });
      camera.left = -viewportWidth / 2;
      camera.right = viewportWidth / 2;
      camera.updateProjectionMatrix();
      windowStates.forEach((state, index) => { state.group.visible = !compact || index < 2; });
      settle();
      render();
      schedule(introPending ? 1.45 : 0.85);
      lastTime = 0;
      if (canAnimate()) frame = window.requestAnimationFrame(animate);
    };
    const resume = () => {
      cancel();
      resetPointer();
      ripple = null;
      ring.visible = false;
      traces.fill(0);
      echoHistory.forEach((history) => { history.length = 0; });
      // Reduced motion shows the settled desktop, without playing the entrance.
      if (motionPreference.matches) introPending = false;
      // No catch-up burst after switching tabs or changing motion preferences.
      settle();
      render();
      schedule(introPending ? 1.45 : 0.85);
      lastTime = 0;
      if (canAnimate()) frame = window.requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("pointerdown", clickPointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    document.documentElement.addEventListener("pointerleave", resetPointer);
    pointerPreference.addEventListener("change", resume);
    motionPreference.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    resize();

    return () => {
      disposed = true;
      cancel();
      observer.disconnect();
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("pointerdown", clickPointer);
      window.removeEventListener("blur", resetPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      pointerPreference.removeEventListener("change", resume);
      resetPointer();
      sheens.forEach(({ mesh, material }) => { mesh.geometry.dispose(); material.dispose(); });
      outlines.forEach((line) => { line.geometry.dispose(); (line.material as LineBasicMaterial).dispose(); });
      ring.geometry.dispose();
      ringMaterial.dispose();
      echoes.flat().forEach((echo) => {
        const geometries = new Set<ShapeGeometry | CircleGeometry>();
        echo.group.traverse((object: Object3D) => { if (object instanceof Mesh) geometries.add(object.geometry); });
        geometries.forEach((geometry) => geometry.dispose());
        echo.materials.forEach((material) => material.dispose());
      });
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
  }, [study]);

  return <div className="spatial-background" ref={mountRef} aria-hidden="true" />;
}
