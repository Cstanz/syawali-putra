"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Flowmap, Geometry, Mesh, Program, Renderer, Texture, Vec2 } from "ogl";

type FlowmapImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  imagePosition?: readonly [number, number];
  distortion?: number;
  edgeBend?: number;
  shadowStrength?: number;
};

const FLOW_SIZE = 256;
const EDGE_PAD = 0.2;
const GRID_SEGMENTS = 128;
const CENTER_IMAGE_POSITION: readonly [number, number] = [0.5, 0.5];

const vertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform sampler2D tFlow;
  uniform float uEdgeBend;
  uniform float uPad;
  varying vec2 vUv;
  varying vec2 vImageUv;
  varying vec2 vFlow;

  void main() {
    vUv = uv;
    vImageUv = (uv - vec2(uPad)) / (1.0 - 2.0 * uPad);
    vFlow = texture2D(tFlow, uv).rg;
    vec2 edgeDistance = min(vImageUv, vec2(1.0) - vImageUv);
    float edgeMask = 1.0 - smoothstep(0.0, 0.18, min(edgeDistance.x, edgeDistance.y));
    vec2 bentPosition = position + vFlow * uEdgeBend * edgeMask;
    gl_Position = vec4(bentPosition, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform sampler2D tFlow;
  uniform vec2 uPlaneResolution;
  uniform vec2 uImageResolution;
  uniform vec2 uImagePosition;
  uniform vec2 uFlowTexel;
  uniform float uDistortion;
  uniform float uShadowStrength;
  varying vec2 vUv;
  varying vec2 vImageUv;
  varying vec2 vFlow;

  vec2 coverUv(vec2 uv) {
    float planeAspect = uPlaneResolution.x / max(uPlaneResolution.y, 1.0);
    float imageAspect = uImageResolution.x / max(uImageResolution.y, 1.0);
    if (planeAspect > imageAspect) {
      float visible = imageAspect / planeAspect;
      uv.y = uv.y * visible + (1.0 - visible) * uImagePosition.y;
    } else {
      float visible = planeAspect / imageAspect;
      uv.x = uv.x * visible + (1.0 - visible) * uImagePosition.x;
    }
    return uv;
  }

  void main() {
    vec3 flow = texture2D(tFlow, vUv).rgb;
    vec2 imageUv = coverUv(vImageUv - flow.xy * uDistortion);
    vec3 color = texture2D(tMap, clamp(imageUv, 0.001, 0.999)).rgb;

    vec2 flowLeft = texture2D(tFlow, vUv - vec2(uFlowTexel.x, 0.0)).rg;
    vec2 flowRight = texture2D(tFlow, vUv + vec2(uFlowTexel.x, 0.0)).rg;
    vec2 flowDown = texture2D(tFlow, vUv - vec2(0.0, uFlowTexel.y)).rg;
    vec2 flowUp = texture2D(tFlow, vUv + vec2(0.0, uFlowTexel.y)).rg;
    vec2 gradient = vec2(flowRight.x - flowLeft.x, flowUp.y - flowDown.y);
    float outsideDistance = max(max(-vImageUv.x, vImageUv.x - 1.0), max(-vImageUv.y, vImageUv.y - 1.0));
    float photoMask = 1.0 - smoothstep(0.0, 0.006, outsideDistance);
    float edgeReach = 1.0 - smoothstep(0.0, 0.2, max(0.0, outsideDistance));
    float flowMask = smoothstep(0.015, 0.28, flow.b);
    float ridge = smoothstep(0.002, 0.055, length(gradient)) * smoothstep(0.008, 0.16, flow.b);
    vec3 normal = normalize(vec3(-gradient * 4.5, 1.0));
    vec3 lightDirection = normalize(vec3(-0.48, 0.62, 0.72));
    float light = max(dot(normal, lightDirection), 0.0);
    float shadow = flowMask * uShadowStrength * 0.42 + ridge * (1.0 - light) * uShadowStrength * 0.5;
    color = color * (1.0 - shadow) + vec3(1.0) * ridge * light * uShadowStrength * 0.22;
    float outerShadow = flowMask * edgeReach * uShadowStrength * 0.46;
    vec3 result = mix(vec3(0.005), color, photoMask);
    gl_FragColor = vec4(result, max(photoMask, outerShadow));
  }
`;

function makeGrid(gl: Renderer["gl"]) {
  const side = GRID_SEGMENTS + 1;
  const positions = new Float32Array(side * side * 2);
  const uvs = new Float32Array(side * side * 2);
  const indices = new Uint16Array(GRID_SEGMENTS * GRID_SEGMENTS * 6);

  for (let y = 0; y <= GRID_SEGMENTS; y++) {
    for (let x = 0; x <= GRID_SEGMENTS; x++) {
      const vertexIndex = y * side + x;
      const offset = vertexIndex * 2;
      const u = x / GRID_SEGMENTS;
      const v = y / GRID_SEGMENTS;
      positions[offset] = u * 2 - 1;
      positions[offset + 1] = v * 2 - 1;
      uvs[offset] = u;
      uvs[offset + 1] = v;
    }
  }

  let index = 0;
  for (let y = 0; y < GRID_SEGMENTS; y++) {
    for (let x = 0; x < GRID_SEGMENTS; x++) {
      const a = y * side + x;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices.set([a, b, c, b, d, c], index);
      index += 6;
    }
  }

  return new Geometry(gl, {
    position: { size: 2, data: positions },
    uv: { size: 2, data: uvs },
    index: { size: 1, data: indices },
  });
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Responsive OGL image with a directional flowmap, gently warped edges and soft fluid shading. */
export function FlowmapImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  imagePosition = CENTER_IMAGE_POSITION,
  distortion = 0.12,
  edgeBend = 0.2,
  shadowStrength = 0.2,
}: FlowmapImageProps) {
  const [imagePositionX, imagePositionYProp] = imagePosition;
  const hostRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const image = imageRef.current;
    if (!host || !image || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const landscapeCrop = window.matchMedia("(orientation: landscape) and (max-height: 560px) and (max-width: 1000px)");
    const currentImagePositionY = () => landscapeCrop.matches ? 1 : imagePositionYProp;
    const updateImagePosition = () => {
      const y = currentImagePositionY();
      const position = program?.uniforms.uImagePosition?.value as Vec2 | undefined;
      position?.set(imagePositionX, y);
    };

    let cancelled = false;
    let raf = 0;
    let visible = true;
    let renderer: Renderer | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let geometry: Geometry | null = null;
    let program: Program | null = null;
    let mesh: Mesh | null = null;
    let flowmap: Flowmap | null = null;
    let texture: Texture | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let lastPlaneWidth = 0;
    let lastPlaneHeight = 0;
    updateImagePosition();
    landscapeCrop.addEventListener("change", updateImagePosition);
    let lastPointer: { x: number; y: number; time: number } | null = null;
    let lastActivity = performance.now();
    let pointerPressed = false;
    let pressPosition: { x: number; y: number } | null = null;
    const incomingVelocity = new Vec2();
    const mouse = new Vec2(-1, -1);
    const planeResolution = new Vec2(1, 1);
    const imageResolution = new Vec2(1, 1);
    const flowTexel = new Vec2(1 / FLOW_SIZE, 1 / FLOW_SIZE);
    const getCanvasRect = () => {
      const rect = host.getBoundingClientRect();
      return {
        left: rect.left - rect.width * EDGE_PAD,
        top: rect.top - rect.height * EDGE_PAD,
        width: Math.max(1, rect.width * (1 + EDGE_PAD * 2)),
        height: Math.max(1, rect.height * (1 + EDGE_PAD * 2)),
      };
    };

    const resize = () => {
      if (!flowmap || !program) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      if (Math.abs(width - lastPlaneWidth) < 0.05 && Math.abs(height - lastPlaneHeight) < 0.05) return;
      lastPlaneWidth = width;
      lastPlaneHeight = height;
      // Update only the crop/flow aspect here. Resizing the drawing buffer while GSAP
      // expands this image makes its pixel density jump and causes a visible shimmer.
      planeResolution.set(width, height);
      flowmap.aspect = width / height;
      schedule();
    };

    const onWindowResize = () => {
      if (!renderer) return;
      updateImagePosition();
      // The buffer tracks the viewport, whose size is stable during the scroll zoom.
      renderer.setSize(window.innerWidth * (1 + EDGE_PAD * 2), window.innerHeight * (1 + EDGE_PAD * 2));
      resize();
    };

    const schedule = () => {
      if (!cancelled && visible && !document.hidden && !raf) raf = window.requestAnimationFrame(renderFrame);
    };

    const renderFrame = () => {
      raf = 0;
      if (cancelled || !visible || document.hidden || !renderer || !program || !flowmap) return;

      if (pointerPressed && pressPosition) {
        mouse.set(pressPosition.x, 1 - pressPosition.y);
      } else if (lastPointer && performance.now() - lastPointer.time < 90) {
        const rect = getCanvasRect();
        const x = (lastPointer.x - rect.left) / Math.max(1, rect.width);
        const y = (lastPointer.y - rect.top) / Math.max(1, rect.height);
        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) mouse.set(x, 1 - y);
        else mouse.set(-1, -1);
      } else {
        mouse.set(-1, -1);
      }

      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(incomingVelocity, incomingVelocity.len() > 0.001 ? 0.24 : 0.1);
      incomingVelocity.set(0, 0);
      // Advance the ping-pong flow textures before drawing the image. Without this,
      // pointer coordinates update but the distortion field itself stays frozen.
      flowmap.update();
      if (mesh) renderer.render({ scene: mesh });
      if (performance.now() - lastActivity < 2200) schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = getCanvasRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) / Math.max(1, rect.height);
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        lastPointer = null;
        pointerPressed = false;
        pressPosition = null;
        incomingVelocity.set(0, 0);
        mouse.set(-1, -1);
        return;
      }

      const now = performance.now();
      lastActivity = now;
      if (lastPointer) {
        const delta = Math.max(14, now - lastPointer.time);
        incomingVelocity.set(
          clamp((event.clientX - lastPointer.x) / delta, -0.65, 0.65),
          clamp((event.clientY - lastPointer.y) / delta, -0.65, 0.65),
        );
      }
      lastPointer = { x: event.clientX, y: event.clientY, time: now };
      if (pointerPressed) pressPosition = { x, y };
      schedule();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !flowmap) return;
      const photoRect = host.getBoundingClientRect();
      if (event.clientX < photoRect.left || event.clientX > photoRect.right || event.clientY < photoRect.top || event.clientY > photoRect.bottom) return;
      const rect = getCanvasRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) / Math.max(1, rect.height);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;

      const now = performance.now();
      pointerPressed = true;
      pressPosition = { x, y };
      lastPointer = { x: event.clientX, y: event.clientY, time: now };
      mouse.set(x, 1 - y);
      lastActivity = now;
      schedule();
    };

    const onPointerUp = () => {
      if (!pointerPressed) return;
      pointerPressed = false;
      pressPosition = null;
      lastActivity = performance.now();
      schedule();
    };

    const onPointerLeave = () => {
      lastPointer = null;
      pointerPressed = false;
      pressPosition = null;
      incomingVelocity.set(0, 0);
      mouse.set(-1, -1);
    };

    const onVisibilityChange = () => {
      if (document.hidden && raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      } else {
        lastActivity = performance.now();
        schedule();
      }
    };

    const boot = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;
      try {
        // Create a fresh canvas for each effect lifecycle. This also survives React Strict Mode's
        // development-only setup/cleanup replay after the previous WebGL context was released.
        canvas = document.createElement("canvas");
        canvas.className = "flowmap-image__canvas";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        renderer = new Renderer({
          canvas,
          width: window.innerWidth * (1 + EDGE_PAD * 2),
          height: window.innerHeight * (1 + EDGE_PAD * 2),
          alpha: true,
          antialias: true,
          depth: false,
          dpr: Math.min(window.devicePixelRatio || 1, 1.6),
          powerPreference: "high-performance",
        });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        flowmap = new Flowmap(gl, { size: FLOW_SIZE, falloff: 0.34, alpha: 0.82, dissipation: 0.96 });
        for (const target of [flowmap.mask.read, flowmap.mask.write]) {
          gl.renderer.bindFramebuffer({ buffer: target.buffer });
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.renderer.bindFramebuffer();
        texture = new Texture(gl, { image, generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR });
        geometry = makeGrid(gl);
        imageResolution.set(image.naturalWidth, image.naturalHeight);
        program = new Program(gl, {
          vertex,
          fragment,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            tMap: { value: texture },
            tFlow: flowmap.uniform,
            uPad: { value: EDGE_PAD / (1 + EDGE_PAD * 2) },
            uPlaneResolution: { value: planeResolution },
            uImageResolution: { value: imageResolution },
            uImagePosition: { value: new Vec2(imagePositionX, currentImagePositionY()) },
            uFlowTexel: { value: flowTexel },
            uDistortion: { value: distortion },
            uEdgeBend: { value: edgeBend },
            uShadowStrength: { value: shadowStrength },
          },
        });
        mesh = new Mesh(gl, { geometry, program, mode: gl.TRIANGLES, frustumCulled: false });
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();
        renderer.render({ scene: mesh });
        host.classList.add("is-flowmap-ready");
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) {
            lastActivity = performance.now();
            schedule();
          }
          else if (raf) {
            window.cancelAnimationFrame(raf);
            raf = 0;
          }
        });
        intersectionObserver.observe(host);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("pointerup", onPointerUp, { passive: true });
        window.addEventListener("pointercancel", onPointerUp, { passive: true });
        window.addEventListener("pointerleave", onPointerLeave);
        window.addEventListener("blur", onPointerLeave);
        window.addEventListener("resize", onWindowResize, { passive: true });
        document.addEventListener("visibilitychange", onVisibilityChange);
        schedule();
      } catch {
        host.classList.remove("is-flowmap-ready");
        if (canvas) {
          const gl = renderer?.gl;
          gl?.getExtension("WEBGL_lose_context")?.loseContext();
          canvas.remove();
          canvas = null;
        }
      }
    };

    if (image.complete) boot();
    else image.addEventListener("load", boot, { once: true });

    return () => {
      cancelled = true;
      landscapeCrop.removeEventListener("change", updateImagePosition);
      if (raf) window.cancelAnimationFrame(raf);
      image.removeEventListener("load", boot);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", onWindowResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      geometry?.remove();
      program?.remove();
      if (flowmap && renderer) {
        const gl = renderer.gl;
        flowmap.mesh.geometry.remove();
        flowmap.mesh.program.remove();
        for (const target of new Set([flowmap.mask.read, flowmap.mask.write])) {
          if (!target) continue;
          gl.deleteFramebuffer(target.buffer);
          for (const targetTexture of target.textures) gl.deleteTexture(targetTexture.texture);
        }
      }
      if (texture && renderer) renderer.gl.deleteTexture(texture.texture);
      texture = null;
      flowmap = null;
      host.classList.remove("is-flowmap-ready");
      const gl = renderer?.gl ?? canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas?.remove();
    };
  }, [distortion, edgeBend, imagePositionX, imagePositionYProp, shadowStrength, src]);

  return (
    <div ref={hostRef} className={`flowmap-image ${className}`.trim()}>
      <Image ref={imageRef} src={src} alt={alt} fill sizes={sizes} priority={priority} className="flowmap-image__fallback" style={{ objectPosition: `${imagePositionX * 100}% ${imagePositionYProp * 100}%` }} />
    </div>
  );
}
