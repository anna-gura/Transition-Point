/**
 * Every tunable number of the experience lives here, so behaviour can be
 * adjusted without digging through the logic.
 */

/** Must stay in sync with the `compact` media query in css/style.css. */
export const COMPACT_LAYOUT_QUERY = '(max-width: 700px), (max-aspect-ratio: 5/6)';

export const QUICK_EXIT_URL = 'https://sinoptik.ua/';

export const RENDER = {
  maxPixelRatio: 1.5,
  /** Upper bound of shaded pixels per frame; large/high-DPI screens render below native size. */
  maxPixels: 2_400_000,
  /** Dynamic resolution: the render scale adapts to the measured frame time. */
  quality: {
    min: 0.5,
    max: 1,
    slowFrameMs: 22,
    fastFrameMs: 14,
    stepDown: 0.85,
    stepUp: 1.08,
    /** Frames to observe before changing the scale. */
    sampleFrames: 45,
  },
  sphereScale: 0.25,
  dripColumns: { wide: 16, compact: 7 },
  /** How fast the disk follows the pointer (per frame at 60 fps). */
  tiltFollow: 0.03,
};

/** Durations in seconds. */
export const DURATION = {
  enterPortal: 2.8,
  leavePortal: 1.8,
  dive: 2.6,
  undive: 2.2,
  dissolve: 1.6,
  dissolveJoin: 2.2,
  reassemble: 1.8,
  rise: 2.6,
  unrise: 2.2,
  bubbleGrow: 2.0,
  bubbleShrink: 1.9,
  bubblesAppear: 1.2,
  bubblesHide: 1.0,
  reducedMotionCap: 0.7,
};

export const INPUT = {
  /** Accumulated wheel/touch distance (px) needed to trigger a transition. */
  threshold: 140,
  /** The hero reacts to the very first nudge. */
  heroThreshold: 8,
  /** Touch moves are shorter than wheel deltas. */
  touchGain: 2.2,
  keyStep: 200,
  /** Accumulation resets after this pause (ms). */
  idleReset: 350,
  /** Inertial scrolling right after a transition is ignored for this long (ms). */
  quietAfterTransition: 450,
};

export const BUBBLES = {
  /** Centres of the four question bubbles as fractions of the field. */
  wide: {
    centres: [[0.183, 0.37], [0.413, 0.54], [0.644, 0.37], [0.875, 0.54]],
    closed: (w, h) => Math.min(w * 0.192, h * 0.31),
    openRatio: 1.55,
  },
  compact: {
    centres: [[0.27, 0.2], [0.72, 0.38], [0.27, 0.56], [0.72, 0.74]],
    closed: (w, h) => Math.min(w * 0.48, h * 0.22),
    openRatio: 1.62,
  },
  /** Minimal gap between bubbles after they make room (px). */
  gap: 10,
  /** Bubbles keep this distance from the close button (px). */
  closeButtonClearance: 8,
  /** Higher = snappier movement when a bubble opens. */
  stiffness: 7,
  /** The confidence bubble grows until it covers the whole screen. */
  fullScreenFactor: 0.62,
};
