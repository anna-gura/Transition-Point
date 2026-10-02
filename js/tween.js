/** Small animation primitives: easing, tweens and a frame-based scheduler. */

export const ease = {
  linear: (t) => t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** A value that animates from `from` to `to` over `duration` seconds. */
export class Tween {
  constructor(from = 0, to = from, duration = 0, delay = 0, easing = ease.inOutCubic, now = performance.now()) {
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.easing = easing;
    this.start = now + delay * 1000;
  }

  progress(now) {
    if (this.duration <= 0) return now >= this.start ? 1 : 0;
    return clamp01((now - this.start) / (this.duration * 1000));
  }

  value(now) {
    return this.from + (this.to - this.from) * this.easing(this.progress(now));
  }

  isDone(now) {
    return now >= this.start + this.duration * 1000;
  }

  get endTime() {
    return this.start + this.duration * 1000;
  }
}

/**
 * Runs callbacks at a given time, checked once per frame. Unlike setTimeout,
 * it pauses together with the render loop when the tab is hidden.
 */
export class Scheduler {
  constructor() {
    this.jobs = [];
  }

  at(time, callback) {
    this.jobs.push({ time, callback });
  }

  run(now) {
    const due = this.jobs.filter((job) => job.time <= now);
    if (!due.length) return;
    this.jobs = this.jobs.filter((job) => job.time > now);
    due.forEach((job) => job.callback());
  }
}
