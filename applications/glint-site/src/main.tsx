import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import glintMark from "../../../brand/Glint.icon/Assets/mark.svg?url";
import "./styles.css";

const SpatialWindows = lazy(() =>
  import("./SpatialWindows").then((module) => ({ default: module.SpatialWindows })),
);

const downloadURL = import.meta.env.VITE_GLINT_DOWNLOAD_URL as string | undefined;

function App() {
  return (
    <main className="page">
      <Suspense fallback={null}>
        <SpatialWindows />
      </Suspense>
      <div className="hero-blur" aria-hidden="true" />
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-mark" src={glintMark} alt="" />
        <h1 id="hero-title">Put that window over there.</h1>
        <p className="subtitle">
          A small window manager for macOS. Keyboard shortcuts for moving things around until your desktop feels right.
        </p>

        <div className="actions">
          {downloadURL ? (
            <a className="download" href={downloadURL}>Download Glint</a>
          ) : (
            <button className="download" type="button" disabled>Download coming soon</button>
          )}
          <a className="source" href="https://github.com/8eecf0d2/glint">View on GitHub</a>
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
