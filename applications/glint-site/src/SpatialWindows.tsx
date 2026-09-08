import { useEffect, useRef } from "react";
import {
  CircleGeometry,
  Clock,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Shape,
  ShapeGeometry,
  WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";

type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

type WindowShape = {
  group: Group;
  fill: Mesh;
  lights: Mesh[];
  materials: Material[];
};

type WindowState = WindowShape & {
  currentRect: WindowRect;
  fromRect: WindowRect;
  targetRect: WindowRect;
  fromOpacity: number;
  currentOpacity: number;
  targetOpacity: number;
  fromRotation: number;
  targetRotation: number;
  baseOpacity: number;
  transitionStartedAt: number;
  moving: boolean;
};

function createViewportLayouts(viewportWidth: number, viewportHeight: number) {
  const inset = 0.12;
  const gap = 0.11;
  const usableWidth = viewportWidth - inset * 2;
  const usableHeight = viewportHeight - inset * 2;

  const region = (left: number, top: number, width: number, height: number): WindowRect => {
    const leftEdge = -viewportWidth / 2 + inset + left * usableWidth + gap / 2;
    const rightEdge = -viewportWidth / 2 + inset + (left + width) * usableWidth - gap / 2;
    const topEdge = viewportHeight / 2 - inset - top * usableHeight - gap / 2;
    const bottomEdge = viewportHeight / 2 - inset - (top + height) * usableHeight + gap / 2;
    return {
      x: (leftEdge + rightEdge) / 2,
      y: (topEdge + bottomEdge) / 2,
      width: rightEdge - leftEdge,
      height: topEdge - bottomEdge,
      visible: true,
    };
  };

  return [
    [
      region(0, 0, 1 / 3, 1 / 3), region(0, 1 / 3, 1 / 3, 2 / 3), region(1 / 3, 0, 1 / 3, 2 / 3),
      region(1 / 3, 2 / 3, 1 / 3, 1 / 3), region(2 / 3, 0, 1 / 3, 1 / 3), region(2 / 3, 1 / 3, 1 / 3, 2 / 3),
    ],
    [
      region(0, 0, 2 / 3, 1 / 2), region(0, 1 / 2, 1 / 3, 1 / 4), region(1 / 3, 1 / 2, 1 / 3, 1 / 4),
      region(0, 3 / 4, 1 / 3, 1 / 4), region(1 / 3, 3 / 4, 1 / 3, 1 / 4), region(2 / 3, 0, 1 / 3, 1),
    ],
    [
      region(0, 0, 1 / 3, 1), region(1 / 3, 0, 2 / 3, 1 / 3), region(1 / 3, 1 / 3, 1 / 3, 1 / 3),
      region(2 / 3, 1 / 3, 1 / 3, 1 / 3), region(1 / 3, 2 / 3, 1 / 3, 1 / 3), region(2 / 3, 2 / 3, 1 / 3, 1 / 3),
    ],
    [
      region(0, 0, 1 / 3, 1 / 2), region(1 / 3, 0, 1 / 3, 1 / 2), region(2 / 3, 0, 1 / 3, 1 / 2),
      region(0, 1 / 2, 2 / 3, 1 / 2), region(2 / 3, 1 / 2, 1 / 3, 1 / 4), region(2 / 3, 3 / 4, 1 / 3, 1 / 4),
    ],
    [
      region(0, 0, 1 / 2, 1 / 4), region(0, 1 / 4, 1 / 2, 1 / 4), region(1 / 2, 0, 1 / 2, 1 / 2),
      region(0, 1 / 2, 1 / 2, 1 / 2), region(1 / 2, 1 / 2, 1 / 2, 1 / 4), region(1 / 2, 3 / 4, 1 / 2, 1 / 4),
    ],
  ];
}

function createMessyRects(viewportWidth: number, viewportHeight: number): WindowRect[] {
  const bottom = -viewportHeight * 0.34;
  return [
    { x: -viewportWidth * 0.32, y: bottom + 0.2, width: viewportWidth * 0.2, height: viewportHeight * 0.22, visible: true },
    { x: -viewportWidth * 0.2, y: bottom - 0.25, width: viewportWidth * 0.18, height: viewportHeight * 0.19, visible: true },
    { x: -viewportWidth * 0.06, y: bottom + 0.35, width: viewportWidth * 0.22, height: viewportHeight * 0.24, visible: true },
    { x: viewportWidth * 0.1, y: bottom - 0.2, width: viewportWidth * 0.2, height: viewportHeight * 0.2, visible: true },
    { x: viewportWidth * 0.23, y: bottom + 0.25, width: viewportWidth * 0.19, height: viewportHeight * 0.23, visible: true },
    { x: viewportWidth * 0.34, y: bottom - 0.1, width: viewportWidth * 0.17, height: viewportHeight * 0.18, visible: true },
  ];
}

function copyRect(rect: WindowRect): WindowRect {
  return { ...rect };
}

function interpolateRect(from: WindowRect, to: WindowRect, progress: number): WindowRect {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
    visible: to.visible,
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
  windowState.fill.geometry.dispose();
  windowState.fill.geometry = new ShapeGeometry(roundedRectangleShape(rect.width, rect.height, 0.18));
  windowState.lights.forEach((light, lightIndex) => {
    light.position.set(-rect.width / 2 + 0.25 + lightIndex * 0.22, titlebarY + 0.17, 0);
  });
}

function easeOutExpo(value: number) {
  return value === 1 ? 1 : 1 - Math.pow(2, -10 * value);
}

function createSlotAssignments(count: number) {
  const assignments = Array.from({ length: count }, (_, index) => index);
  const swapCount = Math.random() < 0.7 ? 1 : 2;
  for (let swapIndex = 0; swapIndex < swapCount; swapIndex += 1) {
    const first = Math.floor(Math.random() * count);
    const second = (first + 1 + Math.floor(Math.random() * (count - 1))) % count;
    [assignments[first], assignments[second]] = [assignments[second]!, assignments[first]!];
  }
  return assignments;
}

export function SpatialWindows() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new Scene();
    const initialWidth = Math.max(mount.clientWidth, 1);
    const initialHeight = Math.max(mount.clientHeight, 1);
    const viewportHeight = 10;
    let viewportWidth = viewportHeight * (initialWidth / initialHeight);
    const camera = new OrthographicCamera(-viewportWidth / 2, viewportWidth / 2, viewportHeight / 2, -viewportHeight / 2, 0.1, 100);
    camera.position.z = 10;
    let layouts = createViewportLayouts(viewportWidth, viewportHeight);
    let messyRects = createMessyRects(viewportWidth, viewportHeight);
    const openingLayoutChoices = [0, 1, 2, 3, 4];
    const openingLayoutIndex = openingLayoutChoices[Math.floor(Math.random() * openingLayoutChoices.length)]!;
    let layoutIndex = reducedMotion ? openingLayoutIndex : -1;
    let activeAssignments = Array.from({ length: messyRects.length }, (_, index) => index);
    const targetRectFor = (targetLayoutIndex: number, windowIndex: number) => {
      const layout = layouts[targetLayoutIndex]!;
      return layout[activeAssignments[windowIndex]!]!;
    };

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

    const windowStates: WindowState[] = messyRects.map((messyRect, windowIndex) => {
      const windowShape = createWindow();
      const baseOpacity = 1;
      const initialRect = reducedMotion ? targetRectFor(openingLayoutIndex, windowIndex) : messyRect;
      const initialOpacity = reducedMotion && initialRect.visible ? baseOpacity : 0;
      setWindowRect(windowShape, initialRect);
      windowShape.group.rotation.z = reducedMotion ? 0 : (windowIndex % 2 === 0 ? -1 : 1) * (0.08 + windowIndex * 0.02);
      windowShape.materials.forEach((material) => {
        material.opacity = initialOpacity;
      });
      scene.add(windowShape.group);

      return {
        ...windowShape,
        currentRect: copyRect(initialRect),
        fromRect: copyRect(initialRect),
        targetRect: copyRect(initialRect),
        fromOpacity: initialOpacity,
        currentOpacity: initialOpacity,
        targetOpacity: initialOpacity,
        fromRotation: windowShape.group.rotation.z,
        targetRotation: windowShape.group.rotation.z,
        baseOpacity,
        transitionStartedAt: 0,
        moving: false,
      };
    });

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      viewportWidth = viewportHeight * (width / height);
      camera.left = -viewportWidth / 2;
      camera.right = viewportWidth / 2;
      camera.top = viewportHeight / 2;
      camera.bottom = -viewportHeight / 2;
      camera.updateProjectionMatrix();
      layouts = createViewportLayouts(viewportWidth, viewportHeight);
      messyRects = createMessyRects(viewportWidth, viewportHeight);
      windowStates.forEach((windowState, windowIndex) => {
        windowState.group.visible = width >= 620 || windowIndex < 3;
        const rect = layoutIndex >= 0 ? targetRectFor(layoutIndex, windowIndex) : messyRects[windowIndex]!;
        windowState.currentRect = copyRect(rect);
        windowState.fromRect = copyRect(rect);
        windowState.targetRect = copyRect(rect);
        windowState.moving = false;
        setWindowRect(windowState, rect);
        if (layoutIndex >= 0) {
          windowState.currentOpacity = rect.visible ? windowState.baseOpacity : 0;
          windowState.materials.forEach((material) => {
            material.opacity = windowState.currentOpacity;
          });
        }
      });
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const transitionDuration = 0.72;
    const transitionStagger = 0.16;
    const transitionSpan = transitionDuration + transitionStagger * (windowStates.length - 1);
    const holdDuration = 1.8;
    const clock = new Clock();
    let animationFrame = 0;
    let nextLayoutAt = 1.5;

    const beginLayout = (nextLayoutIndex: number, startedAt: number) => {
      const layout = layouts[nextLayoutIndex]!;
      activeAssignments = createSlotAssignments(windowStates.length);
      windowStates.forEach((windowState, windowIndex) => {
        const targetRect = layout[activeAssignments[windowIndex]!]!;
        windowState.fromRect = copyRect(windowState.currentRect);
        windowState.targetRect = copyRect(targetRect);
        windowState.fromOpacity = windowState.currentOpacity;
        windowState.targetOpacity = targetRect.visible ? windowState.baseOpacity : 0;
        windowState.fromRotation = windowState.group.rotation.z;
        windowState.targetRotation = 0;
        windowState.transitionStartedAt = startedAt + windowIndex * transitionStagger;
        windowState.moving = true;
      });
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (!reducedMotion && layoutIndex === -1) {
        windowStates.forEach((windowState, windowIndex) => {
          const fadeProgress = easeOutExpo(Math.min(Math.max((elapsed - windowIndex * 0.08) / 0.42, 0), 1));
          const floatingRect = copyRect(messyRects[windowIndex]!);
          floatingRect.y += Math.sin(elapsed * 1.7 + windowIndex * 0.9) * 0.06;
          windowState.currentRect = floatingRect;
          windowState.currentOpacity = fadeProgress;
          windowState.group.rotation.z = windowState.fromRotation + Math.sin(elapsed * 1.3 + windowIndex) * 0.012;
          setWindowRect(windowState, floatingRect);
          windowState.materials.forEach((material) => {
            material.opacity = fadeProgress;
          });
        });
      }

      if (!reducedMotion && elapsed >= nextLayoutAt) {
        layoutIndex = layoutIndex === -1 ? openingLayoutIndex : (layoutIndex + 1) % layouts.length;
        beginLayout(layoutIndex, elapsed);
        nextLayoutAt = elapsed + transitionSpan + holdDuration;
      }

      if (!reducedMotion) {
        windowStates.forEach((windowState) => {
          if (!windowState.moving || elapsed < windowState.transitionStartedAt) return;
          const rawProgress = Math.min((elapsed - windowState.transitionStartedAt) / transitionDuration, 1);
          const progress = easeOutExpo(rawProgress);
          windowState.currentRect = interpolateRect(windowState.fromRect, windowState.targetRect, progress);
          const squeeze = Math.sin(rawProgress * Math.PI);
          windowState.currentRect.width *= 1 - squeeze * 0.035;
          windowState.currentRect.height *= 1 - squeeze * 0.055;
          windowState.currentOpacity = windowState.fromOpacity + (windowState.targetOpacity - windowState.fromOpacity) * progress;
          windowState.group.rotation.z = windowState.fromRotation + (windowState.targetRotation - windowState.fromRotation) * progress;
          setWindowRect(windowState, windowState.currentRect);
          windowState.materials.forEach((material) => {
            material.opacity = windowState.currentOpacity;
          });
          if (rawProgress === 1) windowState.moving = false;
        });
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      windowStates.forEach((windowState) => {
        windowState.group.traverse((object: Object3D) => {
          if (object instanceof Mesh) object.geometry.dispose();
        });
        windowState.materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="spatial-background" ref={mountRef} aria-hidden="true" />;
}
