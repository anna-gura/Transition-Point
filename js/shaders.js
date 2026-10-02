/**
 * GLSL sources for the full-screen scene.
 *
 * The page background is a single fragment shader drawn on one triangle that
 * covers the viewport. It renders five layers and blends between them:
 *   portal → warm room → water → dawn sky, plus soap bubbles and the
 *   "dissolve into particles" effect for text.
 *
 * WebGL 1 / GLSL ES 1.00 is used on purpose for the widest device support.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uResolution;     // canvas size in device pixels
uniform float uTime;           // seconds
uniform vec2  uTilt;           // pointer tilt of the accretion disk, -1..1
uniform float uSphereScale;    // sphere radius as a fraction of min(width, height)
uniform float uPortal;         // 0 = hero, 1 = fully inside the light
uniform float uDive;           // 0 = warm room, 1 = under water
uniform float uRise;           // 0 = under water, 1 = dawn sky
uniform float uDust;           // 0..1 progress of the text dissolve
uniform float uDripTime;       // seconds since surfacing started, < 0 when inactive
uniform float uRiseDuration;   // seconds
uniform float uDripColumns;    // number of water streak columns
uniform float uHasTexture;     // 1 when uTexture holds rasterized text
uniform float uRefractWater;   // 1 when bubbles should refract the water behind them
uniform sampler2D uTexture;    // rasterized text for the dissolve effect
uniform vec4  uBubbles[6];     // xy = centre, z = radius (device px), w = opacity

const float PI = 3.14159265;
const vec3 MILK = vec3(1.0, 0.985, 0.955);

/* ---------- noise ---------- */

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

float gaussian(float x, float centre, float width) {
  float d = (x - centre) / width;
  return exp(-d * d);
}

/* Scale factor so effects keep their size across resolutions. */
float pixelScale() {
  return uResolution.y / 900.0;
}

/* ---------- 1. hero: sphere with an edge-on accretion disk ---------- */

vec3 portalScene(vec2 p, float zoom) {
  p /= zoom;
  float breathe = 1.0 + 0.03 * sin(uTime * 0.35);
  float r = length(p);

  // Very dim, almost static dust far from the sphere.
  vec2 lensed = p + normalize(p + 1e-5) * 0.12 / max(r, 0.12);
  float angle = atan(lensed.y, lensed.x) + uTime * 0.004;
  vec2 grid = vec2(angle / (2.0 * PI) * 56.0, log(max(length(lensed), 0.02)) * 9.0);
  vec2 cell = floor(grid);
  float dist = length(fract(grid) - (vec2(hash(cell), hash(cell + 3.1)) * 0.8 + 0.1));
  float twinkle = 0.6 + 0.4 * sin(uTime * 1.3 + hash(cell) * 40.0);
  float star = (1.0 - smoothstep(0.0, 0.12, dist)) * step(0.8, hash(cell + 7.7)) * twinkle
             * smoothstep(0.8, 1.8, r) * (1.0 - smoothstep(6.0, 11.0, r));

  vec3 col = vec3(0.0, 0.0, 0.004);
  col += mix(vec3(0.16, 0.15, 0.17), vec3(0.13, 0.14, 0.2), hash(cell + 1.0)) * star;

  // Disk seen edge-on; the pointer only nudges it slightly.
  float roll = uTilt.x * 0.012;
  vec2 q = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * p;
  q.y -= uTilt.y * 0.01 * q.x;

  float coreRadius = breathe;
  float ax = abs(q.x);
  float fromCore = max(ax - coreRadius * 0.75, 0.0);
  float thickness = 0.16 * exp(-fromCore * 0.3) + 0.008;
  float v = abs(q.y) / thickness;
  float vertical = exp(-v * v * 1.4);
  float falloff = exp(-fromCore * 0.34);
  float doppler = 1.0 + 0.12 * clamp(-q.x * 0.5, -1.0, 1.0);
  vec3 disk = vec3(1.0, 0.985, 0.96) * vertical * falloff * doppler * 1.05;

  // Soft lensing ring hugging the sphere.
  vec2 dir = q / max(r, 1e-4);
  float ringRadius = coreRadius * 1.1;
  float a1 = (r - ringRadius) / 0.08;
  float a2 = (r - ringRadius * 0.97) / 0.05;
  float arc = exp(-a1 * a1) * smoothstep(0.05, 0.9, dir.y)
            + 0.7 * exp(-a2 * a2) * smoothstep(0.05, 0.9, -dir.y);

  float core = 1.0 - smoothstep(coreRadius * 0.86, coreRadius * 1.01, r);
  float bloom = exp(-max(r - coreRadius, 0.0) * 3.6);
  float halo = exp(-r * 1.1);
  float streak = exp(-abs(p.y) * 46.0) * exp(-abs(p.x) * 0.2)
               + 0.22 * exp(-abs(p.y) * 16.0) * exp(-abs(p.x) * 0.4);

  col += disk + vec3(1.0, 0.97, 0.93) * arc * 0.45;
  col += vec3(1.0, 0.93, 0.84) * bloom * 0.55 + vec3(0.85, 0.8, 0.9) * halo * 0.04;
  col += mix(vec3(1.0, 0.9, 0.8), vec3(0.84, 0.89, 1.0), smoothstep(1.2, 5.0, abs(p.x))) * streak * 0.9;

  // Blend the disk colour into the sphere right at the junction.
  float junction = clamp(vertical * falloff, 0.0, 1.0) * (1.0 - smoothstep(coreRadius * 0.98, coreRadius * 1.35, r));
  col = mix(col, MILK, junction);
  col = mix(col, MILK, core);
  return col;
}

/* ---------- 2. warm room with soft "fluffy" dots ---------- */

vec3 warmRoom(vec2 frag, float dotsVisibility) {
  vec3 col = vec3(0.985, 0.93, 0.87);
  if (dotsVisibility <= 0.0) return col;

  vec2 grid = frag / min(uResolution.x, uResolution.y) * 4.2 + vec2(uTime * 0.02, -uTime * 0.015);
  vec2 cell = floor(grid);
  vec2 centre = vec2(0.5) + 0.3 * vec2(sin(uTime * 0.2 + hash(cell) * 6.28), cos(uTime * 0.17 + hash(cell + 2.0) * 6.28));
  vec2 delta = fract(grid) - centre;
  float dist = length(delta);
  float size = 0.06 + 0.06 * hash(cell + 5.0);
  float fuzz = (noise(vec2(atan(delta.y, delta.x) * 2.5 + hash(cell) * 10.0, uTime * 0.25 + dist * 18.0)) - 0.5) * size * 0.55;
  float d = max(dist + fuzz, 0.0) / size;
  float dotMask = exp(-d * d * 2.2) * step(0.45, hash(cell + 9.0));

  float pick = hash(cell + 4.0);
  vec3 dotColor = pick < 0.36 ? vec3(0.56, 0.8, 0.96) : (pick < 0.72 ? vec3(0.94, 0.7, 0.84) : vec3(1.0));
  float alpha = dotsVisibility * (0.7 + 0.2 * sin(uTime * 0.5 + hash(cell) * 20.0));
  return mix(col, dotColor, dotMask * alpha);
}

/* Hero → light → warm room, driven by uPortal. */
vec3 portal(vec2 frag) {
  vec2 uv = (frag - 0.5 * uResolution) / (min(uResolution.x, uResolution.y) * uSphereScale);
  float s = clamp(uPortal, 0.0, 1.0);
  float midway = sin(PI * s);
  float zoom = mix(1.0, 16.0, pow(s, 2.3));
  uv += sin(uv.yx * 5.0 + uTime * 0.6) * 0.012 * midway;

  float aberration = 0.022 * midway * length(uv) * 0.35;
  float warmth = smoothstep(0.5, 0.9, s);
  vec3 col = vec3(0.0);
  if (warmth < 1.0) {
    if (aberration > 0.0005) {
      col = vec3(portalScene(uv * (1.0 + aberration), zoom).r,
                 portalScene(uv, zoom).g,
                 portalScene(uv * (1.0 - aberration), zoom).b);
    } else {
      col = portalScene(uv, zoom);
    }
  }
  col = mix(col, warmRoom(frag, smoothstep(0.82, 1.0, s)), warmth);
  vec2 vignette = frag / uResolution - 0.5;
  return col * mix(1.0 - dot(vignette, vignette) * 0.8, 1.0, warmth);
}

/* ---------- 3. warm shallow reef ---------- */

vec3 water(vec2 frag) {
  vec2 uv = frag / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec3 col = mix(vec3(0.17, 0.5, 0.58), vec3(0.35, 0.71, 0.79), smoothstep(0.0, 0.55, uv.y));
  col = mix(col, vec3(0.66, 0.89, 0.92), smoothstep(0.55, 1.05, uv.y));
  col += vec3(0.09, 0.07, 0.0) * (1.0 - smoothstep(0.0, 0.4, uv.y));

  // Three wide, parallel sun rays.
  vec2 pos = vec2(uv.x * aspect, uv.y);
  float across = dot(pos, vec2(0.935, 0.355));
  float rays = 0.9 * gaussian(across, 0.42 + 0.03 * sin(uTime * 0.21), 0.1)
             + 0.6 * gaussian(across, 0.98 + 0.04 * sin(uTime * 0.17 + 1.0), 0.15)
             + 0.45 * gaussian(across, 1.5 + 0.03 * sin(uTime * 0.13 + 2.0), 0.09);
  rays *= (0.45 + 0.55 * smoothstep(0.0, 1.0, uv.y)) * (0.85 + 0.15 * sin(uTime * 0.35 + across * 2.0));
  col += vec3(1.0, 0.97, 0.86) * rays * 0.2;

  // Slow floating specks.
  vec2 grid = pos * 18.0 + vec2(sin(uTime * 0.1) * 0.5, -uTime * 0.12);
  vec2 cell = floor(grid);
  float speck = (1.0 - smoothstep(0.0, 0.06, length(fract(grid) - (vec2(hash(cell), hash(cell + 1.3)) * 0.8 + 0.1))))
              * step(0.86, hash(cell + 6.0));
  col += vec3(1.0, 1.0, 0.95) * speck * 0.22;

  vec2 vignette = uv - 0.5;
  return col * (1.0 - dot(vignette, vignette) * 0.35);
}

/* ---------- 4. dawn sky ---------- */

vec3 dawn(vec2 frag) {
  vec2 uv = frag / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec3 col = mix(vec3(1.0, 0.86, 0.74), vec3(0.97, 0.76, 0.8), smoothstep(0.0, 0.42, uv.y));
  col = mix(col, vec3(0.72, 0.72, 0.9), smoothstep(0.45, 1.15, uv.y));
  col += vec3(1.0, 0.9, 0.76) * exp(-length(vec2((uv.x - 0.5) * aspect, uv.y + 0.06)) * 3.2) * 0.45;
  float clouds = fbm(vec2(uv.x * 2.2 * aspect + uTime * 0.012, uv.y * 8.0));
  clouds = smoothstep(0.55, 0.8, clouds) * smoothstep(0.08, 0.3, uv.y) * (1.0 - smoothstep(0.55, 0.8, uv.y));
  return mix(col, vec3(1.0, 0.85, 0.87), clouds * 0.4);
}

/* Water running down the "lens" after surfacing. Returns xy = refraction offset, z = strength. */
vec3 dripColumn(vec2 frag, float surface, float column, float fade, float k) {
  float r1 = hash(vec2(column, 3.1));
  float r2 = hash(vec2(column, 5.7));
  float r3 = hash(vec2(column, 8.3));
  float r4 = hash(vec2(column, 1.9));
  if (r1 < 0.25) return vec3(0.0);
  float t = uDripTime - r4 * 0.45;
  if (t < 0.0) return vec3(0.0);

  float centreX = (column + 0.2 + 0.6 * r2) * uResolution.x / uDripColumns;
  float wx = frag.x - centreX + sin(frag.y * 0.018 / k + r2 * 6.0) * 5.0 * k;
  float width = (11.0 + 14.0 * r3) * k;
  float head = uResolution.y - t * (0.3 + 0.4 * r1) * uResolution.y;
  float aboveSurface = smoothstep(surface - 90.0 * k, surface + 90.0 * k, frag.y);
  float trail = smoothstep(head - 8.0 * k, head + 8.0 * k, frag.y) * aboveSurface
              * exp(-(frag.y - head) / (uResolution.y * 0.2)) * exp(-wx * wx / (width * width * 0.45));
  float dy = frag.y - head;
  float drop = exp(-(wx * wx + dy * dy * 0.55) / (width * width * 1.2))
             * smoothstep(surface - 90.0 * k, surface + 90.0 * k, head);
  float strength = max(trail * 0.85, drop) * fade;
  float slope = wx / width * exp(-wx * wx / (width * width * 0.9));
  return vec3(slope * strength * 16.0 * k, strength * 8.0 * k, strength);
}

vec3 drips(vec2 frag, float surface) {
  if (uDripTime < 0.0) return vec3(0.0);
  float fade = 1.0 - smoothstep(uRiseDuration, uRiseDuration + 1.2, uDripTime);
  if (fade <= 0.0) return vec3(0.0);
  float k = pixelScale();
  float column = floor(frag.x / uResolution.x * uDripColumns);
  vec3 strongest = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    vec3 c = dripColumn(frag, surface, column + float(i), fade, k);
    if (c.z > strongest.z) strongest = c;
  }
  return strongest;
}

/* ---------- 5. text dissolving into white particles ---------- */

float dissolveThreshold(vec2 p) {
  float k = pixelScale();
  return noise(p * 0.02 / k) * 0.55 + hash(floor(p / (1.5 * k))) * 0.45;
}

vec4 sampleText(vec2 p) {
  return texture2D(uTexture, vec2(p.x / uResolution.x, 1.0 - p.y / uResolution.y));
}

/* Returns the intact text (rgba) and writes particle coverage to "particles". */
vec4 dissolve(vec2 frag, out float particles) {
  particles = 0.0;
  if (uHasTexture < 0.5) return vec4(0.0);

  float k = pixelScale();
  vec2 p = frag + vec2(0.0, uRise * uResolution.y * 0.9);  // text travels down while surfacing
  float threshold = uDust * 1.25;
  vec4 intact = vec4(0.0);

  float local = dissolveThreshold(p);
  if (local > threshold) {
    vec4 t = sampleText(p);
    float whiten = (1.0 - smoothstep(0.0, 0.14, local - threshold)) * step(0.001, uDust);
    intact = vec4(mix(t.rgb, vec3(1.0), whiten), t.a);
  }
  if (uDust <= 0.0) return intact;

  // Particles fly in every direction; each layer has its own speed.
  for (int i = 0; i < 4; i++) {
    float layer = float(i);
    float speed = (55.0 + 45.0 * layer) * k;
    vec2 origin = p;
    for (int j = 0; j < 3; j++) {
      float age = max(threshold - dissolveThreshold(origin), 0.0);
      float heading = noise(origin * 0.006 / k + layer * 13.7) * 4.0 * PI;
      origin = p - vec2(cos(heading), sin(heading)) * speed * age - vec2(0.0, 22.0 * k) * age;
    }
    float age = threshold - dissolveThreshold(origin);
    if (age > 0.0 && age < 1.0) {
      float grain = step(0.5, hash(floor(origin / (1.6 * k)) + layer * 7.0));
      particles = max(particles, sampleText(origin).a * grain * pow(1.0 - age, 1.5));
    }
  }
  return intact;
}

/* ---------- soap bubbles ---------- */

vec3 bubble(vec3 col, vec2 frag, vec4 b, float seed) {
  if (b.w <= 0.0 || b.z <= 0.0) return col;
  vec2 p = frag - b.xy;
  float r = length(p);
  if (r > b.z * 1.12) return col;

  float angle = atan(p.y, p.x);
  float wobble = 1.0 + 0.035 * sin(3.0 * angle + uTime * 0.9 + seed)
                     + 0.025 * sin(5.0 * angle - uTime * 1.3 + seed * 2.0)
                     + 0.02 * sin(2.0 * angle + uTime * 0.6 + seed * 3.0);
  float d = r / (b.z * wobble);
  float inside = 1.0 - smoothstep(0.985, 1.004, d);

  // Refraction re-shades the water, so it is skipped for the screen-filling bubble.
  if (uRefractWater > 0.5 && b.z < uResolution.y) {
    col = mix(col, water(frag - p * (0.16 * d * d)), inside * b.w);
  }

  float rimD = (d - 1.0) / 0.012;
  float film = pow(clamp(d, 0.0, 1.0), 5.0) * inside * 0.8 + exp(-rimD * rimD) * 0.9;
  vec2 sp = p / b.z * 1.8 + vec2(uTime * 0.12 + seed, -uTime * 0.09);
  float sheen = 0.62 * noise(sp) + 0.38 * noise(sp * 2.03 + 7.0);
  vec3 filmColor = mix(vec3(0.62, 0.86, 1.0), vec3(1.0), smoothstep(0.3, 0.75, sheen));
  col += filmColor * film * 0.5 * b.w;

  vec2 hp = p / (b.z * wobble);
  vec2 h1 = (hp - vec2(-0.4, 0.44)) * vec2(1.0, 1.7);
  vec2 h2 = hp - vec2(0.4, -0.46);
  float highlights = exp(-dot(h1, h1) / 0.03) * 0.7 + exp(-dot(h2, h2) / 0.006) * 0.7;
  return col + vec3(1.0) * highlights * inside * b.w;
}

/* ---------- composition ---------- */

void main() {
  vec2 frag = gl_FragCoord.xy;
  float width = uResolution.x;
  float height = uResolution.y;
  float k = pixelScale();
  vec3 col;

  if (uRise > 0.0) {
    // Surfacing: a wide, refracting band of water moves down the screen.
    float band = height * 0.2;
    float surface = mix(1.35, -0.35, uRise) * height;
    float flow = fbm(vec2(frag.x * 0.004 / k, frag.y * 0.003 / k + uTime * 1.3));
    float dy = frag.y - surface + (flow - 0.5) * band * 0.9;
    float bell = exp(-(dy / band) * (dy / band) * 2.0);
    vec2 offset = vec2((noise(vec2(frag.x * 0.02 / k, frag.y * 0.008 / k + uTime * 2.0)) - 0.5) * 40.0 * k,
                       (flow - 0.5) * 60.0 * k) * bell;
    float mixToSky = smoothstep(-band * 0.8, band * 0.8, dy);
    vec3 drip = drips(frag, surface - (flow - 0.5) * band * 0.9);
    vec3 sky = mixToSky > 0.0 ? dawn(frag + offset + drip.xy + vec2(0.0, (1.0 - uRise) * height * 0.35)) : vec3(0.0);
    vec3 sea = mixToSky < 1.0 ? water(frag + offset + vec2(0.0, uRise * height * 0.3)) : vec3(0.0);
    col = mix(sea, sky, mixToSky);
    col = col * (1.0 - drip.z * 0.07) + vec3(1.0) * drip.z * 0.2;
    col += vec3(1.0) * smoothstep(0.62, 0.9, fbm(vec2(frag.x * 0.02 / k, frag.y * 0.003 / k + uTime * 1.6))) * bell * 0.22;
    col = mix(col, col * 1.06 + vec3(0.03, 0.05, 0.06), bell * 0.4);
  } else if (uDive >= 1.0) {
    col = water(frag);
  } else if (uDive <= 0.0) {
    col = portal(frag);
  } else {
    // Diving: the same refracting band, but vertical and moving from the left.
    float band = width * 0.16;
    float edge = mix(-0.35, 1.35, uDive) * width;
    float flow = fbm(vec2(frag.x * 0.003 / k, frag.y * 0.004 / k + uTime * 1.5));
    float dx = frag.x - edge + (flow - 0.5) * band * 0.9;
    float bell = exp(-(dx / band) * (dx / band) * 2.0);
    vec2 offset = vec2((flow - 0.5) * 70.0 * k,
                       (noise(vec2(frag.x * 0.02 / k, frag.y * 0.01 / k + uTime * 2.0)) - 0.5) * 30.0 * k) * bell;
    float mixToRoom = smoothstep(-band * 0.8, band * 0.8, dx);
    vec3 sea = mixToRoom < 1.0 ? water(frag + offset + vec2((1.0 - uDive) * width * 0.3, 0.0)) : vec3(0.0);
    vec3 room = mixToRoom > 0.0 ? portal(frag + offset - vec2(uDive * width * 0.35, 0.0)) : vec3(0.0);
    col = mix(sea, room, mixToRoom);
    col += vec3(1.0) * smoothstep(0.62, 0.9, fbm(vec2(frag.x * 0.02 / k, frag.y * 0.003 / k + uTime * 1.6))) * bell * 0.22;
    col = mix(col, col * 1.06 + vec3(0.03, 0.05, 0.06), bell * 0.4);
  }

  for (int i = 0; i < 6; i++) {
    col = bubble(col, frag, uBubbles[i], float(i) * 1.7);
  }

  float particles;
  vec4 text = dissolve(frag, particles);
  col = mix(col, text.rgb, text.a);
  col = mix(col, vec3(1.0), particles);

  col += (hash(frag + fract(uTime) * 100.0) - 0.5) * 0.016;  // film grain against banding
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
