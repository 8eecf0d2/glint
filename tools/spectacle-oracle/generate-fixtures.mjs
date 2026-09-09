#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const expectedCommit = "eacf5bb6499257c83e03f51660f38106af8ee914";
const referenceRoot = process.env.SPECTACLE_REFERENCE ?? "/tmp/glint-spectacle-reference";
const calculationsRoot = path.join(referenceRoot, "Spectacle/Resources/Window Position Calculations");

if (!fs.existsSync(calculationsRoot)) {
  throw new Error(`Spectacle reference checkout not found at ${referenceRoot}`);
}

const actualCommit = execFileSync("git", ["-C", referenceRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (actualCommit !== expectedCommit) {
  throw new Error(`Expected Spectacle ${expectedCommit}, found ${actualCommit}`);
}
const trackedChanges = execFileSync("git", ["-C", referenceRoot, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim();
if (trackedChanges) {
  throw new Error(`Spectacle reference checkout has tracked modifications:\n${trackedChanges}`);
}

const registry = new Map();
const context = vm.createContext({
  Math,
  CGRectContainsRect: (outer, inner) =>
    inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height,
  CGRectGetMidX: (rect) => rect.x + rect.width / 2,
  CGRectGetMidY: (rect) => rect.y + rect.height / 2,
  CGRectGetMaxX: (rect) => rect.x + rect.width,
  CGRectGetMaxY: (rect) => rect.y + rect.height,
  windowPositionCalculationRegistry: {
    registerWindowPositionCalculationWithAction: (calculation, action) => registry.set(action, calculation),
  },
});

const files = [
  "SpectacleWindowCalculationHelpers.js",
  "SpectacleCenterWindowCalculation.js",
  "SpectacleWindowSizeAdjuster.js",
  "SpectacleNextOrPreviousThirds.js",
  "SpectacleNextOrPreviousDisplay.js",
  "SpectacleFullscreenWindowCalculation.js",
  "SpectacleLeftHalfWindowCalculation.js",
  "SpectacleRightHalfWindowCalculation.js",
  "SpectacleTopHalfWindowCalculation.js",
  "SpectacleBottomHalfWindowCalculation.js",
  "SpectacleUpperLeftWindowCalculation.js",
  "SpectacleLowerLeftWindowCalculation.js",
  "SpectacleUpperRightWindowCalculation.js",
  "SpectacleLowerRightWindowCalculation.js",
  "SpectacleNextThirdWindowCalculation.js",
  "SpectaclePreviousThirdWindowCalculation.js",
  "SpectacleLargerWindowCalculation.js",
  "SpectacleSmallerWindowCalculation.js",
  "SpectacleNextDisplayWindowCalculation.js",
  "SpectaclePreviousDisplayWindowCalculation.js",
];

for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(calculationsRoot, file), "utf8"), context, { filename: file });
}

const actionNames = {
  center: "SpectacleWindowActionCenter",
  maximize: "SpectacleWindowActionFullscreen",
  leftHalf: "SpectacleWindowActionLeftHalf",
  rightHalf: "SpectacleWindowActionRightHalf",
  topHalf: "SpectacleWindowActionTopHalf",
  bottomHalf: "SpectacleWindowActionBottomHalf",
  upperLeft: "SpectacleWindowActionUpperLeft",
  lowerLeft: "SpectacleWindowActionLowerLeft",
  upperRight: "SpectacleWindowActionUpperRight",
  lowerRight: "SpectacleWindowActionLowerRight",
  nextThird: "SpectacleWindowActionNextThird",
  previousThird: "SpectacleWindowActionPreviousThird",
  makeLarger: "SpectacleWindowActionLarger",
  makeSmaller: "SpectacleWindowActionSmaller",
  nextDisplay: "SpectacleWindowActionNextDisplay",
  previousDisplay: "SpectacleWindowActionPreviousDisplay",
};

const fixtures = [];
const copy = (rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });

function add(name, action, window, source, destination = source) {
  const calculation = registry.get(actionNames[action]);
  if (!calculation) throw new Error(`No calculation registered for ${action}`);
  fixtures.push({
    name,
    action,
    window: copy(window),
    source: copy(source),
    destination: copy(destination),
    expected: copy(calculation(copy(window), copy(source), copy(destination))),
  });
}

function sequence(prefix, action, initial, screen, count) {
  let current = copy(initial);
  for (let index = 1; index <= count; index += 1) {
    add(`${prefix}-${index}`, action, current, screen);
    current = copy(fixtures.at(-1).expected);
  }
}

const even = { x: 0, y: 0, width: 1440, height: 900 };
const odd = { x: 13, y: 27, width: 1001, height: 777 };
const initial = { x: 213, y: 147, width: 617, height: 421 };

for (const action of ["leftHalf", "rightHalf", "topHalf", "bottomHalf", "upperLeft", "lowerLeft", "upperRight", "lowerRight"]) {
  sequence(`${action}-even`, action, initial, even, 4);
  sequence(`${action}-odd`, action, initial, odd, 4);
}
sequence("next-third", "nextThird", initial, odd, 7);
sequence("previous-third", "previousThird", initial, odd, 7);

add("center-odd-rounding", "center", { x: 0, y: 0, width: 402, height: 301 }, odd);
add("maximize-visible-frame", "maximize", initial, odd);
add("display-fit-centers", "nextDisplay", { x: 10, y: 20, width: 600, height: 400 }, even, odd);
add("display-too-large-maximizes", "previousDisplay", { x: 10, y: 20, width: 1200, height: 800 }, even, odd);

const resizeWindows = [
  ["center", { x: 300, y: 200, width: 600, height: 420 }],
  ["left-edge", { x: 3, y: 200, width: 600, height: 420 }],
  ["right-edge", { x: 837, y: 200, width: 600, height: 420 }],
  ["top-edge", { x: 300, y: 477, width: 600, height: 420 }],
  ["bottom-edge", { x: 300, y: 4, width: 600, height: 420 }],
  ["all-edges", copy(even)],
  ["quarter-threshold", { x: 450, y: 300, width: 375, height: 255 }],
];
for (const [name, window] of resizeWindows) {
  add(`larger-${name}`, "makeLarger", window, even);
  add(`smaller-${name}`, "makeSmaller", window, even);
}

let state = 0x5eed1234;
const random = () => {
  state = (1664525 * state + 1013904223) >>> 0;
  return state / 0x100000000;
};
const directActions = Object.keys(actionNames);
for (let index = 0; index < 32; index += 1) {
  const screen = {
    x: Math.floor(random() * 1200) - 600,
    y: Math.floor(random() * 800) - 400,
    width: Math.floor(random() * 1200) + 600,
    height: Math.floor(random() * 700) + 500,
  };
  const window = {
    x: screen.x + Math.floor(random() * Math.max(1, screen.width - 300)),
    y: screen.y + Math.floor(random() * Math.max(1, screen.height - 220)),
    width: Math.floor(random() * Math.max(1, screen.width - 260)) + 240,
    height: Math.floor(random() * Math.max(1, screen.height - 180)) + 160,
  };
  const action = directActions[index % directActions.length];
  add(`seeded-${String(index).padStart(3, "0")}-${action}`, action, window, screen);
}

process.stdout.write(`${JSON.stringify({
  source: { project: "Spectacle 1.2", commit: expectedCommit, license: "MIT" },
  generatedBy: "tools/spectacle-oracle/generate-fixtures.mjs",
  fixtures,
}, null, 2)}\n`);
