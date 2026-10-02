import { BUBBLES } from './config.js';

/**
 * Lays out and animates the four question bubbles.
 *
 * Geometry lives in JS (not in CSS transitions) because the WebGL soap film
 * has to follow the exact same circles every frame. When a bubble opens, the
 * others move aside so their text never overlaps.
 */
export class BubbleField {
  /**
   * @param {HTMLElement} field the centred layout frame that holds the bubbles
   * @param {HTMLElement} closeButton must be positioned inside `field`
   */
  constructor(field, closeButton) {
    this.field = field;
    this.closeButton = closeButton;
    this.items = [...field.querySelectorAll('[data-bubble]')].map((element) => ({
      element,
      toggle: element.querySelector('[data-bubble-toggle]'),
      question: element.querySelector('[data-bubble-question]'),
      answer: element.querySelector('[data-bubble-answer]'),
      current: null,
    }));
    this.selected = -1;
    this.layouts = null;
    this.items.forEach((item, index) => {
      item.toggle.addEventListener('click', () => this.select(this.selected === index ? -1 : index));
    });
  }

  /** Recomputes all positions; call on resize and layout changes. */
  layout(compact) {
    const config = compact ? BUBBLES.compact : BUBBLES.wide;
    const width = this.field.clientWidth;
    const height = this.field.clientHeight;
    const closeTop = this.closeButton.offsetTop;
    const closed = config.closed(width, height);
    const open = closed * config.openRatio;

    this.field.style.setProperty('--bubble-closed', `${closed}px`);
    this.field.style.setProperty('--bubble-open', `${open}px`);

    const base = config.centres.map(([fx, fy]) => ({ x: fx * width, y: fy * height }));
    const bounds = { width, height, bottom: closeTop - BUBBLES.closeButtonClearance };
    this.layouts = [base.map((p) => ({ ...p, r: closed / 2 }))];
    base.forEach((_, index) => this.layouts.push(makeRoom(base, index, closed, open, bounds)));

    this.items.forEach((item) => { item.current = null; item.rendered = false; });
  }

  /** Layout for the current selection: index 0 = nothing open. */
  targets() {
    return this.layouts[this.selected + 1];
  }

  select(index) {
    if (index === this.selected) return;
    const previous = this.items[this.selected];
    if (previous) setOpen(previous, false);
    this.selected = index;
    const next = this.items[index];
    if (next) {
      centreText(next);
      setOpen(next, true);
    }
  }

  /** Closes everything instantly (used when the field is hidden). */
  reset() {
    this.select(-1);
    this.items.forEach((item) => { item.current = null; item.rendered = false; });
  }

  /**
   * Moves bubbles towards their targets.
   * @param {number} dt seconds since the previous frame
   */
  update(dt) {
    if (!this.layouts) return;
    const follow = 1 - Math.exp(-dt * BUBBLES.stiffness);
    const targets = this.targets();
    this.items.forEach((item, index) => {
      const target = targets[index];
      if (!item.current) item.current = { ...target };
      const c = item.current;
      const moving = Math.abs(target.x - c.x) + Math.abs(target.y - c.y) + Math.abs(target.r - c.r) > 0.05;
      if (!moving && item.rendered) return;
      c.x += (target.x - c.x) * follow;
      c.y += (target.y - c.y) * follow;
      c.r += (target.r - c.r) * follow;
      item.rendered = true;
      const size = c.r * 2;
      item.element.style.width = `${size}px`;
      item.element.style.height = `${size}px`;
      item.element.style.transform = `translate3d(${c.x - c.r}px, ${c.y - c.r}px, 0)`;
    });
  }

  /** Current circles in field coordinates for the shader (null before the first frame). */
  forEachCircle(callback) {
    this.items.forEach((item, index) => {
      if (item.current) callback(item.current, index);
    });
  }
}

function setOpen(item, open) {
  item.element.classList.toggle('is-open', open);
  item.toggle.setAttribute('aria-expanded', String(open));
  item.answer.setAttribute('aria-hidden', String(!open));
}

/** Stacks question and answer around the bubble centre. */
function centreText(item) {
  const gap = 12;
  const q = item.question.offsetHeight;
  const a = item.answer.offsetHeight;
  const total = q + gap + a;
  const questionShift = -total / 2 + q / 2;
  const answerShift = questionShift + q / 2 + gap + a / 2;
  item.element.style.setProperty('--question-shift', `${questionShift}px`);
  item.element.style.setProperty('--answer-shift', `${answerShift}px`);
}

/**
 * Positions for "bubble `opened` is open": it grows in place (kept inside the
 * field) and the others are pushed away with a small relaxation pass.
 */
function makeRoom(base, opened, closed, open, bounds) {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const centre = {
    x: clamp(base[opened].x, open / 2, bounds.width - open / 2),
    y: clamp(base[opened].y, open / 2, bounds.height - open / 2),
  };
  const others = base.map((p) => ({ ...p }));
  const minFromOpen = open / 2 + closed / 2 + BUBBLES.gap;
  const minBetween = closed + BUBBLES.gap;

  for (let iteration = 0; iteration < 200; iteration += 1) {
    others.forEach((p, i) => {
      if (i === opened) return;
      pushApart(centre, p, minFromOpen, false);
    });
    for (let i = 0; i < others.length; i += 1) {
      for (let j = i + 1; j < others.length; j += 1) {
        if (i === opened || j === opened) continue;
        pushApart(others[i], others[j], minBetween, true);
      }
    }
    others.forEach((p, i) => {
      if (i === opened) return;
      p.x = clamp(p.x, closed / 2, bounds.width - closed / 2);
      p.y = clamp(p.y, closed / 2, bounds.bottom - closed / 2);
    });
  }

  return others.map((p, i) => (i === opened ? { ...centre, r: open / 2 } : { ...p, r: closed / 2 }));
}

function pushApart(a, b, distance, both) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1e-3;
  if (length >= distance) return;
  const overlap = distance - length;
  const ux = dx / length;
  const uy = dy / length;
  if (both) {
    a.x -= ux * overlap / 2; a.y -= uy * overlap / 2;
    b.x += ux * overlap / 2; b.y += uy * overlap / 2;
  } else {
    b.x += ux * overlap; b.y += uy * overlap;
  }
}
