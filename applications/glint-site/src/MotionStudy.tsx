import { useEffect, useState } from "react";
import { StudyWindows } from "./StudyWindows";
import { motionStudies } from "./motionStudies";

export function MotionStudy({ study }: { study: number }) {
  const [replay, setReplay] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const item = motionStudies[study - 1]!;
  useEffect(() => {
    const title = document.title;
    document.title = `${String(study).padStart(2, "0")} · ${item.name} — Glint`;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => { setReduced(motion.matches); setFinePointer(pointer.matches); };
    update();
    motion.addEventListener("change", update);
    pointer.addEventListener("change", update);
    return () => {
      document.title = title;
      motion.removeEventListener("change", update);
      pointer.removeEventListener("change", update);
    };
  }, [study, item]);
  return <>
    <StudyWindows study={study} key={`${study}-${replay}`} />
    <aside className="motion-study-panel" aria-label="Animation variation">
      <div className="motion-study-title"><span>{String(study).padStart(2, "0")} / 10</span><strong>{item.name}</strong></div>
      <p>{reduced ? "Reduced motion is enabled. Showing the static composition." : !finePointer && [4, 5, 7, 8, 10].includes(study) ? "Use a mouse or trackpad to try this interaction." : item.hint}</p>
      <nav aria-label="Variation controls">
        <a href={`?motion=${study === 1 ? 10 : study - 1}`} aria-label="Previous variation">←</a>
        <button type="button" onClick={() => setReplay((value) => value + 1)}>Replay</button>
        <a href={`?motion=${study === 10 ? 1 : study + 1}`} aria-label="Next variation">→</a>
        <a className="motion-study-original" href="/">Original ↗</a>
      </nav>
    </aside>
  </>;
}
