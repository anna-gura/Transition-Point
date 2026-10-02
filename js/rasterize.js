/**
 * Draws the visible text (and glass buttons) of an element into a canvas the
 * size of the viewport. The shader then turns those pixels into particles.
 *
 * Positions come from the real layout, so the picture matches the DOM exactly.
 */

const GLASS_SELECTOR = '.glass';
/** Text meant only for screen readers must never be drawn. */
const HIDDEN_SELECTOR = '.visually-hidden, [hidden]';
const MIN_VISIBLE_OPACITY = 0.05;

/**
 * @param {HTMLElement} root
 * @param {number} width viewport width in CSS px
 * @param {number} height viewport height in CSS px
 * @param {number} pixelRatio
 * @returns {HTMLCanvasElement}
 */
export function rasterizeForDissolve(root, width, height, pixelRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);

  root.querySelectorAll(GLASS_SELECTOR).forEach((element) => {
    if (effectiveOpacity(element, root) < MIN_VISIBLE_OPACITY) return;
    drawGlass(ctx, element);
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeValue.trim()) drawTextNode(ctx, node, root);
  }
  return canvas;
}

function effectiveOpacity(element, root) {
  let opacity = 1;
  for (let el = element; el && el !== root.parentElement; el = el.parentElement) {
    opacity *= parseFloat(getComputedStyle(el).opacity);
  }
  return opacity;
}

function drawGlass(ctx, element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const radiusValue = style.borderTopLeftRadius;
  const radius = radiusValue.endsWith('%')
    ? Math.min(rect.width, rect.height) / 2
    : Math.min(parseFloat(radiusValue) || 0, rect.width / 2, rect.height / 2);

  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(rect.left, rect.top, rect.width, rect.height, radius)
    : ctx.rect(rect.left, rect.top, rect.width, rect.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTextNode(ctx, node, root) {
  const element = node.parentElement;
  if (element.closest(HIDDEN_SELECTOR)) return;
  if (effectiveOpacity(element, root) < MIN_VISIBLE_OPACITY) return;

  const style = getComputedStyle(element);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.fillStyle = style.color;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
  const uppercase = style.textTransform === 'uppercase';

  const range = document.createRange();
  const words = /\S+/g;
  for (let match = words.exec(node.nodeValue); match; match = words.exec(node.nodeValue)) {
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const rect = range.getClientRects()[0];
    if (!rect) continue;

    const word = uppercase ? match[0].toUpperCase() : match[0];
    // Place the baseline exactly where the browser put it, using real font metrics.
    const metrics = ctx.measureText(word);
    const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2;
    const baseline = rect.top + (rect.height - (ascent + descent)) / 2 + ascent;
    ctx.fillText(word, rect.left, baseline);
  }
}
