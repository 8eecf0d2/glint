import { useEffect, useState } from "react";
import { LiquidMetal } from "@paper-design/shaders-react";
import glintMark from "../../../brand/Glint.icon/Assets/mark.svg?url";

// Paper's original liquid-metal shader, with restrained monochrome settings.
// https://shaders.paper.design/liquid-metal
export function MetalMark({ active }: { active: boolean }) {
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
  return <LiquidMetal
    image={glintMark}
    colorBack="#00000000"
    colorTint="#ffffff"
    repetition={2}
    softness={0.12}
    shiftRed={0}
    shiftBlue={0}
    distortion={0.07}
    contour={0.4}
    angle={70}
    speed={active && canAnimate ? 0.6 : 0}
    frame={800}
    scale={1}
    fit="contain"
    width="100%"
    height="100%"
    minPixelRatio={2}
    maxPixelCount={160000}
    aria-hidden="true"
  />;
}
