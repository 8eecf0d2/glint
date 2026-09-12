import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

export function AmbientMesh({ active }: { active: boolean }) {
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
  return <div className="ambient-mesh" aria-hidden="true">
    <MeshGradient
      colors={["#e4e9f0", "#e9e4ed", "#efe8df", "#ffffff"]}
      distortion={0.4}
      swirl={0.12}
      grainMixer={0}
      grainOverlay={0}
      speed={active && canAnimate ? 0.08 : 0}
      frame={12000}
      width="100%"
      height="100%"
      minPixelRatio={1}
      maxPixelCount={350000}
    />
  </div>;
}
