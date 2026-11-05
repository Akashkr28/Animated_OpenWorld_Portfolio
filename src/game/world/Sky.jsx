import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SharedShader from './SharedShader'
import { SKY_GLSL, world } from './uniforms'

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  uniform float uTime;
  uniform vec2 uWindDir;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += noise(p) * a; p = p * 2.03 + 7.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    vec3 col = skyGradient(dir);

    // Stars, twinkling and hidden by cloud.
    vec3 g = floor(dir * 170.0);
    float star = step(0.9965, fract(sin(dot(g, vec3(12.9898, 78.233, 37.719))) * 43758.5453));
    float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + g.x * 2.0 + g.y);
    col += star * twinkle * uNight * smoothstep(0.02, 0.2, dir.y) * (1.0 - uCloud);

    float sun = max(dot(dir, uSunDir), 0.0);
    float sunVis = smoothstep(-0.06, 0.02, uSunDir.y) * (1.0 - uCloud * 0.9);
    col += uSunColor * (pow(sun, 900.0) * 1.3 + pow(sun, 24.0) * 0.28) * sunVis;

    float moon = max(dot(dir, uMoonDir), 0.0);
    float moonDisc = smoothstep(0.99955, 0.9997, moon);
    float craters = 0.82 + 0.18 * noise(dir.xy * 90.0);
    col += vec3(0.92, 0.94, 1.0) * (moonDisc * craters + pow(moon, 260.0) * 0.16) * uNight * (1.0 - uCloud * 0.85);

    // High cloud layer projected onto a plane, drifting with the wind.
    if (dir.y > 0.0) {
      vec2 p = dir.xz / (dir.y + 0.12) * 1.3 + uWindDir * uTime * 0.012;
      float density = smoothstep(0.62 - uCloud * 0.5, 0.86 - uCloud * 0.35, fbm(p));
      float shade = fbm(p * 1.6 + 3.0);
      vec3 lit = mix(uHorizon, vec3(1.0, 0.98, 0.94), 0.55 * (1.0 - uNight));
      vec3 cloud = lit * (1.0 - uCloud * 0.5 * shade - uNight * 0.55);
      col = mix(col, cloud, density * smoothstep(0.0, 0.14, dir.y) * 0.92);
    }
    col += vec3(0.75, 0.8, 1.0) * uFlash * 0.45;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export default function Sky() {
  const mesh = useRef()
  const uniforms = useMemo(() => ({
    uTop: world.uTop, uHorizon: world.uHorizon, uSunColor: world.uSunColor, uSunDir: world.uSunDir, uMoonDir: world.uMoonDir,
    uNight: world.uNight, uCloud: world.uCloud, uFlash: world.uFlash, uTime: world.uTime, uWindDir: world.uWindDir,
  }), [])
  useFrame(({ camera }) => mesh.current.position.copy(camera.position))
  return (
    <mesh ref={mesh} scale={1300} frustumCulled={false} renderOrder={-2}>
      <sphereGeometry args={[1, 32, 20]} />
      <SharedShader side={THREE.BackSide} depthWrite={false} fog={false} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}
