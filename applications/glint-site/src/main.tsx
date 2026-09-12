import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine } from "lucide-react";
import glintMark from "../../../brand/Glint.icon/Assets/mark.svg?url";
import "./styles.css";

const SpatialWindows = lazy(() =>
  import("./SpatialWindows").then((module) => ({ default: module.SpatialWindows })),
);

const MetalMark = lazy(() => import("./MetalMark").then((module) => ({ default: module.MetalMark })));

const AmbientMesh = lazy(() => import("./AmbientMesh").then((module) => ({ default: module.AmbientMesh })));

function App() {
  const [phase, setPhase] = useState(0);
  const advance = useCallback((next: number) => setPhase((current) => Math.max(current, next)), []);
  useEffect(() => {
    // Content must remain available if the lazy renderer cannot load.
    const fallback = window.setTimeout(() => advance(5), 7000);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) advance(5);
    return () => window.clearTimeout(fallback);
  }, [advance]);
  return (
    <main className={`page ${phase >= 1 ? "background-visible" : ""} ${phase >= 2 ? "logo-visible" : ""} ${phase >= 3 ? "logo-impact" : ""} ${phase >= 4 ? "logo-docked" : ""} ${phase >= 5 ? "content-visible" : ""}`}>
      <Suspense fallback={null}><AmbientMesh active={phase >= 1} /></Suspense>
      <Suspense fallback={null}>
        <SpatialWindows onPhase={advance} />
      </Suspense>
      <div className="hero-blur" aria-hidden="true" />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-mark" aria-hidden="true">
          <div className="impact-ripple" />
          <img className="mark-art" src={glintMark} alt="" />
          <div className="mark-metal">
            <Suspense fallback={null}><MetalMark active={phase >= 2} settled={phase >= 4} /></Suspense>
          </div>
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
