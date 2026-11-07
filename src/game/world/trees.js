import * as THREE from 'three'
import { mulberry32 } from './heightfield'
import { addTreeSway, world } from './uniforms'

// One painted atlas supplies every tree, so realistic foliage costs no image downloads.
const TILE = 512
const COLS = 3, ROWS = 2
const NEEDLES = 0, LEAVES = 1, BLOSSOM = 2, FROND = 3, BARK = 4

function paintNeedles(ctx, rand) {
  const greens = ['#1d4a2d', '#27593a', '#2f6b3f', '#3a7d48', '#4b8f50']
  ctx.lineCap = 'round'
  const twig = (x, y, angle, length, width) => {
    const ex = x + Math.cos(angle) * length, ey = y + Math.sin(angle) * length
    ctx.strokeStyle = '#3b2c20'
    ctx.lineWidth = width
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke()
    const count = Math.round(length / 3.2)
    for (let i = 0; i < count; i++) {
      const t = i / count, px = x + (ex - x) * t, py = y + (ey - y) * t
      for (const side of [-1, 1]) {
        const a = angle + side * (0.5 + rand() * 0.35), l = 17 + rand() * 11
        ctx.strokeStyle = greens[Math.floor(rand() * greens.length)]
        ctx.lineWidth = 1.7 + rand() * 1.5
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke()
      }
    }
  }
  const mid = TILE / 2
  for (let i = 0; i < 24; i++) {
    const t = i / 24, y = TILE * 0.95 - t * TILE * 0.86
    const reach = TILE * 0.42 * Math.sin(Math.min(1, (1 - t) * 1.25 + 0.06) * Math.PI * 0.62)
    for (const side of [-1, 1]) twig(mid, y, -Math.PI / 2 + side * (0.72 + rand() * 0.22), reach * (0.8 + rand() * 0.3), 3)
  }
  twig(mid, TILE * 0.97, -Math.PI / 2, TILE * 0.92, 5)
}

function paintCluster(ctx, rand, count, draw) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * TILE * 0.44 * (0.82 + Math.sin(a * 5) * 0.12)
    draw(TILE / 2 + Math.cos(a) * r, TILE / 2 + Math.sin(a) * r, r / (TILE * 0.44), i / count)
  }
}

function paintLeaves(ctx, rand) {
  const colors = ['#2f6a2f', '#3b7d33', '#4c8f3a', '#5fa045', '#73b24f']
  paintCluster(ctx, rand, 420, (x, y, _, order) => {
    const a = rand() * Math.PI * 2, l = 19 + rand() * 11
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.fillStyle = colors[Math.min(4, Math.floor(order * 3.2 + rand() * 2))]
    ctx.beginPath()
    ctx.moveTo(-l, 0)
    ctx.quadraticCurveTo(0, -l * 0.55, l, 0)
    ctx.quadraticCurveTo(0, l * 0.55, -l, 0)
    ctx.fill()
    ctx.strokeStyle = 'rgba(25,55,25,.5)'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(l, 0); ctx.stroke()
    ctx.restore()
  })
}

function paintBlossom(ctx, rand) {
  const petals = ['#f7a6c1', '#ffbdd2', '#ffd3e1', '#ffe6ee']
  paintCluster(ctx, rand, 150, (x, y) => {
    ctx.fillStyle = '#c96f90'
    ctx.beginPath(); ctx.arc(x, y, 21, 0, 7); ctx.fill()
  })
  paintCluster(ctx, rand, 330, (x, y, _, order) => {
    const size = 9 + rand() * 5
    ctx.fillStyle = petals[Math.min(3, Math.floor(order * 3 + rand() * 1.6))]
    const turn = rand() * 6
    for (let k = 0; k < 5; k++) {
      const a = turn + (k / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(x + Math.cos(a) * size * 0.8, y + Math.sin(a) * size * 0.8, size * 0.72, size * 0.5, a, 0, 7)
      ctx.fill()
    }
    ctx.fillStyle = '#d6577c'
    ctx.beginPath(); ctx.arc(x, y, size * 0.26, 0, 7); ctx.fill()
  })
}

function paintFrond(ctx, rand) {
  const mid = TILE / 2
  const greens = ['#2d7038', '#38823f', '#469449', '#57a654']
  ctx.lineCap = 'round'
  for (let i = 0; i < 62; i++) {
    const t = i / 62, y = TILE * 0.97 - t * TILE * 0.92
    const length = TILE * 0.46 * Math.sin(Math.min(1, t * 1.15 + 0.14) * Math.PI) ** 0.7
    for (const side of [-1, 1]) {
      ctx.strokeStyle = greens[Math.floor(rand() * greens.length)]
      ctx.lineWidth = 5 + rand() * 2.5
      const ex = mid + side * length, ey = y - length * 0.5
      ctx.beginPath(); ctx.moveTo(mid, y)
      ctx.quadraticCurveTo(mid + side * length * 0.55, y - length * 0.2, ex, ey)
      ctx.stroke()
    }
  }
  ctx.strokeStyle = '#7e8b40'
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.moveTo(mid, TILE); ctx.lineTo(mid, TILE * 0.03); ctx.stroke()
}

function paintBark(ctx, rand) {
  ctx.fillStyle = '#c4b6a6'
  ctx.fillRect(0, 0, TILE, TILE)
  for (let i = 0; i < 300; i++) {
    let x = rand() * TILE, y = rand() * TILE
    const dark = rand() > 0.38
    ctx.strokeStyle = dark ? `rgba(60,44,32,${0.16 + rand() * 0.3})` : `rgba(226,214,196,${0.14 + rand() * 0.24})`
    ctx.lineWidth = 2 + rand() * 7
    ctx.beginPath(); ctx.moveTo(x, y)
    for (let k = 0; k < 6; k++) {
      x += (rand() - 0.5) * 20
      y += 16 + rand() * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function buildAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = TILE * COLS
  canvas.height = TILE * ROWS
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rand = mulberry32(2024)
  ;[paintNeedles, paintLeaves, paintBlossom, paintFrond, paintBark].forEach((paint, tile) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect((tile % COLS) * TILE, Math.floor(tile / COLS) * TILE, TILE, TILE)
    ctx.clip()
    ctx.translate((tile % COLS) * TILE, Math.floor(tile / COLS) * TILE)
    paint(ctx, rand)
    ctx.restore()
  })

  // Empty pixels take their tile's average colour, or mipmaps would darken every leaf edge.
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let tile = 0; tile < COLS * ROWS; tile++) {
    const x0 = (tile % COLS) * TILE, y0 = Math.floor(tile / COLS) * TILE
    const sum = [0, 0, 0]
    let n = 0
    for (let y = y0; y < y0 + TILE; y += 3) {
      for (let x = x0; x < x0 + TILE; x += 3) {
        const o = (y * width + x) * 4
        if (data[o + 3] > 200) { sum[0] += data[o]; sum[1] += data[o + 1]; sum[2] += data[o + 2]; n++ }
      }
    }
    if (!n) continue
    for (let y = y0; y < y0 + TILE; y++) {
      for (let x = x0; x < x0 + TILE; x++) {
        const o = (y * width + x) * 4
        if (data[o + 3] < 16) { data[o] = sum[0] / n; data[o + 1] = sum[1] / n; data[o + 2] = sum[2] / n; data[o + 3] = 0 }
      }
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

class TreeMesh {
  positions = []; normals = []; colors = []; uvs = []; wind = []; indices = []

  vertex(p, n, c, tile, s, t, flex = 0, beat = -0.001) {
    this.wind.push(flex, beat)
    this.positions.push(p.x, p.y, p.z)
    this.normals.push(n.x, n.y, n.z)
    this.colors.push(c.r, c.g, c.b)
    this.uvs.push(((tile % COLS) + s) / COLS, (Math.floor(tile / COLS) + t) / ROWS)
    return this.positions.length / 3 - 1
  }

  tube(points, radii, color, sides = 7, flex = 0) {
    const start = this.positions.length / 3
    const across = V(1, 0, 0)
    points.forEach((p, i) => {
      const dir = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(i - 1, 0)]).normalize()
      const a = across.clone().sub(dir.clone().multiplyScalar(across.dot(dir))).normalize()
      const b = dir.clone().cross(a)
      for (let k = 0; k <= sides; k++) {
        const angle = (k / sides) * Math.PI * 2
        const n = a.clone().multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle))
        const s = Math.abs((k / sides) * 2 - 1) * 0.96 + 0.02 // mirrored, so the seam never shows
        const t = Math.abs(((p.y * 0.2) % 2) - 1) * 0.96 + 0.02
        this.vertex(p.clone().addScaledVector(n, radii[i]), n, color, BARK, s, t, flex)
      }
    })
    for (let i = 0; i < points.length - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = start + i * (sides + 1) + k, c = a + sides + 1
        this.indices.push(a, c, a + 1, a + 1, c, c + 1)
      }
    }
  }

  // A bendable foliage card. Normals point away from `center`, so light wraps the crown like a solid mass.
  card(origin, dir, side, length, width, tile, { droop = 0, segments = 1, center, near, far, flex = [0, 1] }) {
    const start = this.positions.length / 3
    const beat = Math.abs(Math.sin(origin.x * 12.9 + origin.y * 37.7 + origin.z * 78.2) * 43.758) % 1
    const color = new THREE.Color()
    for (let k = 0; k <= segments; k++) {
      const a = k / segments
      const spine = origin.clone().addScaledVector(dir, length * a).addScaledVector(UP, -droop * length * a * a)
      color.copy(near).lerp(far, a)
      for (const edge of [0, 1]) {
        const p = spine.clone().addScaledVector(side, (edge - 0.5) * width)
        const n = p.clone().sub(center).normalize().addScaledVector(UP, 0.35).normalize()
        this.vertex(p, n, color, tile, 0.01 + edge * 0.98, 0.985 - a * 0.97, flex[0] + (flex[1] - flex[0]) * a, beat)
      }
    }
    for (let k = 0; k < segments; k++) {
      const a = start + k * 2
      this.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.wind, 2))
    g.setIndex(this.indices)
    return g
  }
}

const shade = (value) => new THREE.Color(value, value, value)
const tint = (hex, value = 1) => new THREE.Color(hex).multiplyScalar(value)

function pine(rand, dense) {
  const m = new TreeMesh()
  const height = 9 + rand() * 2
  const lean = V((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5)
  const trunk = Array.from({ length: 6 }, (_, i) => V(0, (i / 5) * height, 0).addScaledVector(lean, (i / 5) ** 2))
  m.tube(trunk, [0.3, 0.24, 0.18, 0.12, 0.07, 0.015], tint('#a8805f', 1.25))

  const levels = dense ? 10 : 7, perLevel = dense ? 5 : 4
  const center = V(0, height * 0.42, 0)
  for (let l = 0; l < levels; l++) {
    const t = l / (levels - 1)
    const y = 2.3 + t * (height - 2.5)
    const length = 0.75 + (1 - t) ** 0.8 * 3
    const axis = V(0, y, 0).addScaledVector(lean, (y / height) ** 2)
    for (let b = 0; b < perLevel; b++) {
      const angle = (b / perLevel) * Math.PI * 2 + l * 1.3 + rand() * 0.5
      const out = V(Math.cos(angle), 0.22 * t - 0.2 * (1 - t) + (rand() - 0.5) * 0.14, Math.sin(angle)).normalize()
      const flat = V(-Math.sin(angle), 0, Math.cos(angle))
      const lit = 0.72 + t * 0.34
      for (const roll of dense ? [-0.55, 0.55] : [0.3]) {
        const side = flat.clone().multiplyScalar(Math.cos(roll)).addScaledVector(UP, Math.sin(roll))
        m.card(axis, out, side, length, length * 0.92, NEEDLES, {
          droop: 0.13 * (1 - t) + 0.03, segments: 2, center, near: shade(lit * 0.55), far: shade(lit * 1.14),
        })
      }
    }
  }
  return m.geometry()
}

// A forked, slightly crooked branching structure. Returns the twig ends to hang foliage on.
function branches(m, rand, start, dir, length, radius, depth, color, ends) {
  const mid = start.clone().addScaledVector(dir, length * 0.5).add(V((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3) .multiplyScalar(length * 0.5))
  const end = start.clone().addScaledVector(dir, length).add(V((rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4).multiplyScalar(length * 0.5))
  m.tube([start, mid, end], [radius, radius * 0.82, radius * 0.62], color, depth > 1 ? 6 : 4, (3 - depth) * 0.14)
  if (depth === 0) { ends.push(end); return }
  const forks = depth === 3 ? 4 : 2 + (rand() > 0.55 ? 1 : 0)
  for (let i = 0; i < forks; i++) {
    const angle = (i / forks) * Math.PI * 2 + rand() * 1.2
    const spread = 0.62 + rand() * 0.3
    const next = dir.clone().addScaledVector(V(Math.cos(angle), 0, Math.sin(angle)), spread).add(V(0, 0.18, 0)).normalize()
    branches(m, rand, end, next, length * (0.66 + rand() * 0.14), radius * 0.62, depth - 1, color, ends)
  }
}

function crown(m, rand, ends, tile, cardSize, perEnd, center, low, high) {
  const top = Math.max(...ends.map((e) => e.y)), bottom = Math.min(...ends.map((e) => e.y))
  const reach = Math.max(...ends.map((e) => e.distanceTo(center)))
  for (const end of ends) {
    for (let i = 0; i < perEnd; i++) {
      const dir = V(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
      const side = dir.clone().cross(V(rand() - 0.5, rand() - 0.5, rand() - 0.5)).normalize()
      const size = cardSize * (0.8 + rand() * 0.45)
      const at = end.clone().add(V(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(cardSize * 1.05))
      const height = (at.y - bottom) / (top - bottom + 0.01)
      // Light barely reaches the middle of a crown, which gives it depth.
      const depth = 0.6 + Math.min(1, at.distanceTo(center) / reach) ** 2 * 0.5
      const c = low.clone().lerp(high, Math.min(1, height * 0.8 + rand() * 0.25)).multiplyScalar(depth)
      m.card(at.addScaledVector(dir, -size / 2), dir, side, size, size, tile, { center, near: c, far: c, flex: [0.75, 1] })
    }
  }
}

function oak(rand, dense) {
  const m = new TreeMesh()
  const ends = []
  branches(m, rand, V(0, 0, 0), V(0, 1, 0), 3 + rand() * 0.7, 0.36, 3, tint('#9a8068', 1.25), ends)
  const center = ends.reduce((c, e) => c.add(e), V(0, 0, 0)).multiplyScalar(1 / ends.length)
  center.y -= 1.3
  crown(m, rand, ends, LEAVES, 2.1, dense ? 3 : 2, center, shade(0.5), shade(1.14))
  return m.geometry()
}

function blossom(rand, dense) {
  const m = new TreeMesh()
  const ends = []
  branches(m, rand, V(0, 0, 0), V(0.08, 1, 0).normalize(), 2.2 + rand() * 0.5, 0.2, 3, tint('#7c5f5c', 1.2), ends)
  const center = ends.reduce((c, e) => c.add(e), V(0, 0, 0)).multiplyScalar(1 / ends.length)
  center.y -= 1
  crown(m, rand, ends, BLOSSOM, 1.55, dense ? 3 : 2, center, shade(0.66), shade(1.12))
  return m.geometry()
}

function palm(rand, dense) {
  const m = new TreeMesh()
  const height = 7 + rand() * 1.8, bend = 1.2 + rand() * 1.1
  const trunk = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7
    return V(t * t * bend, t * height, 0)
  })
  m.tube(trunk, [0.32, 0.23, 0.2, 0.18, 0.17, 0.16, 0.15, 0.13], tint('#c2a682', 1.2))
  const top = trunk[7]
  const count = dense ? 15 : 10
  for (let i = 0; i < count; i++) {
    const angle = i * 2.4 + rand() * 0.3
    const lift = 0.2 + (i % 3) * 0.32
    const out = V(Math.cos(angle), lift, Math.sin(angle)).normalize()
    const side = V(-Math.sin(angle), 0.12, Math.cos(angle)).normalize()
    m.card(top, out, side, 3.5 + rand() * 0.9, 1.75, FROND, {
      droop: 0.62 + rand() * 0.28, segments: 4, center: top.clone().add(V(0, -1.2, 0)), near: shade(0.72), far: shade(1.12),
    })
  }
  return m.geometry()
}

function foliageMaterial(map, sway) {
  const material = new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.42 })
  addTreeSway(material, sway)
  const bend = material.onBeforeCompile
  material.customProgramCacheKey = () => `foliage-${sway}`
  material.onBeforeCompile = (shader, renderer) => {
    bend(shader, renderer)
    Object.assign(shader.uniforms, { uFocus: world.uFocus, uSunDir: world.uSunDir, uSunColor: world.uSunColor, uNight: world.uNight, uCloud: world.uCloud })
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uFocus, uNight, uCloud;
        uniform vec3 uSunDir, uSunColor;
        varying float vLeaf;`)
      // Dissolves anything between the camera and the character, so the woods stay playable.
      .replace('#include <map_fragment>', `
        vec3 viewPos = -vViewPosition;
        float nearer = 1.0 - smoothstep(uFocus - 1.2, uFocus + 0.4, -viewPos.z);
        float corridor = 1.0 - smoothstep(1.3, 3.4, length(viewPos.xy));
        float hide = max(nearer * corridor, 1.0 - smoothstep(1.2, 3.2, -viewPos.z));
        float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (hide > dither) discard;
        #include <map_fragment>`)
      // Both faces of a card share one normal; flipping it per face makes crowns flicker.
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
      // Mipmaps thin out alpha, so distant trees would go bald without this boost.
      .replace('#include <alphatest_fragment>', `
        float texels = max(length(dFdx(vMapUv)), length(dFdy(vMapUv))) * ${(TILE * COLS).toFixed(1)};
        diffuseColor.a *= 1.0 + max(log2(max(texels, 1.0)), 0.0) * 0.32;
        #include <alphatest_fragment>`)
      // Sunlight glows through leaves when you look towards it.
      .replace('#include <opaque_fragment>', `
        vec3 sunView = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
        float facing = max(dot(normalize(vViewPosition), -sunView), 0.0);
        float glow = pow(facing, 3.0) * vLeaf * (1.0 - uNight) * (1.0 - uCloud * 0.8);
        outgoingLight += diffuseColor.rgb * uSunColor * vec3(1.0, 1.04, 0.82) * glow * 0.75;
        #include <opaque_fragment>`)
  }
  return material
}

function depthMaterial(map, sway) {
  const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.42, side: THREE.DoubleSide })
  return addTreeSway(material, sway)
}

export function buildTrees(dense) {
  const atlas = buildAtlas()
  const rand = mulberry32(99)
  const species = (make, sway) => ({
    variants: [make(rand, dense), make(rand, dense), make(rand, dense)],
    material: foliageMaterial(atlas, sway),
    depth: depthMaterial(atlas, sway),
  })
  return { pine: species(pine, 0.0016), oak: species(oak, 0.0018), blossom: species(blossom, 0.003), palm: species(palm, 0.0024) }
}
