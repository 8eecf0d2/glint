import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

export function ButtonMesh({ active }: { active: boolean }) {
  const [canAnimate, setCanAnimate] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanAnimate(!motion.matches && !document.hidden);
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <div className="button-mesh" aria-hidden="true">
    <MeshGradient
      colors={["#171a1f", "#2e3540", "#24212b", "#20282b"]}
      distortion={0.4}
      swirl={0.12}
      grainMixer={0}
      grainOverlay={0}
      speed={active && canAnimate ? 0.12 : 0}
      frame={12000}
      width="100%"
      height="100%"
      minPixelRatio={1}
      maxPixelCount={80000}
    />
  </div>;
}
