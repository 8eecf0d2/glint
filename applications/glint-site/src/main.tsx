import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine } from "lucide-react";
import glintMarkSource from "../../../brand/Glint.icon/Assets/mark.svg?raw";
import "./styles.css";

const SpatialWindows = lazy(() =>
  import("./SpatialWindows").then((module) => ({ default: module.SpatialWindows })),
);

// Paint the highlight inside the canonical paths, including their individual motion.
const animatedMark = glintMarkSource
  .replace(/<path[\s\S]*?\/>/g, (path) => `<g class="mark-star">${path}${path.replace("<path", '<path fill="url(#mark-shine)"')}</g>`)
  .replace("<title>", `<defs>
    <linearGradient id="mark-shine" gradientUnits="userSpaceOnUse" x1="-1024" y1="0" x2="0" y2="180">
      <stop offset="0.35" stop-color="white" stop-opacity="0" />
      <stop offset="0.5" stop-color="white" stop-opacity="0.9" />
      <stop offset="0.65" stop-color="white" stop-opacity="0" />
      <animate attributeName="x1" from="-1024" to="1024" dur="0.85s" begin="indefinite" fill="freeze" />
      <animate attributeName="x2" from="0" to="2048" dur="0.85s" begin="indefinite" fill="freeze" />
    </linearGradient>
  </defs><title>`);

function App() {
  const [phase, setPhase] = useState(0);
  const markRef = useRef<HTMLDivElement>(null);
  const logoVisible = phase >= 2;
  useEffect(() => {
    if (logoVisible && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markRef.current?.querySelectorAll("animate").forEach((animation) => animation.beginElement());
    }
  }, [logoVisible]);
  const advance = useCallback((next: number) => setPhase((current) => Math.max(current, next)), []);
  useEffect(() => {
    // Content must remain available if the lazy renderer cannot load.
    const fallback = window.setTimeout(() => advance(4), 4500);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) advance(4);
    return () => window.clearTimeout(fallback);
  }, [advance]);
  return (
    <main className={`page ${phase >= 2 ? "logo-visible" : ""} ${phase >= 4 ? "content-visible" : ""}`}>
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
