import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SharedShader from './SharedShader'
import { heights, SEG, SPAN } from './heightfield'
import { SKY_GLSL, world } from './uniforms'
import { env } from './environment'
import { player } from '../player/playerState'

const vertexShader = /* glsl */ `
  uniform sampler2D uHeight;
  uniform float uTime, uSpan, uSea;
  uniform vec2 uCenter, uWindDir;
  varying vec3 vWorld, vNormal2;
  varying float vDepth, vCrest;

  // One Gerstner wave: points move in circles, which gives sharp crests and wide troughs.
  void gerstner(vec2 p, vec2 dir, float steep, float len, inout vec3 offset, inout vec3 normal) {
    float k = 6.28318 / len;
    float c = sqrt(9.8 / k);
    float f = k * (dot(dir, p) - c * uTime);
    float a = steep / k;
    float co = cos(f), si = sin(f);
    offset += vec3(dir.x * a * co, a * si, dir.y * a * co);
    normal.xz -= dir * steep * co;
    normal.y -= steep * si;
  }

  void main() {
    vec2 p = position.xz + uCenter;
    vDepth = texture2D(uHeight, p / uSpan + 0.5).r * 3.0 - 3.0;
    float dist = length(position.xz);
    // Waves shrink over the shallows and fade out where the grid gets coarse.
    float amp = uSea * mix(0.22, 1.0, smoothstep(-0.3, -2.6, vDepth)) * (1.0 - smoothstep(180.0, 460.0, dist));

    vec2 w = uWindDir;
    vec2 side = vec2(-w.y, w.x);
    vec3 offset = vec3(0.0), normal = vec3(0.0, 1.0, 0.0);
    gerstner(p, normalize(w + side * 0.25), 0.16 * amp, 23.0, offset, normal);
    gerstner(p, normalize(w - side * 0.45), 0.14 * amp, 13.0, offset, normal);
    gerstner(p, normalize(w + side * 0.8), 0.13 * amp, 7.5, offset, normal);
    gerstner(p, normalize(w - side * 1.2), 0.1 * amp, 4.3, offset, normal);

    vec3 pos = vec3(p.x, 0.0, p.y) + offset;
    vWorld = pos;
    vNormal2 = normal;
    vCrest = offset.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  uniform float uTime, uSea, uRain, uFogNear, uFogFar;
  uniform vec2 uWindDir;
  varying vec3 vWorld, vNormal2;
  varying float vDepth, vCrest;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  // Small ripples as a sum of analytic slopes, cheaper than a normal map and never tiles.
  vec2 ripples(vec2 p) {
    vec2 slope = vec2(0.0);
    float amp = 0.05, freq = 0.8;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 2.399 + 0.4;
      vec2 d = normalize(vec2(cos(a), sin(a)) + uWindDir * 0.9);
      slope += d * cos(dot(d, p) * freq + uTime * sqrt(freq) * 2.2) * amp;
      amp *= 0.78;
      freq *= 1.45;
    }
    return slope;
  }

  // Expanding raindrop rings, one per grid cell.
  vec2 rainRings(vec2 p) {
    vec2 cell = floor(p * 0.8);
    float seed = hash(cell);
    float life = fract(uTime * 1.1 + seed);
    vec2 centre = (cell + 0.2 + 0.6 * vec2(seed, hash(cell + 3.0))) / 0.8;
    vec2 d = p - centre;
    float r = length(d);
    float ring = sin((r - life * 1.1) * 26.0) * smoothstep(0.26, 0.0, abs(r - life * 1.1)) * (1.0 - life);
    return r > 0.001 ? d / r * ring * 0.4 : vec2(0.0);
  }

  void main() {
    vec2 p = vWorld.xz;
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 view = toCam / dist;
    float near = 1.0 - smoothstep(30.0, 240.0, dist);

    vec2 fine = ripples(p) * (0.35 + uSea * 0.9) * near;
    if (uRain > 0.02) fine += rainRings(p) * uRain * (1.0 - smoothstep(10.0, 70.0, dist));
    vec3 n = normalize(vNormal2 + vec3(-fine.x, 0.0, -fine.y));

    // Light absorption: colour deepens with depth; waves let light through near the crest.
    float depth = max(-vDepth, 0.0);
    vec3 shallow = vec3(0.24, 0.83, 0.76), deep = vec3(0.012, 0.13, 0.27);
    float daylight = 0.14 + 0.86 * (1.0 - uNight);
    vec3 body = mix(shallow, deep, 1.0 - exp(-depth * 1.15)) * daylight * (1.0 - uCloud * 0.42);
    body += shallow * smoothstep(0.0, 0.5, vCrest) * 0.2 * daylight;

    // Caustics dance over the sandy shallows.
    float caustic = pow(0.5 + 0.5 * sin(p.x * 1.7 + sin(p.y * 1.3 + uTime) * 1.6) * sin(p.y * 1.9 + sin(p.x * 1.1 - uTime * 0.8) * 1.6), 3.0);
    body += vec3(0.5, 0.65, 0.55) * caustic * exp(-depth * 1.6) * 0.35 * daylight * near;

    // Fresnel: grazing angles mirror the sky, steep angles show the water itself.
    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(view, n), 0.0), 5.0);
    vec3 refl = reflect(-view, n);
    refl.y = abs(refl.y);
    vec3 col = mix(body, skyGradient(refl), fresnel * 0.92);

    float sunSpec = pow(max(dot(refl, uSunDir), 0.0), 420.0) * 7.0 + pow(max(dot(refl, uSunDir), 0.0), 40.0) * 0.28;
    col += uSunColor * sunSpec * smoothstep(-0.03, 0.05, uSunDir.y) * (1.0 - uCloud * 0.92);
    col += vec3(0.75, 0.82, 1.0) * pow(max(dot(refl, uMoonDir), 0.0), 240.0) * 1.8 * uNight * (1.0 - uCloud * 0.85);
    col += vec3(0.5, 0.55, 0.7) * uFlash * 0.3;

    // Foam: whitecaps on crests in rough weather, and swash pushing up the shore.
    float grain = noise(p * 1.4 + uWindDir * uTime * 0.5) * 0.6 + noise(p * 4.0 - uTime * 0.25) * 0.4;
    float caps = smoothstep(0.45, 1.0, vCrest / max(uSea, 0.2) + grain * 0.5 - 0.3) * smoothstep(0.55, 1.2, uSea);
    float swash = sin(vDepth * 5.5 + uTime * 1.1 + noise(p * 0.22) * 6.0);
    float shore = smoothstep(0.35, 0.95, swash + grain * 0.5) * smoothstep(-1.5, -0.5, vDepth)
                + smoothstep(-0.32, -0.05, vDepth) * smoothstep(0.32, 0.62, grain);
    float foam = clamp(caps + shore, 0.0, 1.0);
    col = mix(col, vec3(0.94, 0.97, 0.98) * (0.3 + 0.7 * daylight), foam * 0.88);

    col = mix(col, uHorizon, smoothstep(uFogNear, uFogFar, dist));
    float alpha = max(1.0 - exp(-depth * 2.7), foam * 0.9);
    gl_FragColor = vec4(col, clamp(alpha + fresnel * 0.5, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`

// Rings get wider away from the centre, so detail stays near the player.
function discGeometry(rings, slices) {
  const positions = [0, 0, 0], indices = []
  for (let i = 1; i <= rings; i++) {
    const r = i * 0.8 + (i / rings) ** 2.6 * 1700
    for (let j = 0; j < slices; j++) {
      const a = (j / slices) * Math.PI * 2
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r)
    }
  }
  for (let j = 0; j < slices; j++) indices.push(0, 1 + ((j + 1) % slices), 1 + j)
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < slices; j++) {
      const a = 1 + i * slices + j, b = 1 + i * slices + ((j + 1) % slices)
      const c = a + slices, d = b + slices
      indices.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  return g
}

export default function Water({ detail }) {
  const material = useRef()
  const geometry = useMemo(() => discGeometry(detail ? 150 : 90, detail ? 160 : 96), [detail])
  const uniforms = useMemo(() => {
    const n = SEG + 1
    const data = new Uint8Array(n * n)
    for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, ((heights[i] + 3) / 3) * 255))
    const map = new THREE.DataTexture(data, n, n, THREE.RedFormat)
    map.magFilter = map.minFilter = THREE.LinearFilter
    map.needsUpdate = true
    const { uTop, uHorizon, uSunColor, uSunDir, uMoonDir, uNight, uCloud, uFlash, uTime, uWindDir, uRain, uFogNear, uFogFar } = world
    return {
      uHeight: { value: map }, uSpan: { value: SPAN }, uCenter: { value: new THREE.Vector2() }, uSea: { value: 0.5 },
      uTop, uHorizon, uSunColor, uSunDir, uMoonDir, uNight, uCloud, uFlash, uTime, uWindDir, uRain, uFogNear, uFogFar,
    }
  }, [])

  useFrame(() => {
    const u = material.current.uniforms
    // Snapped so the grid never slides against the waves.
    u.uCenter.value.set(Math.round(player.position.x / 8) * 8, Math.round(player.position.z / 8) * 8)
    u.uSea.value = 0.45 + env.wind * 1.15
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <SharedShader ref={material} transparent vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}
