import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders.js';
import { RENDER } from './config.js';

const UNIFORMS = [
  'uResolution',
  'uTime',
  'uTilt',
  'uSphereScale',
  'uPortal',
  'uDive',
  'uRise',
  'uDust',
  'uDripTime',
  'uRiseDuration',
  'uDripColumns',
  'uHasTexture',
  'uRefractWater',
  'uTexture',
  'uBubbles',
];

/**
 * Owns the WebGL context and draws the full-screen scene.
 * Handles resizing and context loss so the page survives GPU resets.
 */
export class SceneRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.uniforms = {};
    this.texture = null;
    this.hasTexture = false;
    this.pixelRatio = 1;
    this.renderScale = 1;
    this.bubbleBuffer = new Float32Array(24);
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.lastTextureSource = null;

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.gl = null;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.init();
      this.resize(this.cssWidth, this.cssHeight);
      if (this.lastTextureSource) this.setTexture(this.lastTextureSource);
    });
  }

  /** @returns {boolean} false when WebGL is unavailable */
  init() {
    const gl =
      this.canvas.getContext('webgl', { antialias: false, alpha: false }) ||
      this.canvas.getContext('experimental-webgl');
    if (!gl) return false;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));

    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(this.uniforms.uTexture, 0);
    gl.uniform1f(this.uniforms.uSphereScale, RENDER.sphereScale);
    this.gl = gl;
    return true;
  }

  get isReady() {
    return this.gl !== null;
  }

  /** Changes the internal resolution (1 = full) without touching the CSS size. */
  setRenderScale(scale) {
    if (Math.abs(scale - this.renderScale) < 0.01) return;
    this.renderScale = scale;
    this.resize(this.cssWidth, this.cssHeight);
  }

  resize(cssWidth, cssHeight) {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    const native = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    const budget = Math.sqrt(RENDER.maxPixels / Math.max(cssWidth * cssHeight, 1));
    this.pixelRatio = Math.min(native, budget) * this.renderScale;
    this.canvas.width = Math.max(1, Math.round(cssWidth * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.round(cssHeight * this.pixelRatio));
    if (!this.gl) return;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
  }

  /** @param {HTMLCanvasElement} source rasterized text, same size as the viewport */
  setTexture(source) {
    this.lastTextureSource = source;
    this.hasTexture = true;
    const { gl } = this;
    if (!gl) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  clearTexture() {
    this.hasTexture = false;
    this.lastTextureSource = null;
  }

  /**
   * @param {object} frame
   * @param {number} frame.time
   * @param {[number, number]} frame.tilt
   * @param {number} frame.portal
   * @param {number} frame.dive
   * @param {number} frame.rise
   * @param {number} frame.dust
   * @param {number} frame.dripTime
   * @param {number} frame.riseDuration
   * @param {number} frame.dripColumns
   * @param {boolean} frame.refractWater
   * @param {Float32Array} frame.bubbles 6 × (x, y, radius, opacity) in CSS px, top-left origin
   */
  render(frame) {
    const { gl, uniforms: u } = this;
    if (!gl) return;
    const ratio = this.pixelRatio;
    const bubbles = this.bubbleBuffer;
    for (let i = 0; i < bubbles.length; i += 4) {
      bubbles[i] = frame.bubbles[i] * ratio;
      bubbles[i + 1] = (this.cssHeight - frame.bubbles[i + 1]) * ratio;
      bubbles[i + 2] = frame.bubbles[i + 2] * ratio;
      bubbles[i + 3] = frame.bubbles[i + 3];
    }

    gl.uniform1f(u.uTime, frame.time);
    gl.uniform2f(u.uTilt, frame.tilt[0], frame.tilt[1]);
    gl.uniform1f(u.uPortal, frame.portal);
    gl.uniform1f(u.uDive, frame.dive);
    gl.uniform1f(u.uRise, frame.rise);
    gl.uniform1f(u.uDust, frame.dust);
    gl.uniform1f(u.uDripTime, frame.dripTime);
    gl.uniform1f(u.uRiseDuration, frame.riseDuration);
    gl.uniform1f(u.uDripColumns, frame.dripColumns);
    gl.uniform1f(u.uHasTexture, this.hasTexture ? 1 : 0);
    gl.uniform1f(u.uRefractWater, frame.refractWater ? 1 : 0);
    gl.uniform4fv(u.uBubbles, bubbles);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}
