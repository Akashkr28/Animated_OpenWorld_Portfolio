import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SharedShader from './SharedShader'
import { env } from './environment'
import { HOUSE, insideHouse, LANDMARKS, LANTERNS, PLAZA_LAMPS, landmark } from './layout'
import { heightAt, mulberry32 } from './heightfield'
import { world } from './uniforms'
import { player } from '../player/playerState'

const RAIN_BOX = 46
const EAVES = 0.7 // rain and ripples stop this far out from the walls
const HOUSE_BOUNDS = new THREE.Vector4(
  HOUSE.x - HOUSE.halfW - EAVES, HOUSE.z - HOUSE.halfD - EAVES, HOUSE.x + HOUSE.halfW + EAVES, HOUSE.z + HOUSE.halfD + EAVES,
)

function Rain({ count }) {
  const mesh = useRef()
  const uniforms = useMemo(() => ({
    uTime: world.uTime, uRain: world.uRain, uWind: world.uWind, uWindDir: world.uWindDir, uCenter: { value: new THREE.Vector3() }, uNight: world.uNight, uHouse: { value: HOUSE_BOUNDS },
  }), [])
  const geometry = useMemo(() => {
    const rand = mulberry32(3)
    const seeds = new Float32Array(count * 12), corners = new Float32Array(count * 8), index = []
    for (let i = 0; i < count; i++) {
      const s = [rand(), rand(), rand()]
      ;[[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach((c, k) => {
        seeds.set(s, (i * 4 + k) * 3)
        corners.set(c, (i * 4 + k) * 2)
      })
      const v = i * 4
      index.push(v, v + 1, v + 2, v, v + 2, v + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 12), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    g.setAttribute('aCorner', new THREE.BufferAttribute(corners, 2))
    g.setIndex(index)
    return g
  }, [count])

  useFrame(() => {
    uniforms.uCenter.value.copy(player.position)
    mesh.current.visible = env.rain > 0.01
    geometry.setDrawRange(0, Math.floor(count * 6 * Math.min(1, env.rain * 1.25)))
  })

  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false}>
      <SharedShader
        transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime, uWind;
          uniform vec2 uWindDir;
          uniform vec3 uCenter;
          uniform vec4 uHouse;
          attribute vec3 aSeed;
          attribute vec2 aCorner;
          varying float vTail;
          void main() {
            const float box = ${RAIN_BOX.toFixed(1)};
            vec2 drift = uWindDir * uWind * 11.0;
            vec3 velocity = vec3(drift.x, -(34.0 + aSeed.z * 12.0), drift.y);
            vec3 p = aSeed * box + velocity * uTime;
            // Wraps every drop into a box that travels with the player.
            p = mod(p - uCenter, box) - box * 0.5 + uCenter + vec3(0.0, 10.0, 0.0);

            // The roof keeps the rain out of the house.
            if (p.x > uHouse.x && p.x < uHouse.z && p.z > uHouse.y && p.z < uHouse.w) {
              vTail = 0.0;
              gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
              return;
            }

            // A thin ribbon between head and tail, widened in screen space.
            vec4 head = projectionMatrix * viewMatrix * vec4(p, 1.0);
            vec4 tail = projectionMatrix * viewMatrix * vec4(p - velocity * 0.045, 1.0);
            vec2 dir = normalize(tail.xy / max(tail.w, 0.01) - head.xy / max(head.w, 0.01) + 0.0001);
            vec4 at = mix(head, tail, aCorner.y);
            at.xy += vec2(-dir.y, dir.x) * aCorner.x * 0.0025 * at.w;
            vTail = aCorner.y;
            gl_Position = at;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uRain, uNight;
          varying float vTail;
          void main() {
            gl_FragColor = vec4(vec3(0.86, 0.91, 1.0) * (1.0 - uNight * 0.3), (0.68 - vTail * 0.54) * min(uRain * 1.6, 1.0));
          }`}
      />
    </mesh>
  )
}

const dummy = new THREE.Object3D()

function Splashes({ count = 110 }) {
  const mesh = useRef()
  const drops = useMemo(() => Array.from({ length: count }, () => ({ x: 0, y: -50, z: 0, age: 1, life: 0.4 })), [count])

  useFrame((_, dt) => {
    mesh.current.visible = env.rain > 0.04
    if (!mesh.current.visible) return
    drops.forEach((d, i) => {
      d.age += dt / d.life
      if (d.age >= 1 && Math.random() < env.rain * 0.85) {
        d.x = player.position.x + (Math.random() - 0.5) * 34
        d.z = player.position.z + (Math.random() - 0.5) * 34
        d.y = insideHouse(d.x, d.z, EAVES) ? -50 : Math.max(heightAt(d.x, d.z), 0) + 0.06
        d.age = 0
        d.life = 0.26 + Math.random() * 0.2
      }
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(d.age >= 1 ? 0 : 0.1 + d.age * 0.38)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <ringGeometry args={[0.86, 1, 16]} />
      <meshBasicMaterial color="#dfeaf5" transparent opacity={0.3} depthWrite={false} fog={false} />
    </instancedMesh>
  )
}

function Lightning() {
  const line = useRef()
  const last = useRef(0)
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])

  useFrame(() => {
    line.current.visible = env.flash > 0.35
    if (env.bolt === last.current) return
    last.current = env.bolt
    const a = Math.random() * 6.28, r = 120 + Math.random() * 130
    let x = player.position.x + Math.cos(a) * r, z = player.position.z + Math.sin(a) * r, y = 150
    const points = []
    while (y > 2) {
      const nx = x + (Math.random() - 0.5) * 22, nz = z + (Math.random() - 0.5) * 22, ny = y - 8 - Math.random() * 13
      points.push(x, y, z, nx, ny, nz)
      if (Math.random() < 0.22) points.push(nx, ny, nz, nx + (Math.random() - 0.5) * 34, ny - 16, nz + (Math.random() - 0.5) * 34)
      x = nx; y = ny; z = nz
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  })

  return (
    <lineSegments ref={line} geometry={geometry} frustumCulled={false} visible={false}>
      <lineBasicMaterial color="#e8ecff" fog={false} />
    </lineSegments>
  )
}

// Leaves and petals carried on the wind, plus thin streaks of moving air.
function WindParticles({ count }) {
  const mesh = useRef()
  const uniforms = useMemo(() => ({
    uTime: world.uTime, uWind: world.uWind, uWindDir: world.uWindDir, uCenter: { value: new THREE.Vector3() }, uNight: world.uNight,
  }), [])
  const geometry = useMemo(() => {
    const rand = mulberry32(17)
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    const positions = new Float32Array(count * 12), seeds = new Float32Array(count * 16), corner = new Float32Array(count * 8), kinds = new Float32Array(count * 4)
    const index = []
    for (let i = 0; i < count; i++) {
      const s = [rand(), rand(), rand(), rand()]
      const kind = i % 5 === 0 ? 1 : 0 // every fifth particle is an air streak
      corners.forEach((c, k) => {
        seeds.set(s, (i * 4 + k) * 4)
        corner.set(c, (i * 4 + k) * 2)
        kinds[i * 4 + k] = kind
      })
      const v = i * 4
      index.push(v, v + 1, v + 2, v, v + 2, v + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2))
    g.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1))
    g.setIndex(index)
    return g
  }, [count])

  useFrame(() => {
    uniforms.uCenter.value.copy(player.position)
    mesh.current.visible = env.wind > 0.12
  })

  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false}>
      <SharedShader
        transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime, uWind;
          uniform vec2 uWindDir;
          uniform vec3 uCenter;
          attribute vec4 aSeed;
          attribute vec2 aCorner;
          attribute float aKind;
          varying vec2 vUv;
          varying vec4 vSeed;
          varying float vKind, vFade;
          void main() {
            const float box = 56.0;
            float speed = (3.0 + uWind * 15.0) * (0.7 + aSeed.w * 0.6);
            vec3 w = vec3(uWindDir.x, 0.0, uWindDir.y);
            vec3 p = aSeed.xyz * vec3(box, 11.0, box) + w * uTime * speed;
            p.y += sin(uTime * 1.3 + aSeed.x * 20.0) * 0.8;
            p.xz += vec2(-w.z, w.x) * sin(uTime * 0.9 + aSeed.y * 20.0) * 1.7;
            p = vec3(mod(p.x - uCenter.x, box) - box * 0.5 + uCenter.x, mod(p.y, 11.0) + uCenter.y + 0.3, mod(p.z - uCenter.z, box) - box * 0.5 + uCenter.z);

            vec3 offset;
            if (aKind > 0.5) {
              vec3 side = vec3(0.0, 1.0, 0.0);
              float bow = aCorner.x * aCorner.x;
              offset = w * aCorner.x * (2.5 + uWind * 3.5) + side * (aCorner.y * 0.016 + bow * 0.28);
              vFade = sin(fract(uTime * 0.42 + aSeed.z) * 3.14159) * smoothstep(0.3, 0.75, uWind) * 0.5;
            } else {
              float a = uTime * (2.5 + aSeed.x * 5.0) + aSeed.z * 9.0, b = uTime * (1.5 + aSeed.y * 3.0);
              vec3 ax = vec3(cos(a), sin(a) * cos(b), sin(b));
              vec3 ay = normalize(cross(ax, vec3(0.3, 0.8, 0.5)));
              offset = (ax * aCorner.x + ay * aCorner.y * 0.6) * 0.085;
              vFade = smoothstep(0.1, 0.32, uWind);
            }
            vUv = aCorner;
            vSeed = aSeed;
            vKind = aKind;
            gl_Position = projectionMatrix * viewMatrix * vec4(p + offset, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform float uNight;
          varying vec2 vUv;
          varying vec4 vSeed;
          varying float vKind, vFade;
          void main() {
            float dim = 1.0 - uNight * 0.7;
            if (vKind > 0.5) {
              float a = (1.0 - abs(vUv.x)) * (1.0 - vUv.y * vUv.y);
              gl_FragColor = vec4(vec3(1.0) * dim, a * vFade);
            } else {
              if (length(vUv) > 1.02) discard;
              vec3 c = vSeed.x > 0.55 ? vec3(1.0, 0.6, 0.7) : mix(vec3(0.42, 0.68, 0.32), vec3(0.85, 0.62, 0.25), vSeed.y);
              gl_FragColor = vec4(c * dim, vFade);
            }
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  )
}

function Rainbow() {
  const mesh = useRef()
  const uniforms = useMemo(() => ({ uAlpha: { value: 0 } }), [])
  useFrame(() => {
    mesh.current.visible = env.rainbow > 0.01
    if (!mesh.current.visible) return
    uniforms.uAlpha.value = Math.min(1, env.rainbow * 4) * 0.6 * env.sunUp
    // Always opposite the sun, as a real one is.
    mesh.current.position.set(player.position.x - env.sun.x * 330, -74, player.position.z - env.sun.z * 330)
    mesh.current.rotation.y = Math.atan2(env.sun.x, env.sun.z)
  })
  return (
    <mesh ref={mesh} visible={false} renderOrder={1}>
      <ringGeometry args={[118, 140, 96, 1, 0, Math.PI]} />
      <SharedShader
        transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          varying float vR;
          void main() {
            vR = (length(position.xy) - 118.0) / 22.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform float uAlpha;
          varying float vR;
          void main() {
            vec3 c = 0.5 + 0.5 * cos(6.28318 * (vR * 0.85 + vec3(0.0, 0.33, 0.67)));
            gl_FragColor = vec4(c * sin(vR * 3.14159) * uAlpha, 1.0);
          }`}
      />
    </mesh>
  )
}

const pointVertex = /* glsl */ `
  uniform float uTime;
  attribute float aSize, aPhase;
  varying float vPulse;
  void main() {
    vPulse = 0.75 + 0.25 * sin(uTime * 3.0 + aPhase);
    vec4 mv = viewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * 520.0 / max(-mv.z, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

// Soft halos around every lamp, which only appear after dark.
function NightGlows() {
  const geometry = useMemo(() => {
    const spots = [
      ...PLAZA_LAMPS.map(([x, z]) => [x, heightAt(x, z) + 2.75, z, 2.6]),
      ...LANTERNS.map(([x, z]) => [x, heightAt(x, z) + 2.05, z, 2.3]),
      [-35.5, heightAt(-35.5, 3) + 2.9, 3, 2.2],
      [landmark('cove').x, heightAt(landmark('cove').x, landmark('cove').z) + 0.7, landmark('cove').z, 7],
      [landmark('isle').x, heightAt(landmark('isle').x, landmark('isle').z) + 4.6, landmark('isle').z, 9],
      [landmark('grove').x, heightAt(landmark('grove').x, landmark('grove').z) + 2, landmark('grove').z, 6],
    ]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(spots.flatMap((s) => s.slice(0, 3)), 3))
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(spots.map((s) => s[3]), 1))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(spots.map((_, i) => i * 1.7), 1))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTime: world.uTime, uNight: world.uNight, uRain: world.uRain }), [])
  return (
    <points geometry={geometry} frustumCulled={false}>
      <SharedShader
        transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms} vertexShader={pointVertex}
        fragmentShader={/* glsl */ `
          uniform float uNight, uRain;
          varying float vPulse;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = pow(max(1.0 - r, 0.0), 1.7) * max(uNight, uRain * 0.6) * vPulse;
            gl_FragColor = vec4(vec3(1.0, 0.72, 0.38) * a * 1.15, 1.0);
          }`}
      />
    </points>
  )
}

function Fireflies({ count = 160 }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(77)
    const spots = LANDMARKS.filter((l) => ['grove', 'cove', 'windmill'].includes(l.id))
    const positions = [], sizes = [], phases = []
    for (let i = 0; i < count; i++) {
      const home = i % 2 ? spots[i % spots.length] : { x: 0, z: 16 }
      const a = rand() * 6.28, r = rand() * (i % 2 ? 26 : 62)
      const x = home.x + Math.cos(a) * r, z = home.z + Math.sin(a) * r
      positions.push(x, heightAt(x, z) + 0.6 + rand() * 2.2, z)
      sizes.push(0.22 + rand() * 0.2)
      phases.push(rand() * 40)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))
    return g
  }, [count])
  const uniforms = useMemo(() => ({ uTime: world.uTime, uNight: world.uNight, uRain: world.uRain }), [])
  return (
    <points geometry={geometry} frustumCulled={false}>
      <SharedShader
        transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime;
          attribute float aSize, aPhase;
          varying float vBlink;
          void main() {
            vec3 p = position + vec3(sin(uTime * 0.5 + aPhase) * 1.4, sin(uTime * 0.8 + aPhase * 1.3) * 0.5, cos(uTime * 0.45 + aPhase) * 1.4);
            vBlink = smoothstep(0.1, 0.9, sin(uTime * 1.6 + aPhase * 3.0));
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * 300.0 / max(-mv.z, 1.0);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uNight, uRain;
          varying float vBlink;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = pow(max(1.0 - r, 0.0), 2.0) * uNight * (1.0 - uRain) * vBlink;
            gl_FragColor = vec4(vec3(0.75, 1.0, 0.4) * a, 1.0);
          }`}
      />
    </points>
  )
}

export default function Weather({ detail }) {
  return (
    <>
      <Rain count={detail ? 6500 : 2600} />
      <Splashes />
      <Lightning />
      <WindParticles count={detail ? 110 : 60} />
      <Rainbow />
      <NightGlows />
      <Fireflies />
    </>
  )
}
