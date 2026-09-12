export const motionStudies = [
  { name: "Soft springs", hint: "Watch the windows compress and settle into place.", idea: "A tactile landing, with weight and a soft rebound." },
  { name: "Snap foresight", hint: "Watch for the outlined destination before each move.", idea: "Anticipation makes the choreography easier to read." },
  { name: "Motion echoes", hint: "Watch the faint silhouettes left behind moving windows.", idea: "A brief visual memory of where each window came from." },
  { name: "Cursor wake", hint: "Sweep your mouse across the background windows.", idea: "Windows gently compress as your cursor passes over them." },
  { name: "Hold that thought", hint: "Hover over a background window to hold the scene. Move away to resume.", idea: "The animation gives you time to inspect it." },
  { name: "Tap wave", hint: "Click the background to send a soft wave through the windows.", idea: "A small, playful response to a deliberate gesture." },
  { name: "Live dividers", hint: "Move across the background to choose how the space is divided.", idea: "Your pointer controls real window proportions, with shared edges." },
  { name: "Edge tracing", hint: "Hover near a window and watch its outline draw itself.", idea: "A precise, restrained acknowledgement of your presence." },
  { name: "Quiet choreography", hint: "Watch the slower sequence: divide, expand, balance, reset.", idea: "More intention and breathing room in the existing motion." },
  { name: "Reveal lens", hint: "Move over the blurred background to uncover the windows underneath.", idea: "A local clearing in the existing blur; nothing shifts or changes color." },
  { name: "Cursor-connected", hint: "Move left and right. The divider follows your exact position, within minimum window sizes.", idea: "Continuous shared resizing without percentage steps or waiting for a beat." },
  { name: "Traveling sheen", hint: "Move near a window. A tapered glint travels around its edge.", idea: "A moving reflection with a bright head and fading tail, not a full border." },
  { name: "Living seams", hint: "Move in both directions. Widths and heights follow you while a sheen runs along nearby edges.", idea: "Continuous two-axis resizing paired with an edge reflection." },
] as const;

export function studyFromSearch(search: string): number {
  const value = new URLSearchParams(search).get("motion");
  return value && /^(?:[1-9]|1[0-3])$/.test(value) ? Number(value) : 0;
}
