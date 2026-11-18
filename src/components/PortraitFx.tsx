"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

/* Tunables */
const PAD = 0.18;    // extra room around the photo (fraction) so its edges can bend
const GRID_W = 192;
const BRUSH = 0.055;
const DECAY = 0.955;
const PUSH = 0.18;
const SWIRL = 0.08;
const MAX_TEX = 1600;

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision mediump float;
varying vec2 v;
uniform sampler2D uImg, uTrail;
uniform vec2 uTexel;
uniform float uTime, uPush, uSwirl, uPad, uZoom;
float T(vec2 q){ return texture2D(uTrail, q).r; }
void main(){
  vec2 e = uTexel * 1.5;
  float t = T(v);
  vec2 g = vec2(T(v + vec2(e.x, 0.)) - T(v - vec2(e.x, 0.)), T(v + vec2(0., e.y)) - T(v - vec2(0., e.y)));
  vec2 swirl = vec2(-g.y, g.x);
  vec2 wob = vec2(sin(v.y * 14. + uTime * 1.1), cos(v.x * 12. - uTime * .9)) * .006 * t;
  vec2 c = v - g * uPush + swirl * uSwirl + wob;
  vec2 u = (c - uPad) / (1. - 2. * uPad);
  vec2 m = smoothstep(vec2(0.), vec2(.004), u) * (1. - smoothstep(vec2(.996), vec2(1.), u));
  float a = m.x * m.y;
  float edge = smoothstep(.12, .72, length(u - .5));
  vec2 radial = normalize(u - .5 + vec2(.0001));
  float blur = uZoom * edge * .028;
  vec3 col = vec3(0.);
  for (int i = 0; i < 5; i++) {
    float offset = (float(i) - 2.) * .5;
    col += texture2D(uImg, clamp(u + radial * blur * offset, 0., 1.)).rgb;
  }
  col /= 5.;
  vec2 pixel = floor(gl_FragCoord.xy);
  float grain = fract(sin(dot(pixel + floor(uTime * 18.), vec2(12.9898, 78.233))) * 43758.5453);
  float cloud = fract(sin(dot(floor(pixel * .12) + floor(uTime * 4.), vec2(39.346, 11.135))) * 24634.6345);
  col += (grain - .5) * (.045 + uZoom * .09);
  col += (cloud - .5) * (.018 + uZoom * .035);
  col *= 1. - t * .1;
  gl_FragColor = vec4(col * a, a);
}`;

function backgroundUrl(el: HTMLElement) {
  const m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage);
  return m ? m[1] : null;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function setup(gl: WebGLRenderingContext) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(gl.getUniformLocation(prog, "uImg"), 0);
  gl.uniform1i(gl.getUniformLocation(prog, "uTrail"), 1);
  gl.uniform1f(gl.getUniformLocation(prog, "uPush"), PUSH);
  gl.uniform1f(gl.getUniformLocation(prog, "uSwirl"), SWIRL);
  gl.uniform1f(gl.getUniformLocation(prog, "uPad"), PAD / (1 + 2 * PAD));
  const uZoom = gl.getUniformLocation(prog, "uZoom");
  gl.uniform1f(uZoom, 0);
  const imgTex = gl.createTexture();
  const trailTex = gl.createTexture();
  for (const [unit, tex] of [[gl.TEXTURE0, imgTex], [gl.TEXTURE1, trailTex]] as const) {
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  return { imgTex, trailTex, uTime: gl.getUniformLocation(prog, "uTime"), uTexel: gl.getUniformLocation(prog, "uTexel"), uZoom };
}

/** Liquid warp on the portrait: the cursor trail bends the photo, including its edges. Reads the image from the portrait's CSS background. */
export function PortraitFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover)").matches) return;
    const host = document.querySelector<HTMLElement>(".portrait-flow__image");
    const url = host ? backgroundUrl(host) : null;
    if (!host || !url) return;

    const canvas = document.createElement("canvas");
    canvas.className = "portrait-fx";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return;
    let gfx: ReturnType<typeof setup>;
    try { gfx = setup(gl); } catch { return; }

    let cancelled = false, ready = false, dirty = false, energy = 0, lastZoom = -1;
    let lastAspect = 0, lastTextureUpdate = 0;
    const flow = host.closest<HTMLElement>(".portrait-flow");
    let GW = GRID_W, GH = GRID_W;
    let trail = new Float32Array(GW * GH);
    let bytes = new Uint8Array(GW * GH);
    let last: { x: number; y: number } | null = null;
    const image = new Image();

    const uploadImage = () => {
      const w = host.offsetWidth, h = host.offsetHeight;
      if (!w || !h) return false;
      const aspect = w / h;
      const textureLimit = Math.min(MAX_TEX, Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || MAX_TEX);
      const contentLimit = Math.max(64, Math.floor(textureLimit / (1 + 2 * PAD)));
      const cw = Math.max(8, Math.round(contentLimit * Math.min(1, aspect)));
      const ch = Math.max(8, Math.round(contentLimit * Math.min(1, 1 / aspect)));
      const src = document.createElement("canvas");
      src.width = cw; src.height = ch;
      const c2 = src.getContext("2d");
      if (!c2) return false;
      const iw = image.naturalWidth || cw, ih = image.naturalHeight || ch;
      const s = Math.max(cw / iw, ch / ih);
      c2.drawImage(image, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
      canvas.width = Math.min(textureLimit, Math.round(cw * (1 + 2 * PAD)));
      canvas.height = Math.min(textureLimit, Math.round(ch * (1 + 2 * PAD)));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gfx.imgTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      GW = GRID_W; GH = Math.max(8, Math.round((GRID_W * canvas.height) / canvas.width));
      trail = new Float32Array(GW * GH);
      bytes = new Uint8Array(GW * GH);
      energy = 0;
      lastAspect = aspect;
      gl.uniform2f(gfx.uTexel, 1 / GW, 1 / GH);
      return true;
    };

    const render = (time: number) => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gfx.trailTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GW, GH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
      gl.uniform1f(gfx.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const splat = (x: number, y: number, amp: number) => {
      const cx = x * GW, cy = y * GH, sigma = BRUSH * GW, r = Math.ceil(sigma * 2.5);
      for (let iy = Math.max(0, Math.floor(cy - r)); iy <= Math.min(GH - 1, Math.ceil(cy + r)); iy++) {
        for (let ix = Math.max(0, Math.floor(cx - r)); ix <= Math.min(GW - 1, Math.ceil(cx + r)); ix++) {
          const dx = ix - cx, dy = iy - cy;
          const i = iy * GW + ix;
          trail[i] = Math.min(1, trail[i] + amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)));
        }
      }
      energy = 1;
    };

    const tick = (time: number, dt: number) => {
      if (!ready) return;
      if (flow) {
        const rect = flow.getBoundingClientRect();
        const span = Math.max(1, flow.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / span));
        const zoom = Math.max(0, Math.min(1, progress / .72));
        if (Math.abs(zoom - lastZoom) > .001) {
          gl.uniform1f(gfx.uZoom, zoom);
          lastZoom = zoom;
          dirty = true;
        }
        const aspect = host.offsetWidth / Math.max(1, host.offsetHeight);
        if (Math.abs(aspect - lastAspect) > 0.055 && time - lastTextureUpdate > 100) {
          if (uploadImage()) {
            lastTextureUpdate = time;
            dirty = true;
          }
        }
      }
      if (energy > 0) {
        const k = Math.pow(DECAY, dt / 16.67);
        let max = 0;
        for (let i = 0; i < trail.length; i++) {
          const v = trail[i] * k;
          trail[i] = v;
          bytes[i] = (Math.min(1, v) * 255) | 0;
          if (v > max) max = v;
        }
        if (max < 0.003) { trail.fill(0); bytes.fill(0); energy = 0; }
        dirty = true;
      }
      if (dirty) { render(time); dirty = false; }
    };

    const onMove = (e: PointerEvent) => {
      if (!ready || e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { last = null; return; }
      const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      if (last) {
        const dist = Math.hypot((x - last.x) * GW, (y - last.y) * GH);
        const steps = Math.max(1, Math.ceil(dist / (BRUSH * GW * 0.5)));
        const amp = Math.min(0.38, 0.09 + dist * 0.014);
        for (let s = 1; s <= steps; s++) splat(last.x + ((x - last.x) * s) / steps, last.y + ((y - last.y) * s) / steps, amp / Math.sqrt(steps));
      } else splat(x, y, 0.08);
      last = { x, y };
    };
    const onLeave = () => { last = null; };
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { if (ready && uploadImage()) dirty = true; }, 150);
    };

    image.decoding = "async";
    canvas.style.cssText = "position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;";
    image.onload = () => {
      if (cancelled || !uploadImage()) return;
      host.appendChild(canvas);
      host.classList.add("is-fx"); // hides the CSS background, the canvas draws the photo now
      render(0);
      ready = true;
    };
    image.src = url;

    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      host.classList.remove("is-fx");
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return null;
}
