import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SharedShader from './SharedShader'
import { RIVER, WATERFALL } from './layout'
import { SKY_GLSL, world } from './uniforms'

const vertexShader = /* glsl */ `
  attribute float aSteep, aFlow;
  varying vec2 vRiver;
  varying float vSteep;
  varying vec3 vWorld;
  void main() {
    vRiver = vec2(uv.x, aFlow);
    vSteep = aSteep;
    vWorld = position;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`
const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  uniform float uTime, uRain, uFogNear, uFogFar;
  varying vec2 vRiver;
  varying float vSteep;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    float across = vRiver.x * 2.0 - 1.0;
    // Water runs fastest in mid-channel and lags at the banks.
    float speed = (1.0 + vSteep * 5.0) * (1.0 - across * across * 0.55) * (1.0 + uRain * 0.5);
    vec2 flow = vec2(vRiver.x * 7.0, vRiver.y * 0.75 - uTime * speed * 1.5);
    float a = noise(flow * vec2(1.2, 0.5));
    float b = noise(flow * vec2(2.8, 0.9) + a * 1.2);
    float c = noise(flow * vec2(6.5, 1.7) + b * 0.9);

    vec3 n = normalize(vec3((a - 0.5) * 0.5 + (b - 0.5) * 0.3, 1.0, (c - 0.5) * 0.5 + (b - 0.5) * 0.3));
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 view = toCam / dist;

    float daylight = 0.14 + 0.86 * (1.0 - uNight);
    vec3 body = mix(vec3(0.05, 0.3, 0.36), vec3(0.2, 0.62, 0.58), abs(across) * 0.8) * daylight * (1.0 - uCloud * 0.35);
    float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(view, n), 0.0), 5.0);
    vec3 refl = reflect(-view, n);
    refl.y = abs(refl.y);
    vec3 col = mix(body, skyGradient(refl), fresnel * 0.85);
    col += uSunColor * pow(max(dot(refl, uSunDir), 0.0), 180.0) * 2.2 * smoothstep(-0.03, 0.05, uSunDir.y) * (1.0 - uCloud);

    // White water on the falls and rapids, plus thin foam lines along the banks.
    float churn = smoothstep(0.03, 0.5, vSteep);
    float white = churn * smoothstep(0.15, 0.62, b * 0.6 + c * 0.5 + churn * 0.25);
    white += smoothstep(0.78, 1.0, abs(across)) * smoothstep(0.45, 0.7, c);
    white += smoothstep(0.74, 0.92, c * 0.6 + b * 0.5) * 0.32;
    col = mix(col, vec3(0.93, 0.97, 1.0) * (0.3 + 0.7 * daylight), clamp(white, 0.0, 1.0));

    col = mix(col, uHorizon, smoothstep(uFogNear, uFogFar, dist));
    float edge = smoothstep(1.0, 0.8, abs(across));
    gl_FragColor = vec4(col, edge * mix(0.9, 1.0, clamp(white + churn, 0.0, 1.0)));
    #include <colorspace_fragment>
  }
`

function ribbon() {
  const positions = [], uvs = [], steep = [], flow = [], indices = []
  const CROSS = 6
  let travelled = 0
  RIVER.forEach((p, i) => {
    const prev = RIVER[Math.max(i - 1, 0)], next = RIVER[Math.min(i + 1, RIVER.length - 1)]
    const dx = next.x - prev.x, dz = next.z - prev.z, flat = Math.hypot(dx, dz) || 1
    if (i > 0) travelled += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)
    const drop = Math.abs(next.y - prev.y) / (flat + Math.abs(next.y - prev.y))
    for (let k = 0; k <= CROSS; k++) {
      const u = k / CROSS, s = (u - 0.5) * 2 * p.w
      positions.push(p.x - (dz / flat) * s, p.y, p.z + (dx / flat) * s)
      uvs.push(u, 0)
      steep.push(drop)
      flow.push(travelled)
    }
    if (i < RIVER.length - 1) {
      for (let k = 0; k < CROSS; k++) {
        const a = i * (CROSS + 1) + k, b = a + 1, c = a + CROSS + 1, d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('aSteep', new THREE.Float32BufferAttribute(steep, 1))
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1))
  g.setIndex(indices)
  return g
}

const mistVertex = /* glsl */ `
  uniform float uTime;
  attribute vec4 aSeed;
  varying float vLife;
  void main() {
    float life = fract(uTime * (0.16 + aSeed.w * 0.14) + aSeed.z);
    vLife = life;
    vec3 p = position + vec3((aSeed.x - 0.5) * 8.0 * (0.4 + life), life * 8.0, (aSeed.y - 0.5) * 8.0 * (0.4 + life));
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_PointSize = (420.0 + 900.0 * life) / max(-mv.z, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`
const mistFragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform float uNight;
  varying float vLife;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.1, r) * sin(vLife * 3.14159) * 0.3;
    gl_FragColor = vec4(mix(vec3(1.0), uHorizon, 0.35) * (1.0 - uNight * 0.7), a);
    #include <colorspace_fragment>
  }
`

function Mist() {
  const geometry = useMemo(() => {
    const count = 42
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      positions.set([WATERFALL.x, WATERFALL.y, WATERFALL.z], i * 3)
      seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTime: world.uTime, uHorizon: world.uHorizon, uNight: world.uNight }), [])
  return (
    <points geometry={geometry} frustumCulled={false}>
      <SharedShader transparent depthWrite={false} vertexShader={mistVertex} fragmentShader={mistFragment} uniforms={uniforms} />
    </points>
  )
}

export default function River() {
  const geometry = useMemo(ribbon, [])
  const uniforms = useMemo(() => {
    const { uTop, uHorizon, uSunColor, uSunDir, uMoonDir, uNight, uCloud, uFlash, uTime, uRain, uFogNear, uFogFar } = world
    return { uTop, uHorizon, uSunColor, uSunDir, uMoonDir, uNight, uCloud, uFlash, uTime, uRain, uFogNear, uFogFar }
  }, [])
  return (
    <>
      <mesh geometry={geometry} frustumCulled={false}>
        <SharedShader transparent side={THREE.DoubleSide} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
      </mesh>
      <Mist />
    </>
  )
}
