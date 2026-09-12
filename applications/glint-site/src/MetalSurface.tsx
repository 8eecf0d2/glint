import { useEffect, useState, type RefObject } from "react";
import { LiquidMetal } from "@paper-design/shaders-react";

type Props = { hostRef: RefObject<HTMLElement | null>; kind: "text" | "pill"; active: boolean };

export function MetalSurface({ hostRef, kind, active }: Props) {
  const [mask, setMask] = useState("");
  const [canAnimate, setCanAnimate] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setCanAnimate(!motion.matches && !document.hidden);
    const paint = () => {
      if (disposed) return;
      const bounds = host.getBoundingClientRect();
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * 2);
      canvas.height = Math.ceil(height * 2);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.fillStyle = "#000";
      if (kind === "pill") {
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, height / 2);
        ctx.fill();
      } else {
        const label = host.querySelector("[data-metal-text]");
        const node = label?.firstChild;
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        const style = getComputedStyle(host);
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
        ctx.textBaseline = "alphabetic";
        const ascent = ctx.measureText("Hg").fontBoundingBoxAscent;
        const lines: { text: string; x: number; y: number }[] = [];
        // Use the actual DOM line breaks and positions, including responsive wrapping.
        const range = document.createRange();
        const text = node.textContent ?? "";
        for (let i = 0; i < text.length; i += 1) {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          const previous = lines.at(-1);
          if (previous && Math.abs(previous.y - (rect.top - bounds.top)) < 1) previous.text += text[i];
          else lines.push({ text: text[i]!, x: rect.left - bounds.left, y: rect.top - bounds.top });
        }
        lines.forEach((line) => ctx.fillText(line.text, line.x, line.y + ascent));
      }
      setMask(canvas.toDataURL("image/png"));
    };
    const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(paint); };
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    document.fonts.ready.then(schedule);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateMotion);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateMotion);
    };
  }, [hostRef, kind]);
  return <span className={`surface-metal surface-metal-${kind}`} aria-hidden="true">
    {mask && <LiquidMetal
      image={mask} colorBack="#00000000" colorTint="#ffffff"
      repetition={2} softness={0.18} shiftRed={0} shiftBlue={0}
      distortion={0.07} contour={0.4} angle={70}
      speed={active && canAnimate ? 0.18 : 0} frame={800}
      scale={1} fit="contain" width="100%" height="100%"
      minPixelRatio={1.5} maxPixelCount={250000}
    />}
  </span>;
}
