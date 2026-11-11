import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '../player/playerState'
import { distToPath, distToRiver, distToZone, heightAt, meadowColor, mulberry32, slopeAt, smoothstep } from './heightfield'
import { insideHouse, nearSocial } from './layout'
import { world } from './uniforms'

// A meadow that only exists around the robot. The ground is split into cells, and each cell
// the robot walks away from is reused for one it's walking towards, so the cost stays flat.
const CELL = 6
const FILL_MS = 2.5 // the most time one frame may spend planting new cells
const SIZES = {
  full: { grid: 13, clumps: 110, blades: 5 },
  light: { grid: 9, clumps: 60, blades: 3 },
}

// A clump of curved, tapering blades, plus a small flower head that most clumps keep hidden.
function buildClump(blades) {
  const rand = mulberry32(71)
  const position = [], tip = [], phase = [], head = [], index = []
  const add = (x, y, z, t, p, h = 0) => {
    position.push(x, y, z); tip.push(t); phase.push(p); head.push(h)
    return tip.length - 1
  }
  let flower = [0, 0.7, 0]
  for (let b = 0; b < blades; b++) {
    const a = rand() * Math.PI * 2, r = b ? 0.06 + rand() * 0.22 : 0
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    const height = b ? 0.46 + rand() * 0.28 : 0.78, width = 0.03 + rand() * 0.016
    const yaw = rand() * Math.PI * 2, curve = 0.12 + rand() * 0.2, p = rand()
    const sideX = Math.cos(yaw) * width, sideZ = Math.sin(yaw) * width
    const leanX = Math.cos(a + 0.6) * curve, leanZ = Math.sin(a + 0.6) * curve
    const rows = [[0, 1], [0.4, 0.84], [0.75, 0.5]].map(([t, w]) => [
      add(x + leanX * t * t - sideX * w, height * t, z + leanZ * t * t - sideZ * w, t, p),
      add(x + leanX * t * t + sideX * w, height * t, z + leanZ * t * t + sideZ * w, t, p),
    ])
    const end = add(x + leanX, height, z + leanZ, 1, p)
    if (!b) flower = [x + leanX, height, z + leanZ, p]
    for (let i = 0; i < 2; i++) index.push(rows[i][0], rows[i][1], rows[i + 1][0], rows[i][1], rows[i + 1][1], rows[i + 1][0])
    index.push(rows[2][0], rows[2][1], end)
  }
  const [fx, fy, fz, fp] = flower
  // A small round bud reads as a flower from every side, where flat petals vanish edge-on.
  const r = 0.062
  const bud = [[r, 0, 0], [-r, 0, 0], [0, r * 0.8, 0], [0, -r * 0.8, 0], [0, 0, r], [0, 0, -r]].map(([x, y, z]) => add(fx + x, fy + y, fz + z, 1, fp, 1))
  for (const [a, b, c] of [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]) index.push(bud[a], bud[b], bud[c])
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1))
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1))
  geometry.setAttribute('aHead', new THREE.Float32BufferAttribute(head, 1))
  geometry.setIndex(index)
  return geometry
}

function buildMaterial(robot, reach) {
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
  material.customProgramCacheKey = () => 'grass'
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: world.uTime, uWind: world.uWind, uWindDir: world.uWindDir, uRobot: robot, uReach: { value: reach } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aTip, aPhase, aHead;
        attribute vec4 aRoot, aTint;
        uniform float uTime, uWind, uReach;
        uniform vec2 uWindDir;
        uniform vec3 uRobot;
        varying vec3 vGrass;`)
      // Lit like the ground beneath them, so the field reads as one surface and not as thin cards.
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `
        vec3 transformed = position;
        vec2 away = aRoot.xz - uRobot.xz;
        float near = length(away);
        float size = aRoot.w * (1.0 - smoothstep(uReach * 0.66, uReach, near));

        // The same gust fronts as the trees, broken up by faster ripples you can watch cross the field.
        float along = dot(aRoot.xz, uWindDir), across = dot(aRoot.xz, vec2(-uWindDir.y, uWindDir.x));
        float front = sin(along * 0.05 - uTime * 1.7) * 0.5 + 0.5;
        float ripple = sin(along * 0.42 - uTime * 3.2 + sin(across * 0.23) * 1.8) * 0.5 + 0.5;
        float gust = uWind * (0.35 + front * front * 1.6) * (0.5 + ripple);
        float idle = sin(uTime * 1.4 + aPhase * 6.28) * 0.06;
        float flutter = sin(uTime * 6.5 + aPhase * 23.0 + aTip * 3.0) * gust * 0.07;
        vec2 bend = uWindDir * (gust * 0.6 + idle + flutter);

        // Blades part around the robot.
        float push = 1.0 - smoothstep(0.25, 1.6, near);
        bend += away / max(near, 0.001) * push * 0.85;

        float curve = aTip * aTip;
        transformed *= size;
        transformed.xz += bend * curve * size * 0.7;
        transformed.y *= 1.0 - min(0.6, dot(bend, bend) * 0.4 * aTip);
        transformed += aRoot.xyz;
        if (aHead > 0.5 && aTint.a < 0.5) transformed = aRoot.xyz;

        // Dark at the root and bright at the tip, with gusts showing as a passing sheen.
        vGrass = aTint.rgb * mix(0.62, 1.2, aTip) * (1.0 + gust * aTip * 0.22);
        vGrass = mix(vGrass, vec3(1.0, 0.98, 0.72), aTip * aTip * 0.08);
        if (aHead > 0.5) vGrass = aTint.a < 1.5 ? vec3(1.0, 0.76, 0.26) : aTint.a < 2.5 ? vec3(0.97, 0.95, 0.98) : vec3(0.72, 0.56, 0.95);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrass;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vGrass;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);')
  }
  return material
}

function growth(x, z, h, nearEdge) {
  if (h < 0.5 || h > 16 || slopeAt(x, z) > 0.72 || insideHouse(x, z, 0.9) || nearSocial(x, z, 0.3)) return 0
  let size = smoothstep(0.5, 0.68, h) * smoothstep(16, 12, h)
  if (nearEdge) {
    const path = distToPath(x, z), zone = distToZone(x, z), river = distToRiver(x, z)
    if (path < 2 || zone < 0 || river < 1) return 0
    size *= smoothstep(2, 3.4, path) * smoothstep(0, 1.4, zone) * smoothstep(1, 2.2, river)
  }
  return size
}

function useField(dense) {
  return useMemo(() => {
    const { grid, clumps, blades } = SIZES[dense ? 'full' : 'light']
    const reach = ((grid - 1) / 2) * CELL
    const robot = { value: new THREE.Vector3() }
    const geometry = buildClump(blades)
    const count = grid * grid * clumps
    const root = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage)
    const tint = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aRoot', root)
    geometry.setAttribute('aTint', tint)
    geometry.instanceCount = count

    const half = (grid - 1) / 2
    const nearestFirst = []
    for (let x = -half; x <= half; x++) for (let z = -half; z <= half; z++) nearestFirst.push([x, z])
    nearestFirst.sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2)

    const owner = new Float64Array(grid * grid).fill(NaN)
    const slotOf = (cx, cz) => (((cx % grid) + grid) % grid) * grid + (((cz % grid) + grid) % grid)
    const color = new THREE.Color()

    function plant(cx, cz) {
      const slot = slotOf(cx, cz)
      const start = slot * clumps
      const rand = mulberry32((cx * 73856093) ^ (cz * 19349663))
      const midX = (cx + 0.5) * CELL, midZ = (cz + 0.5) * CELL
      const nearEdge = distToPath(midX, midZ) < CELL + 3.4 || distToZone(midX, midZ) < CELL + 1.4 || distToRiver(midX, midZ) < CELL + 2.2
      for (let i = 0; i < clumps; i++) {
        const x = (cx + rand()) * CELL, z = (cz + rand()) * CELL
        const y = heightAt(x, z), spin = rand(), tall = rand(), bloom = rand()
        const size = growth(x, z, y, nearEdge)
        const o = (start + i) * 4
        root.array[o] = x; root.array[o + 1] = y - 0.04; root.array[o + 2] = z
        root.array[o + 3] = size * (0.72 + tall * 0.62)
        const [r, g, b] = meadowColor(x, z)
        color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
        const shade = 0.9 + spin * 0.22
        tint.array[o] = color.r * shade; tint.array[o + 1] = color.g * shade; tint.array[o + 2] = color.b * shade
        tint.array[o + 3] = bloom < 0.02 ? 1 + Math.floor(spin * 3) : 0
      }
      owner[slot] = cx * 65536 + cz
      root.addUpdateRange(start * 4, clumps * 4)
      tint.addUpdateRange(start * 4, clumps * 4)
      root.needsUpdate = tint.needsUpdate = true
    }

    let lastX = NaN, lastZ = NaN, pending = []
    function update() {
      const cx = Math.floor(player.position.x / CELL), cz = Math.floor(player.position.z / CELL)
      if (cx !== lastX || cz !== lastZ) {
        lastX = cx; lastZ = cz
        pending = nearestFirst.map(([x, z]) => [cx + x, cz + z]).filter(([x, z]) => owner[slotOf(x, z)] !== x * 65536 + z).reverse()
      }
      const started = performance.now()
      while (pending.length && performance.now() - started < FILL_MS) plant(...pending.pop())
    }

    return { geometry, material: buildMaterial(robot, reach), robot, update }
  }, [dense])
}

export default function Grass({ dense }) {
  const field = useField(dense)

  useFrame(() => {
    field.robot.value.copy(player.position)
    field.update()
  })
  useEffect(() => () => { field.geometry.dispose(); field.material.dispose() }, [field])

  return <mesh geometry={field.geometry} material={field.material} frustumCulled={false} receiveShadow />
}
