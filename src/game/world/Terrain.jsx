import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { heights, heightAt, meadowColor, meadowNoise, mulberry32, SEG, slopeAt, smoothstep, SPAN } from './heightfield'
import { PATHS, ZONES } from './layout'
import { world } from './uniforms'

const SAND = [0xf1, 0xd9, 0xa8]
const WET = [0xc9, 0xad, 0x83]

const ROCK = [0x8f, 0x8a, 0x96]
const SNOW = [0xf4, 0xf6, 0xfb]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

// Paints a square of the island. Run once for the whole map and once, sharper, for the centre.
function paintGround(size, span) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const toPx = (v) => ((v + span / 2) / span) * size

  // Base colour by height and slope at low resolution, upscaled for soft transitions.
  const low = document.createElement('canvas')
  const L = 512
  low.width = low.height = L
  const lctx = low.getContext('2d')
  const img = lctx.createImageData(L, L)
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const wx = (x / L) * span - span / 2, wz = (y / L) * span - span / 2
      const h = heightAt(wx, wz)
      const n = meadowNoise(wx, wz)
      const g = meadowColor(wx, wz)
      let c = h < 0.15 ? mix(WET, SAND, Math.max(0, (h + 0.6) / 0.75)) : mix(SAND, g, Math.min(1, (h - 0.15) / 0.5))
      if (h > 2.5) {
        const slope = slopeAt(wx, wz)
        c = mix(c, ROCK, Math.max(smoothstep(0.62, 0.95, slope), smoothstep(13, 20, h + n * 1.4)))
        c = mix(c, SNOW, smoothstep(26, 30, h + n * 1.2) * (1 - smoothstep(1.3, 1.9, slope)))
      }
      const o = (y * L + x) * 4
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255
    }
  }
  lctx.putImageData(img, 0, 0)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(low, 0, 0, size, size)

  const rand = mulberry32(7)
  const px = size / span
  for (let i = 0; i < 9000; i++) {
    const x = rand() * span - span / 2, z = rand() * span - span / 2
    const h = heightAt(x, z)
    if (h < 0.7 || h > 5 || slopeAt(x, z) > 0.5) continue
    ctx.fillStyle = rand() > 0.5 ? 'rgba(170,214,110,.3)' : 'rgba(60,120,70,.22)'
    ctx.beginPath()
    ctx.ellipse(toPx(x), toPx(z), (0.2 + rand() * 0.5) * px, (0.15 + rand() * 0.3) * px, rand() * 3, 0, 7)
    ctx.fill()
  }
  // Paths: dark edge, sandy fill, then scattered pebbles.
  ctx.lineCap = ctx.lineJoin = 'round'
  const stroke = (color, grow) => PATHS.forEach((p) => {
    ctx.strokeStyle = color
    ctx.lineWidth = (p.width + grow) * 2 * px
    ctx.beginPath()
    p.points.forEach((pt, i) => ctx[i ? 'lineTo' : 'moveTo'](toPx(pt.x), toPx(pt.z)))
    ctx.stroke()
  })
  stroke('#a98a5e', 0.3)
  stroke('#e4c992', 0)
  PATHS.forEach((p) => p.points.forEach((pt) => {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,245,215,.55)' : 'rgba(150,115,75,.4)'
      ctx.beginPath()
      ctx.arc(toPx(pt.x + (rand() - 0.5) * p.width * 1.7), toPx(pt.z + (rand() - 0.5) * p.width * 1.7), (0.08 + rand() * 0.16) * px, 0, 7)
      ctx.fill()
    }
  }))

  // Plaza paving: concentric rings of slabs.
  const { x: sx, z: sz } = ZONES.spawn
  ctx.fillStyle = '#d9c7ab'
  ctx.beginPath(); ctx.arc(toPx(sx), toPx(sz), 10.5 * px, 0, 7); ctx.fill()
  ctx.strokeStyle = '#b39c7d'
  ctx.lineWidth = 0.1 * px
  for (const r of [3, 5.5, 8, 10.5]) {
    ctx.beginPath(); ctx.arc(toPx(sx), toPx(sz), r * px, 0, 7); ctx.stroke()
    const count = Math.round(r * 3.4)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r
      ctx.beginPath()
      ctx.moveTo(toPx(sx + Math.cos(a) * (r - 2.5)), toPx(sz + Math.sin(a) * (r - 2.5)))
      ctx.lineTo(toPx(sx + Math.cos(a) * r), toPx(sz + Math.sin(a) * r))
      ctx.stroke()
    }
  }

  // Gallery and tower forecourts.
  for (const [zone, radius, fill] of [[ZONES.projects, 12.5, '#cdbfae'], [ZONES.contact, 8.5, '#d4c6ae']]) {
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.arc(toPx(zone.x), toPx(zone.z), radius * px, 0, 7); ctx.fill()
    ctx.strokeStyle = 'rgba(120,100,80,.5)'
    ctx.lineWidth = 0.14 * px
    ctx.beginPath(); ctx.arc(toPx(zone.x), toPx(zone.z), (radius - 0.7) * px, 0, 7); ctx.stroke()
  }
  return canvas
}

const CORE_SPAN = 170

// Blends a sharper texture over the portfolio zones and darkens the ground when wet.
function terrainMaterial(far, core) {
  const material = new THREE.MeshLambertMaterial({ map: far, flatShading: true })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCore = { value: core }
    shader.uniforms.uWet = world.uWet
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = position.xz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGround;\nuniform sampler2D uCore;\nuniform float uWet;')
      .replace('#include <map_fragment>', `
        vec2 coreUv = vGround / ${CORE_SPAN.toFixed(1)} + 0.5;
        float inCore = 1.0 - smoothstep(0.42, 0.5, max(abs(coreUv.x - 0.5), abs(coreUv.y - 0.5)));
        vec4 ground = mix(texture2D(map, vMapUv), texture2D(uCore, vec2(coreUv.x, 1.0 - coreUv.y)), inCore);
        diffuseColor *= ground;
        diffuseColor.rgb *= 1.0 - uWet * 0.26;`)
  }
  return material
}

export default function Terrain({ textureSize }) {
  const gl = useThree((s) => s.gl)
  const { geometry, vertices, indices, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(SPAN, SPAN, SEG, SEG)
    geometry.rotateX(-Math.PI / 2)
    const position = geometry.attributes.position
    // Plane rows run north to south after rotation, matching the height grid.
    for (let i = 0; i < position.count; i++) position.setY(i, heights[i])
    geometry.computeVertexNormals()

    const texture = (span) => {
      const t = new THREE.CanvasTexture(paintGround(textureSize, span))
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      return t
    }

    return {
      geometry,
      vertices: new Float32Array(position.array),
      indices: new Uint32Array(geometry.index.array),
      material: terrainMaterial(texture(SPAN), texture(CORE_SPAN)),
    }
  }, [gl, textureSize])

  return (
    <RigidBody type="fixed" colliders={false} friction={0.2}>
      <TrimeshCollider args={[vertices, indices]} />
      <mesh geometry={geometry} material={material} receiveShadow />
    </RigidBody>
  )
}
