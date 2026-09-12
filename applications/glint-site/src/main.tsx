import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine } from "lucide-react";
import glintMark from "../../../brand/Glint.icon/Assets/mark.svg?url";
import "./styles.css";
import { studyFromSearch } from "./motionStudies";

const SpatialWindows = lazy(() =>
  import("./SpatialWindows").then((module) => ({ default: module.SpatialWindows })),
);

const study = import.meta.env.DEV ? studyFromSearch(window.location.search) : 0;
const MotionStudy = lazy(() => import("./MotionStudy").then((module) => ({ default: module.MotionStudy })));

function App() {
  return (
    <main className="page" data-motion={study || undefined}>
      <Suspense fallback={null}>
        <>{study ? <MotionStudy study={study} /> : <SpatialWindows />}</>
      </Suspense>
      <div className="hero-blur" aria-hidden="true" />
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-mark" src={glintMark} alt="" />
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
