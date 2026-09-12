import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine } from "lucide-react";
import glintMarkSource from "../../../brand/Glint.icon/Assets/mark.svg?raw";
import "./styles.css";

const SpatialWindows = lazy(() =>
  import("./SpatialWindows").then((module) => ({ default: module.SpatialWindows })),
);

// Light a bevel derived from the canonical shapes, then clip it to their inner edges.
const animatedMark = glintMarkSource
  .replace(/<path[\s\S]*?\/>/g, (path) => `<g class="mark-star">${path}${path.replace("<path", '<path class="mark-reflection" fill="white" filter="url(#mark-glass)"')}</g>`)
  .replace("<title>", `<defs>
    <filter id="mark-glass" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="bevel" />
      <feSpecularLighting in="bevel" surfaceScale="18" specularConstant="2.2" specularExponent="16" lighting-color="white" result="reflection">
        <fePointLight x="-400" y="-300" z="240">
          <animate attributeName="x" values="-400;400;1300;500;1400" keyTimes="0;0.3;0.48;0.78;1" dur="2.35s" begin="indefinite" fill="freeze" />
          <animate attributeName="y" values="-300;0;700;1100;300" keyTimes="0;0.3;0.48;0.78;1" dur="2.35s" begin="indefinite" fill="freeze" />
        </fePointLight>
      </feSpecularLighting>
      <feMorphology in="SourceAlpha" operator="erode" radius="14" result="interior" />
      <feComposite in="SourceAlpha" in2="interior" operator="out" result="rim" />
      <feComposite in="reflection" in2="rim" operator="in" />
    </filter>
  </defs><title>`);

function App() {
  const [phase, setPhase] = useState(0);
  const markRef = useRef<HTMLDivElement>(null);
  const logoVisible = phase >= 2;
  useEffect(() => {
    if (logoVisible && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const glint = () => markRef.current?.querySelectorAll("animate").forEach((animation) => animation.beginElement());
      const first = window.setTimeout(glint, 170);
      return () => window.clearTimeout(first);
    }
  }, [logoVisible]);
  const advance = useCallback((next: number) => setPhase((current) => Math.max(current, next)), []);
  useEffect(() => {
    // Content must remain available if the lazy renderer cannot load.
    const fallback = window.setTimeout(() => advance(5), 7000);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) advance(5);
    return () => window.clearTimeout(fallback);
  }, [advance]);
  return (
    <main className={`page ${phase >= 2 ? "logo-visible" : ""} ${phase >= 4 ? "logo-docked" : ""} ${phase >= 5 ? "content-visible" : ""}`}>
      <Suspense fallback={null}>
        <SpatialWindows onPhase={advance} />
      </Suspense>
      <div className="hero-blur" aria-hidden="true" />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-mark" aria-hidden="true">
          <div className="mark-art" ref={markRef} dangerouslySetInnerHTML={{ __html: animatedMark }} />
        </div>
        <h1 id="hero-title">Make some room.</h1>
        <p className="subtitle">
          Glint moves and resizes windows with keyboard shortcuts, so there’s room for your terminal, agent, browser and whatever else you’ve got open.
        </p>

        <div className="actions">
          <a className="download" href="https://github.com/8eecf0d2/glint/releases">
            <span>Download Glint</span>
            <ArrowDownToLine size={18} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>

      </section>

      <footer>
        <span>Inspired by <a href="https://github.com/eczarny/spectacle">Spectacle</a></span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
