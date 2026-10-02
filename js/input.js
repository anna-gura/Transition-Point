import { INPUT } from './config.js';

/**
 * @typedef {'wheel' | 'touch' | 'key'} InputSource
 * @typedef {{ axis: 'x' | 'y', total: number, source: InputSource }} Intent
 *   total > 0 means "forward": scrolling down, or the finger moving up / to the left.
 */

const SCROLLABLE_SELECTOR = '[data-scrollable]';

/**
 * Turns wheel, touch and arrow keys into accumulated "intents".
 * The page itself never scrolls; instead the handler decides whether an
 * intent is strong enough to switch screens. Content that genuinely
 * overflows (for example with enlarged text) still scrolls natively.
 */
export class GestureInput {
  /**
   * @param {(intent: Intent) => boolean} onIntent return true when the intent was consumed
   * @param {() => boolean} isBlocked true while a transition is running
   */
  constructor(onIntent, isBlocked) {
    this.onIntent = onIntent;
    this.isBlocked = isBlocked;
    this.totals = { x: 0, y: 0 };
    this.lastInput = { x: 0, y: 0 };
    this.quietUntil = 0;
    this.touchPoint = null;
  }

  attach(target = window) {
    target.addEventListener('wheel', (event) => this.handleWheel(event), { passive: false });
    target.addEventListener('touchstart', (event) => this.handleTouchStart(event), { passive: true });
    target.addEventListener('touchmove', (event) => this.handleTouchMove(event), { passive: false });
    target.addEventListener('touchend', () => {
      this.touchPoint = null;
    });
    target.addEventListener('keydown', (event) => this.handleKey(event));
  }

  handleWheel(event) {
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (!horizontal && canScrollNatively(event.target, delta)) return;
    event.preventDefault();
    this.push(horizontal ? 'x' : 'y', delta, 'wheel');
  }

  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchPoint = { x: touch.clientX, y: touch.clientY };
  }

  handleTouchMove(event) {
    if (!this.touchPoint) return;
    const touch = event.touches[0];
    const dx = this.touchPoint.x - touch.clientX;
    const dy = this.touchPoint.y - touch.clientY;
    this.touchPoint = { x: touch.clientX, y: touch.clientY };
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (!horizontal && canScrollNatively(event.target, dy)) return;
    event.preventDefault();
    this.push(horizontal ? 'x' : 'y', (horizontal ? dx : dy) * INPUT.touchGain, 'touch');
  }

  handleKey(event) {
    const steps = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
    if (!(event.key in steps)) return;
    event.preventDefault();
    this.totals.y = 0;
    this.push('y', steps[event.key] * INPUT.keyStep, 'key');
  }

  push(axis, delta, source) {
    const now = performance.now();
    if (this.isBlocked()) {
      this.totals[axis] = 0;
      this.quietUntil = now + INPUT.quietAfterTransition;
      return;
    }
    if (now < this.quietUntil) {
      // Swallow the tail of inertial scrolling that started during a transition.
      this.quietUntil = now + INPUT.quietAfterTransition / 2;
      return;
    }
    if (now - this.lastInput[axis] > INPUT.idleReset) this.totals[axis] = 0;
    this.lastInput[axis] = now;
    this.totals[axis] += delta;

    if (this.onIntent({ axis, total: this.totals[axis], source })) {
      this.totals = { x: 0, y: 0 };
    }
  }
}

/** True when the event happens inside overflowing content that can still scroll that way. */
function canScrollNatively(target, delta) {
  const scroller = target instanceof Element ? target.closest(SCROLLABLE_SELECTOR) : null;
  if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) return false;
  if (delta > 0) return scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
  return scroller.scrollTop > 0;
}
