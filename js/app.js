import { COMPACT_LAYOUT_QUERY, DURATION, INPUT, RENDER, BUBBLES } from './config.js';
import { Tween, Scheduler, ease } from './tween.js';
import { SceneRenderer } from './renderer.js';
import { GestureInput } from './input.js';
import { BubbleField } from './bubbles.js';
import { rasterizeForDissolve } from './rasterize.js';

/** @typedef {'hero' | 'warm' | 'water' | 'faq' | 'dawn'} ScreenName */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (from, to, v) => clamp01((v - from) / (to - from));

/**
 * The experience is a small state machine:
 *
 *   hero ⇄ warm ⇄ water ⇄ dawn
 *                   ⇅
 *                  faq
 *
 * Each transition starts tweens, makes every screen inert while it runs and
 * hands focus to the new screen when it finishes. Rendering (WebGL + DOM
 * transforms) is derived from the tweens every frame.
 */
export class App {
  constructor(root = document) {
    this.dom = queryDom(root);
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.compactQuery = matchMedia(COMPACT_LAYOUT_QUERY);

    /** @type {ScreenName} */
    this.screen = 'hero';
    this.busyUntil = 0;
    this.scheduler = new Scheduler();
    this.tweens = {
      portal: new Tween(0), dive: new Tween(0), rise: new Tween(0),
      dust: new Tween(0), grow: new Tween(0), appear: new Tween(0),
    };
    this.portalForward = true;
    this.dripStart = null;
    this.infoVisible = true;
    this.faqVisible = false;
    this.pointer = [0, 0];
    this.tilt = [0, 0];
    this.styleCache = new WeakMap();
    this.lastFrame = performance.now();
    this.startTime = this.lastFrame;
    this.frameId = 0;
    this.values = { portal: 0, dive: 0, rise: 0, dust: 0, grow: 0, appear: 0 };
    this.bubbleData = new Float32Array(24);
    this.quality = { scale: 1, slow: 0, fast: 0, average: 16 };

    this.renderer = new SceneRenderer(this.dom.canvas);
    if (!this.renderer.init()) document.documentElement.classList.add('no-webgl');
    this.bubbles = new BubbleField(this.dom.faqFrame, this.dom.faqClose);
    this.input = new GestureInput((intent) => this.handleIntent(intent), () => this.isBusy());
  }

  start() {
    this.bindEvents();
    this.input.attach(window);
    this.handleResize();
    this.applyInert();
    this.resume();
  }

  /* ---------- setup ---------- */

  bindEvents() {
    const actions = {
      enter: () => this.enterPortal(),
      'to-water': () => this.diveIn(),
      'to-warm': () => this.diveOut(),
      'open-faq': () => this.openFaq(),
      'close-faq': () => this.closeFaq(),
      'to-dawn': () => this.surface(),
      'back-to-water': () => this.sinkBack(),
    };
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = actions[trigger.dataset.action];
      if (action) {
        event.preventDefault();
        action();
      }
    });

    window.addEventListener('pointermove', (event) => {
      this.pointer = [(event.clientX / innerWidth - 0.5) * 2, (event.clientY / innerHeight - 0.5) * 2];
    });

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => this.handleResize());
    });
    this.compactQuery.addEventListener('change', () => this.handleResize());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
  }

  handleResize() {
    this.viewport = { width: innerWidth, height: innerHeight };
    this.renderer.resize(this.viewport.width, this.viewport.height);
    this.bubbles.layout(this.compactQuery.matches);
    this.confidenceAnchor = circleWithin(this.dom.confidenceBubble, this.dom.screens.water);
    this.closeAnchor = circleWithin(this.dom.faqClose, this.dom.screens.water);
    this.bubbleOrigin = { x: this.dom.faqFrame.offsetLeft, y: this.dom.faqFrame.offsetTop };
  }

  /* ---------- loop ---------- */

  resume() {
    if (this.frameId) return;
    this.lastFrame = performance.now();
    const tick = (now) => {
      this.frame(now);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  pause() {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  frame(now) {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    this.scheduler.run(now);

    const t = this.values;
    for (const key in this.tweens) t[key] = this.tweens[key].value(now);
    this.adaptQuality(dt * 1000);
    const ambientTime = this.reducedMotion.matches ? 20 : (now - this.startTime) / 1000;

    const follow = this.compactQuery.matches
      ? [Math.sin(ambientTime * 0.15) * 0.6, Math.cos(ambientTime * 0.11) * 0.6]
      : this.pointer;
    this.tilt = this.tilt.map((v, i) => v + (follow[i] - v) * RENDER.tiltFollow);

    this.bubbles.update(dt);
    const offsets = this.updateScreens(t);
    const dripTime = this.dripStart === null ? -1 : (now - this.dripStart) / 1000;

    this.renderer.render({
      time: ambientTime,
      tilt: this.tilt,
      portal: t.portal,
      dive: t.dive,
      rise: t.rise,
      dust: t.dust,
      dripTime,
      riseDuration: this.duration(DURATION.rise),
      dripColumns: this.compactQuery.matches ? RENDER.dripColumns.compact : RENDER.dripColumns.wide,
      refractWater: t.dive >= 1 && t.rise <= 0,
      bubbles: this.bubbleUniforms(t, offsets),
    });
  }

  /** Applies per-frame transforms to the DOM layers. Returns the water layer offset. */
  updateScreens(t) {
    const { width, height } = this.viewport;
    const { hero, warm, water, dawn } = this.dom.screens;

    // Hero title and hints fade as we fall into the light.
    const heroFade = range(0, 0.22, t.portal);
    this.setStyle(this.dom.heroTitle, 'opacity', String(1 - heroFade));
    this.setStyle(this.dom.heroTitle, 'filter', heroFade ? `blur(${(heroFade * 10).toFixed(1)}px)` : 'none');
    this.setStyle(this.dom.heroTitle, 'transform', `scale(${(1 + heroFade * 0.6).toFixed(3)})`);
    const hintOpacity = 1 - range(0, 0.12, t.portal);
    this.setStyle(this.dom.heroChrome, 'opacity', String(hintOpacity));
    this.setStyle(hero, 'visibility', hintOpacity <= 0 && heroFade >= 1 ? 'hidden' : 'visible');

    // Warm room: words assemble on the way in and simply fade on the way out.
    const warmVisibility = this.portalForward ? range(0.86, 1, t.portal) : range(0.5, 1, t.portal);
    const revealed = this.portalForward
      ? t.portal > 0.93
      : t.portal > 0.05 && this.dom.warmContent.dataset.revealed === 'true';
    this.setReveal(this.dom.warmContent, revealed);
    this.setStyle(warm, 'opacity', String(t.dive >= 1 ? 0 : warmVisibility));
    this.setStyle(warm, 'filter', !this.portalForward && warmVisibility < 1 ? `blur(${((1 - warmVisibility) * 6).toFixed(1)}px)` : 'none');
    this.setStyle(warm, 'transform', `translate3d(${(t.dive * width * 1.1).toFixed(1)}px, 0, 0)`);
    this.setStyle(warm, 'visibility', warmVisibility <= 0 || t.dive >= 1 ? 'hidden' : 'visible');

    // Water slides in with the vertical "water edge" and sinks while surfacing.
    const edge = -0.35 + 1.7 * t.dive;
    const offset = { x: (edge - 1.35) * width, y: t.rise * height * 0.9 };
    const waterShown = t.dive > 0 && t.rise < 1;
    this.setStyle(water, 'visibility', waterShown ? 'visible' : 'hidden');
    this.setStyle(water, 'transform', `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`);
    this.setStyle(this.dom.waterInfo, 'opacity', this.infoVisible ? '1' : '0');
    this.setStyle(this.dom.faqField, 'opacity', this.faqVisible ? '1' : '0');
    this.setStyle(this.dom.faqField, 'visibility', this.faqVisible ? 'visible' : 'hidden');
    const back = this.screen === 'water' && this.infoVisible ? 'visible' : 'hidden';
    if (water.dataset.back !== back) water.dataset.back = back;

    // Dawn drops in from above.
    const dawnOpacity = range(0.45, 0.9, t.rise);
    const dripFade = this.dripStart === null ? 1 : range(0, this.duration(DURATION.rise) + 1.2, (performance.now() - this.dripStart) / 1000);
    this.setStyle(dawn, 'visibility', t.rise > 0 ? 'visible' : 'hidden');
    this.setStyle(dawn, 'opacity', String(dawnOpacity));
    this.setStyle(dawn, 'transform', `translate3d(0, ${(-(1 - t.rise) * height * 0.6).toFixed(1)}px, 0)`);
    this.setStyle(dawn, 'filter', dripFade < 1 ? `blur(${((1 - dripFade) * 2.5).toFixed(2)}px)` : 'none');

    // Colour of the always-visible quick exit link follows the background.
    let tone = 'night';
    if (t.rise > 0.5) tone = 'dawn';
    else if (t.dive > 0.5) tone = 'water';
    else if (t.portal > 0.62) tone = 'warm';
    if (document.body.dataset.tone !== tone) document.body.dataset.tone = tone;

    return offset;
  }

  bubbleUniforms(t, offset) {
    const data = this.bubbleData;
    data.fill(0);
    if (!(t.dive > 0 && t.rise < 1)) return data;
    const { width, height } = this.viewport;

    const anchor = this.confidenceAnchor;
    const full = Math.hypot(width, height) * BUBBLES.fullScreenFactor;
    const x = anchor.x + offset.x;
    const y = anchor.y + offset.y;
    data.set([x + (width / 2 - x) * t.grow, y + (height / 2 - y) * t.grow, anchor.r + (full - anchor.r) * t.grow, 1], 0);

    const origin = this.bubbleOrigin;
    this.bubbles.forEachCircle((circle, index) => {
      data.set([circle.x + origin.x + offset.x, circle.y + origin.y + offset.y, circle.r * (0.35 + 0.65 * t.appear), t.appear], (index + 1) * 4);
    });

    const close = this.closeAnchor;
    data.set([close.x + offset.x, close.y + offset.y, close.r * (0.35 + 0.65 * t.appear), t.appear], 20);
    return data;
  }

  /**
   * Dynamic resolution: if frames get slow, render the scene at a lower
   * internal resolution (the soft, blurry imagery hides it well); recover
   * when there is headroom again.
   */
  adaptQuality(frameMs) {
    const q = this.quality;
    const cfg = RENDER.quality;
    q.average += (frameMs - q.average) * 0.1;
    q.slow = q.average > cfg.slowFrameMs ? q.slow + 1 : 0;
    q.fast = q.average < cfg.fastFrameMs ? q.fast + 1 : 0;

    let next = q.scale;
    if (q.slow > cfg.sampleFrames) next = Math.max(cfg.min, q.scale * cfg.stepDown);
    else if (q.fast > cfg.sampleFrames * 3) next = Math.min(cfg.max, q.scale * cfg.stepUp);
    if (next === q.scale) return;

    q.scale = next;
    q.slow = 0;
    q.fast = 0;
    this.renderer.setRenderScale(next);
  }

  /* ---------- transitions ---------- */

  isBusy() {
    return performance.now() < this.busyUntil;
  }

  duration(seconds) {
    return this.reducedMotion.matches ? Math.min(seconds, DURATION.reducedMotionCap) : seconds;
  }

  /** Starts a tween and extends the busy window to cover it. */
  animate(name, from, to, seconds, delay = 0, easing = ease.inOutCubic) {
    const now = performance.now();
    const tween = new Tween(from, to, this.duration(seconds), this.reducedMotion.matches ? 0 : delay, easing, now);
    this.tweens[name] = tween;
    this.busyUntil = Math.max(this.busyUntil, tween.endTime);
  }

  /** Runs `callback` after `seconds` (scaled for reduced motion) and keeps the app busy until then. */
  after(seconds, callback) {
    const at = performance.now() + this.duration(seconds) * 1000;
    this.busyUntil = Math.max(this.busyUntil, at);
    this.scheduler.at(at, callback);
  }

  /** @param {ScreenName} screen */
  go(screen) {
    this.screen = screen;
    this.applyInert();
    // Steps scheduled during the transition may extend it, so wait until it is really over.
    const settle = () => {
      if (this.screen !== screen) return;
      if (this.isBusy()) {
        this.scheduler.at(this.busyUntil, settle);
        return;
      }
      this.applyInert();
      this.focusScreen(screen);
    };
    this.scheduler.at(this.busyUntil, settle);
  }

  enterPortal() {
    if (this.screen !== 'hero' || this.isBusy()) return;
    this.portalForward = true;
    this.animate('portal', this.tweens.portal.value(performance.now()), 1, DURATION.enterPortal);
    this.go('warm');
  }

  leavePortal() {
    if (this.screen !== 'warm' || this.isBusy()) return;
    this.portalForward = false;
    this.animate('portal', 1, 0, DURATION.leavePortal);
    this.go('hero');
  }

  diveIn() {
    if (this.screen !== 'warm' || this.isBusy()) return;
    this.infoVisible = true;
    this.faqVisible = false;
    this.setReveal(this.dom.waterInfo, false);
    this.animate('dive', 0, 1, DURATION.dive);
    this.after(DURATION.dive * 0.45, () => this.setReveal(this.dom.waterInfo, true, true));
    this.go('water');
  }

  diveOut() {
    if (this.screen !== 'water' || this.isBusy()) return;
    this.animate('dive', 1, 0, DURATION.undive);
    this.go('warm');
  }

  openFaq() {
    if (this.screen !== 'water' || this.isBusy()) return;
    this.dissolve(this.dom.waterInfo, DURATION.dissolve);
    this.infoVisible = false;
    this.animate('grow', 0, 1, DURATION.bubbleGrow, 0.15);
    this.after(1.5, () => {
      this.faqVisible = true;
      this.setReveal(this.dom.faqField, true, true);
      this.animate('appear', 0, 1, DURATION.bubblesAppear);
    });
    this.after(2.3, () => this.endDissolve());
    this.go('faq');
  }

  closeFaq() {
    if (this.screen !== 'faq' || this.isBusy()) return;
    this.dissolve(this.dom.faqField, 1.5);
    this.faqVisible = false;
    this.animate('appear', 1, 0, DURATION.bubblesHide, 0.25);
    this.animate('grow', 1, 0, DURATION.bubbleShrink, 0.8);
    this.after(2.4, () => {
      this.bubbles.reset();
      this.infoVisible = true;
      this.setReveal(this.dom.waterInfo, true, true);
    });
    this.after(2.8, () => this.endDissolve());
    this.go('water');
  }

  surface() {
    if (this.screen !== 'water' || this.isBusy()) return;
    this.dissolve(this.dom.waterInfo, DURATION.dissolveJoin);
    this.infoVisible = false;
    this.animate('rise', 0, 1, DURATION.rise, 0.5);
    this.dripStart = performance.now() + (this.reducedMotion.matches ? 0 : 500);
    this.go('dawn');
  }

  sinkBack() {
    if (this.screen !== 'dawn' || this.isBusy()) return;
    this.dripStart = null;
    this.animate('rise', 1, 0, DURATION.unrise);
    // The texture of the dissolved text is still loaded, so it reassembles in reverse.
    this.animate('dust', 1, 0, DURATION.reassemble, 0.7);
    this.after(2.55, () => {
      this.infoVisible = true;
      this.endDissolve();
    });
    this.go('water');
  }

  /** Hides `element` and lets the shader blow its text away. */
  dissolve(element, seconds) {
    const { width, height } = this.viewport;
    this.renderer.setTexture(rasterizeForDissolve(element, width, height, this.renderer.pixelRatio));
    this.animate('dust', 0, 1, seconds, 0, ease.linear);
  }

  endDissolve() {
    this.tweens.dust = new Tween(0);
    this.renderer.clearTexture();
  }

  /* ---------- input ---------- */

  /** @param {import('./input.js').Intent} intent */
  handleIntent({ axis, total, source }) {
    const T = INPUT.threshold;
    const forward = total > T;
    const backward = total < -T;
    const touch = source === 'touch';

    switch (this.screen) {
      case 'hero':
        if (axis === 'y' && total > INPUT.heroThreshold) return this.run(() => this.enterPortal());
        return false;
      case 'warm':
        if (axis === 'y' && forward) return this.run(() => this.diveIn());
        if (axis === 'y' && backward) return this.run(() => this.leavePortal());
        if (axis === 'x' && backward) return this.run(() => this.diveIn());
        return false;
      case 'water':
        if (axis === 'x' && forward) return this.run(() => this.diveOut());
        if (axis !== 'y') return false;
        if (forward || (touch && backward)) return this.run(() => this.surface());
        if (backward) return this.run(() => this.diveOut());
        return false;
      case 'faq':
        if (axis === 'y' && backward) return this.run(() => this.closeFaq());
        return false;
      case 'dawn':
        if (axis === 'y' && (backward || (touch && forward))) return this.run(() => this.sinkBack());
        return false;
      default:
        return false;
    }
  }

  run(transition) {
    transition();
    return true;
  }

  /* ---------- accessibility ---------- */

  /** Only the current screen (and view) can be reached by keyboard and screen readers. */
  applyInert() {
    const active = this.isBusy() ? null : this.screen;
    const screenOf = { hero: 'hero', warm: 'warm', water: 'water', faq: 'water', dawn: 'dawn' };
    Object.entries(this.dom.screens).forEach(([name, element]) => {
      element.inert = active === null || screenOf[active] !== name;
    });
    this.dom.waterInfo.inert = active !== 'water';
    this.dom.faqField.inert = active !== 'faq';
  }

  focusScreen(screen) {
    const target = document.querySelector(`[data-focus="${screen}"]`);
    if (target && document.activeElement !== target) target.focus({ preventScroll: true });
  }

  /* ---------- helpers ---------- */

  /**
   * Toggles the word-by-word reveal animation.
   * @param {boolean} replay restart the animation even if already revealed
   */
  setReveal(element, revealed, replay = false) {
    const value = String(revealed);
    if (replay && revealed) {
      element.dataset.revealed = 'false';
      void element.offsetWidth; // restart CSS animations
    }
    if (element.dataset.revealed !== value) element.dataset.revealed = value;
  }

  /** Writes a style only when it changes, to avoid needless style recalculation. */
  setStyle(element, property, value) {
    let cache = this.styleCache.get(element);
    if (!cache) this.styleCache.set(element, (cache = {}));
    if (cache[property] === value) return;
    cache[property] = value;
    element.style[property] = value;
  }
}

/**
 * Centre and radius of an element relative to `ancestor`, from layout offsets
 * (ignores CSS transforms such as the reveal animation).
 */
function circleWithin(element, ancestor) {
  let x = 0;
  let y = 0;
  for (let el = element; el && el !== ancestor; el = el.offsetParent) {
    x += el.offsetLeft - (el.offsetParent?.scrollLeft ?? 0);
    y += el.offsetTop - (el.offsetParent?.scrollTop ?? 0);
  }
  const width = element.offsetWidth;
  return { x: x + width / 2, y: y + element.offsetHeight / 2, r: width / 2 };
}

function queryDom(root) {
  const one = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  };
  return {
    canvas: one('[data-scene]'),
    screens: {
      hero: one('[data-screen="hero"]'),
      warm: one('[data-screen="warm"]'),
      water: one('[data-screen="water"]'),
      dawn: one('[data-screen="dawn"]'),
    },
    heroTitle: one('[data-hero-title]'),
    heroChrome: one('[data-hero-chrome]'),
    warmContent: one('[data-warm-content]'),
    waterInfo: one('[data-water-info]'),
    confidenceBubble: one('[data-confidence-bubble]'),
    faqField: one('[data-faq]'),
    faqFrame: one('[data-faq-frame]'),
    faqClose: one('[data-action="close-faq"]'),
  };
}
