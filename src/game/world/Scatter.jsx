import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useRapier } from '@react-three/rapier'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { distToPath, distToRiver, distToZone, heightAt, mulberry32, slopeAt, smoothstep } from './heightfield'
import { addSway } from './uniforms'
import FallingLeaves from './FallingLeaves'
import { buildTrees } from './trees'

function part(geometry, color, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  ))
  const c = new THREE.Color(color)
  const colors = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.deleteAttribute('uv')
  return g
}

function scatter({ seed, tries, spacing, accept }) {
  const rand = mulberry32(seed)
  const placed = []
  for (let i = 0; i < tries; i++) {
    const x = (rand() - 0.5) * 460, z = (rand() - 0.5) * 460
    if (!accept(x, z, heightAt(x, z), rand)) continue
    if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing)) continue
    placed.push({ x, z, y: heightAt(x, z), scale: 0.8 + rand() * 0.55, rot: rand() * 6.28, tint: 0.88 + rand() * 0.2 })
  }
  return placed
}

function placeInstances(mesh, items, hue = 0) {
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y - 0.05, item.z)
    dummy.rotation.set(0, item.rot, 0)
    dummy.scale.setScalar(item.scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    // Trees also drift a little warmer or cooler, so a forest isn't one flat green.
    const shift = Math.sin(item.rot * 7) * hue
    mesh.setColorAt(i, color.setRGB(item.tint * (1 + shift), item.tint, item.tint * (1 - shift)))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function Instances({ geometry, items, sway, flat = true, castShadow = true }) {
  const mesh = useRef()
  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat })
    return sway ? addSway(m, sway) : m
  }, [flat, sway])

  useLayoutEffect(() => placeInstances(mesh.current, items), [items])

  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} castShadow={castShadow} frustumCulled={false} />
}

// Each species has a few variants so neighbouring trees don't look cloned.
function Forest({ species, items }) {
  return species.variants.map((geometry, v) => {
    const mine = items.filter((_, i) => i % species.variants.length === v)
    return mine.length > 0 && <TreeInstances key={v} geometry={geometry} items={mine} species={species} />
  })
}

function TreeInstances({ geometry, items, species }) {
  const mesh = useRef()
  useLayoutEffect(() => placeInstances(mesh.current, items, 0.09), [items])
  return (
    <instancedMesh
      ref={mesh} args={[geometry, species.material, items.length]} customDepthMaterial={species.depth}
      castShadow receiveShadow frustumCulled={false}
    />
  )
}

const clear = (x, z, gap) => distToPath(x, z) > gap && distToZone(x, z) > 1.5 && distToRiver(x, z) > 1.6

// Static colliders are created directly: hundreds of React components would slow startup.
function useTreeColliders(trees, rocks) {
  const { rapier, world } = useRapier()
  useEffect(() => {
    const made = [
      ...trees.map((t) => world.createCollider(rapier.ColliderDesc.cylinder(1.6, 0.34 * t.scale).setTranslation(t.x, t.y + 1.5, t.z))),
      ...rocks.map((r) => world.createCollider(rapier.ColliderDesc.ball(0.75 * r.scale).setTranslation(r.x, r.y + 0.2, r.z))),
    ]
    return () => made.forEach((c) => world.removeCollider(c, false))
  }, [rapier, world, trees, rocks])
}

export default function Scatter({ dense }) {
  const data = useMemo(() => {
    const forest = (x) => smoothstep(-40, -95, x)
    const pines = scatter({
      seed: 11, tries: dense ? 7000 : 3500, spacing: 4.4,
      accept: (x, z, h, rand) => h > 1 && h < 21 && clear(x, z, 3.4) && slopeAt(x, z) < 0.62 && rand() < 0.14 + forest(x) * 0.8,
    })
    const blossoms = scatter({
      seed: 23, tries: 2600, spacing: 6,
      accept: (x, z, h, rand) => h > 1 && h < 12 && clear(x, z, 3.2) && (distToZone(x, z) < 11 || rand() < 0.04),
    }).filter((b) => !pines.some((p) => (p.x - b.x) ** 2 + (p.z - b.z) ** 2 < 9))
    const oaks = scatter({
      seed: 37, tries: dense ? 3000 : 1500, spacing: 8,
      accept: (x, z, h, rand) => h > 1 && h < 13 && clear(x, z, 4) && slopeAt(x, z) < 0.5 && rand() < 0.3,
    }).filter((o) => !pines.some((p) => (p.x - o.x) ** 2 + (p.z - o.z) ** 2 < 16))
    const palms = scatter({ seed: 31, tries: 9000, spacing: 7, accept: (x, z, h) => h > 0.18 && h < 0.85 && clear(x, z, 3) })
    const rocks = scatter({ seed: 47, tries: 2600, spacing: 7, accept: (x, z, h) => h > 0.1 && clear(x, z, 3) })
    const tufts = scatter({
      seed: 59, tries: dense ? 16000 : 7000, spacing: 1.5,
      accept: (x, z, h) => h > 0.9 && h < 16 && distToPath(x, z) > 2.4 && distToZone(x, z) > 0 && distToRiver(x, z) > 1,
    })
    return { pines, oaks, blossoms, palms, rocks, tufts }
  }, [dense])

  const trees = useMemo(() => [...data.pines, ...data.oaks, ...data.blossoms, ...data.palms], [data])
  useTreeColliders(trees, data.rocks)

  const kit = useMemo(() => buildTrees(dense), [dense])
  const geo = useMemo(() => ({
    rock: mergeGeometries([
      part(new THREE.DodecahedronGeometry(0.8, 0), '#9a95a8', { scale: [1, 0.72, 0.85], at: [0, 0.3, 0] }),
      part(new THREE.DodecahedronGeometry(0.42, 0), '#aca7b8', { at: [0.7, 0.14, 0.25] }),
    ]),
    tuft: mergeGeometries([
      ...Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.4
        return part(new THREE.ConeGeometry(0.035, 0.42 + (i % 3) * 0.13, 3), i % 2 ? '#6fb35a' : '#88c768', {
          at: [Math.cos(a) * 0.11, 0.24, Math.sin(a) * 0.11], rot: [Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32],
        })
      }),
      part(new THREE.IcosahedronGeometry(0.05, 0), '#ffd27a', { at: [0.09, 0.5, 0.03] }),
    ]),
  }), [])

  return (
    <>
      <Forest species={kit.pine} items={data.pines} />
      <Forest species={kit.oak} items={data.oaks} />
      <Forest species={kit.blossom} items={data.blossoms} />
      <Forest species={kit.palm} items={data.palms} />
      <FallingLeaves blossoms={data.blossoms} oaks={data.oaks} dense={dense} />
      <Instances geometry={geo.rock} items={data.rocks} />
      <Instances geometry={geo.tuft} items={data.tufts} sway={0.42} castShadow={false} />
    </>
  )
}
