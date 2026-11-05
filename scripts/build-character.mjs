// Generates public/models/character.glb: an original hovering guide robot with a real skeleton
// and Idle / Walk / Run / Jump / Wave clips, meshopt-compressed.
// Re-run with `npm run build:character` after editing colours or proportions.
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMaterialsUnlit, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import fs from 'node:fs'
import path from 'node:path'

const C = {
  shell: '#f4f6fa', shellShade: '#d5dbe6', joint: '#2c3a58',
  accent: '#1fb8ab', accentDark: '#14877e', coral: '#ff6a45',
  visorDeep: '#0a1a5c', visorEdge: '#1f5fe0', rim: '#58c8ff',
  glow: '#d8fbff', core: '#6ff0ff', blush: '#ff8f73', thrust: '#7fefff',
}

// Rest-pose joints (metres, ground at y=0, facing +Z). The robot floats above its origin.
const JOINTS = {
  root: { parent: null, at: [0, 0.9, 0] },
  head: { parent: 'root', at: [0, 1.07, 0] },
  antenna: { parent: 'head', at: [0, 1.72, 0] },
  eyesOpen: { parent: 'head', at: [0, 1.39, 0.4] },
  eyesHappy: { parent: 'head', at: [0, 1.39, 0.4] },
  armL: { parent: 'root', at: [0.4, 0.86, 0] },
  armR: { parent: 'root', at: [-0.4, 0.86, 0] },
  thrust: { parent: 'root', at: [0, 0.36, 0] },
}
const jointNames = Object.keys(JOINTS)

const makeBatch = () => ({ pos: [], nor: [], col: [], jnt: [], idx: [] })
const solid = makeBatch(), lit = makeBatch() // `lit` parts glow: they ignore scene lighting

function add(geometry, joint, color, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], glow = false } = {}) {
  const b = glow ? lit : solid
  let g = geometry.clone()
  g.deleteAttribute('uv')
  if (!g.index) g = mergeVertices(g, 1e-5)
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  ))
  const p = g.attributes.position, n = g.attributes.normal, base = b.pos.length / 3
  const v = new THREE.Vector3(), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    b.pos.push(v.x, v.y, v.z)
    b.nor.push(n.getX(i), n.getY(i), n.getZ(i))
    c.set(typeof color === 'function' ? color(v) : color)
    b.col.push(c.r, c.g, c.b, 1)
    b.jnt.push(jointNames.indexOf(joint), 0, 0, 0)
  }
  for (let i = 0; i < g.index.count; i++) b.idx.push(base + g.index.getX(i))
}

const box = (x, y, z, r = 0.03, seg = 3) => new RoundedBoxGeometry(x, y, z, seg, r)
const ball = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h)
const cylinder = (top, bottom, h, sides = 20) => new THREE.CylinderGeometry(top, bottom, h, sides)
const ring = (r, tube) => new THREE.TorusGeometry(r, tube, 10, 36)
const arc = (points, radius) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 14, radius, 8, false)

// A smooth body of revolution from [height, radius] rings.
function lathe(profile, segments = 30) {
  const curve = new THREE.SplineCurve(profile.map(([y, r]) => new THREE.Vector2(r, y)))
  return new THREE.LatheGeometry(curve.getPoints(profile.length * 5), segments)
}

// --- Head ---
const H = { y: 1.37, rx: 0.47, ry: 0.385, rz: 0.425 }
const surfaceZ = (x, y) => H.rz * Math.sqrt(Math.max(0.02, 1 - (x / H.rx) ** 2 - (y / H.ry) ** 2))

const skull = ball(1, 36, 26)
{
  const p = skull.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    p.setXYZ(i, p.getX(i) * H.rx, y * H.ry * (y < 0 ? 0.94 : 1), p.getZ(i) * H.rz)
  }
  skull.computeVertexNormals()
}
add(skull, 'head', C.shell, { at: [0, H.y, 0] })

// The visor is a rounded rectangle wrapped onto the face.
const VISOR = { rx: 0.355, ry: 0.235, y: 0.005 }
const visorPoint = (a, r, lift) => {
  const cx = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.6, cy = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.6
  const x = VISOR.rx * r * cx, y = VISOR.y + VISOR.ry * r * cy
  return [x, y + H.y, surfaceZ(x, y) + lift]
}
{
  const rings = 12, slices = 56, positions = [0, H.y + VISOR.y, surfaceZ(0, VISOR.y) + 0.006], indices = []
  for (let i = 1; i <= rings; i++) for (let k = 0; k < slices; k++) positions.push(...visorPoint((k / slices) * Math.PI * 2, i / rings, 0.006))
  for (let k = 0; k < slices; k++) indices.push(0, 1 + k, 1 + ((k + 1) % slices))
  for (let i = 0; i < rings - 1; i++) {
    for (let k = 0; k < slices; k++) {
      const a = 1 + i * slices + k, b = 1 + i * slices + ((k + 1) % slices)
      indices.push(a, a + slices, b, b, a + slices, b + slices)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  const deep = new THREE.Color(C.visorDeep), edge = new THREE.Color(C.visorEdge), mix = new THREE.Color()
  add(g, 'head', (v) => {
    const d = Math.hypot(v.x / VISOR.rx, (v.y - H.y - VISOR.y) / VISOR.ry)
    return `#${mix.copy(deep).lerp(edge, Math.min(1, d) ** 2.2).getHexString(THREE.SRGBColorSpace)}`
  }, { glow: true })
  const edgePoints = Array.from({ length: 56 }, (_, k) => new THREE.Vector3(...visorPoint((k / 56) * Math.PI * 2, 1, 0.012)))
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints, true), 90, 0.014, 7, true), 'head', C.rim, { glow: true })
}

// Eyes: tall ovals that blink, and happy arches for greetings.
for (const s of [1, -1]) {
  const ex = s * 0.155, ey = 0.03
  add(ball(0.06, 14, 10), 'eyesOpen', C.glow, { at: [ex, H.y + ey, surfaceZ(ex, ey) + 0.01], scale: [0.86, 1.28, 0.22], glow: true })
  const point = (dx, dy) => [ex + dx, H.y + ey + dy, surfaceZ(ex + dx, ey + dy) + 0.016]
  add(arc([point(-0.075, -0.03), point(-0.04, 0.025), point(0, 0.042), point(0.04, 0.025), point(0.075, -0.03)], 0.019), 'eyesHappy', C.glow, { glow: true })
  for (const dx of [-0.075, 0.075]) add(ball(0.019, 8, 6), 'eyesHappy', C.glow, { at: point(dx, -0.03), glow: true })
  add(ball(0.05, 12, 8), 'eyesHappy', C.blush, { at: [s * 0.255, H.y - 0.085, surfaceZ(s * 0.255, -0.085) + 0.008], scale: [1, 0.55, 0.14], glow: true })
}

// Round ear pods.
for (const s of [1, -1]) {
  add(cylinder(0.125, 0.145, 0.09, 26), 'head', C.accent, { at: [s * 0.462, H.y, 0], rot: [0, 0, s * -Math.PI / 2] })
  add(cylinder(0.07, 0.085, 0.03, 22), 'head', C.joint, { at: [s * 0.513, H.y, 0], rot: [0, 0, s * -Math.PI / 2] })
  add(ring(0.103, 0.013), 'head', C.coral, { at: [s * 0.508, H.y, 0], rot: [0, Math.PI / 2, 0] })
}
// A soft ridge across the back of the head, seen from behind.
add(ring(0.205, 0.016), 'head', C.accent, { at: [0, H.y + 0.01, -0.405], scale: [1.1, 0.82, 0.3] })
add(ball(0.05, 12, 8), 'head', C.core, { at: [0, H.y + 0.01, -0.415], scale: [1, 1, 0.3], glow: true })

// Antenna with a bobble that sways.
add(cylinder(0.05, 0.07, 0.05), 'head', C.joint, { at: [0, 1.745, 0] })
add(cylinder(0.014, 0.02, 0.17, 10), 'antenna', C.shellShade, { at: [0, 1.84, 0] })
add(ball(0.05), 'antenna', C.coral, { at: [0, 1.95, 0] })

// --- Body ---
add(cylinder(0.14, 0.16, 0.12, 22), 'root', C.joint, { at: [0, 1.03, 0] })
add(ring(0.205, 0.03), 'root', C.coral, { at: [0, 1.0, 0], rot: [Math.PI / 2, 0, 0] })
add(lathe([[0.34, 0.01], [0.37, 0.14], [0.47, 0.285], [0.62, 0.345], [0.78, 0.345], [0.92, 0.29], [1.0, 0.2], [1.01, 0.02]]), 'root', C.shell)
add(ring(0.34, 0.0075), 'root', C.joint, { at: [0, 0.6, 0], rot: [Math.PI / 2, 0, 0] })

// Chest core.
add(ring(0.096, 0.021), 'root', C.accent, { at: [0, 0.76, 0.34], rot: [-0.12, 0, 0] })
add(ball(0.082, 18, 12), 'root', C.core, { at: [0, 0.76, 0.33], rot: [-0.12, 0, 0], scale: [1, 1, 0.42], glow: true })
add(ball(0.03, 10, 8), 'root', '#ffffff', { at: [0.022, 0.782, 0.363], scale: [1, 1, 0.4], glow: true })

// Thruster pack on the back, the side visitors see most.
add(box(0.42, 0.37, 0.16, 0.07, 4), 'root', C.accent, { at: [0, 0.76, -0.345] })
add(box(0.3, 0.17, 0.05, 0.022, 3), 'root', C.accentDark, { at: [0, 0.8, -0.43] })
for (let i = 0; i < 3; i++) add(box(0.21, 0.018, 0.012, 0.006, 1), 'root', C.core, { at: [0, 0.75 + i * 0.05, -0.457], glow: true })
for (const s of [1, -1]) {
  add(cylinder(0.062, 0.088, 0.13, 18), 'root', C.joint, { at: [s * 0.125, 0.555, -0.345] })
  add(ring(0.086, 0.012), 'root', C.coral, { at: [s * 0.125, 0.575, -0.345], rot: [Math.PI / 2, 0, 0] })
  add(new THREE.CircleGeometry(0.062, 18), 'root', C.thrust, { at: [s * 0.125, 0.487, -0.345], rot: [Math.PI / 2, 0, 0], glow: true })
  add(new THREE.ConeGeometry(0.052, 0.2, 14), 'thrust', C.thrust, { at: [s * 0.125, 0.395, -0.345], rot: [Math.PI, 0, 0], glow: true })
}

// Main thruster under the body.
add(cylinder(0.12, 0.09, 0.05, 22), 'root', C.joint, { at: [0, 0.345, 0] })
add(ring(0.098, 0.012), 'root', C.accent, { at: [0, 0.325, 0], rot: [Math.PI / 2, 0, 0] })
add(new THREE.ConeGeometry(0.085, 0.27, 18), 'thrust', C.thrust, { at: [0, 0.195, 0], rot: [Math.PI, 0, 0], glow: true })

// --- Arms: smooth flippers on ball joints ---
for (const [s, arm] of [[1, 'armL'], [-1, 'armR']]) {
  add(ball(0.083), arm, C.accent, { at: [s * 0.385, 0.86, 0] })
  const flipper = lathe([[-0.4, 0.015], [-0.385, 0.055], [-0.32, 0.095], [-0.18, 0.102], [-0.04, 0.078], [0, 0.03]], 18)
  add(flipper, arm, C.shell, { at: [s * 0.4, 0.85, 0], rot: [0, 0, s * 0.3], scale: [1, 1, 0.82] })
  add(ring(0.08, 0.016), arm, C.accent, { at: [s * (0.4 + Math.sin(0.3) * 0.075), 0.85 - Math.cos(0.3) * 0.075, 0], rot: [Math.PI / 2, s * 0.3, 0], scale: [1, 0.82, 1] })
  const tip = [s * (0.4 + Math.sin(0.3) * 0.36), 0.85 - Math.cos(0.3) * 0.36, 0]
  add(ball(0.066, 14, 10), arm, C.coral, { at: tip, scale: [1, 0.72, 0.82] })
}

// --- Assemble the glTF document ---
const doc = new Document()
const unlit = doc.createExtension(KHRMaterialsUnlit)
doc.createExtension(KHRMeshQuantization)
const buffer = doc.createBuffer()
const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)

const primitive = (b, material) => doc.createPrimitive()
  .setMaterial(material)
  .setIndices(acc('SCALAR', new Uint32Array(b.idx)))
  .setAttribute('POSITION', acc('VEC3', new Float32Array(b.pos)))
  .setAttribute('NORMAL', acc('VEC3', new Float32Array(b.nor)))
  .setAttribute('COLOR_0', acc('VEC4', new Float32Array(b.col)))
  .setAttribute('JOINTS_0', acc('VEC4', new Uint16Array(b.jnt)))
  .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(b.jnt.length).map((_, i) => (i % 4 === 0 ? 1 : 0))))

const shell = doc.createMaterial('shell').setRoughnessFactor(0.38).setMetallicFactor(0)
const glow = doc.createMaterial('glow').setExtension('KHR_materials_unlit', unlit.createUnlit())
const mesh = doc.createMesh('robot').addPrimitive(primitive(solid, shell)).addPrimitive(primitive(lit, glow))

const bones = {}
for (const name of jointNames) {
  const { parent, at } = JOINTS[name]
  const pa = parent ? JOINTS[parent].at : [0, 0, 0]
  bones[name] = doc.createNode(name).setTranslation([at[0] - pa[0], at[1] - pa[1], at[2] - pa[2]])
}
for (const name of jointNames) if (JOINTS[name].parent) bones[JOINTS[name].parent].addChild(bones[name])

const ibm = new Float32Array(jointNames.length * 16)
jointNames.forEach((n, i) => {
  const [x, y, z] = JOINTS[n].at
  ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1], i * 16)
})
const skin = doc.createSkin('rig').setSkeleton(bones.root).setInverseBindMatrices(acc('MAT4', ibm))
jointNames.forEach((n) => skin.addJoint(bones[n]))

const body = doc.createNode('body').setMesh(mesh).setSkin(skin)
doc.createScene('scene').addChild(doc.createNode('robot').addChild(bones.root).addChild(body))

// --- Animation clips. Each frame gives Euler degrees per bone, plus `lift`, `blink`, `happy`, `flame`. ---
const q = ([x, y, z]) => {
  const v = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180))
  return [v.x, v.y, v.z, v.w]
}
function clip(name, duration, steps, sample) {
  const anim = doc.createAnimation(name)
  const times = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * duration)
  const frames = times.map((t) => sample((t / duration) * Math.PI * 2, t / duration))
  const track = (node, targetPath, type, values) => {
    const sampler = doc.createAnimationSampler().setInterpolation('LINEAR')
      .setInput(acc('SCALAR', new Float32Array(times))).setOutput(acc(type, new Float32Array(values)))
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler))
  }
  for (const bone of ['root', 'head', 'antenna', 'armL', 'armR']) {
    track(bones[bone], 'rotation', 'VEC4', frames.flatMap((f) => q(f[bone] ?? [0, 0, 0])))
  }
  track(bones.root, 'translation', 'VEC3', frames.flatMap((f) => [0, JOINTS.root.at[1] + (f.lift ?? 0), 0]))
  track(bones.eyesOpen, 'scale', 'VEC3', frames.flatMap((f) => { const o = 1 - (f.happy ?? 0); return [o, o * (f.blink ?? 1), o] }))
  track(bones.eyesHappy, 'scale', 'VEC3', frames.flatMap((f) => { const h = f.happy ?? 0; return [h, h, h] }))
  track(bones.thrust, 'scale', 'VEC3', frames.flatMap((f) => { const t = f.flame ?? 0.7; return [0.8 + t * 0.2, t, 0.8 + t * 0.2] }))
}
const S = Math.sin
const flicker = (p, n) => S(p * n) * 0.09 + S(p * n * 1.7 + 1) * 0.05
const blinkAt = (t, at) => 1 - 0.92 * Math.max(0, 1 - Math.abs(t - at) / 0.022)

clip('Idle', 4, 64, (p, t) => ({
  lift: S(p * 2) * 0.05,
  root: [S(p) * 1.5, 0, S(p * 2 + 1) * 1.5],
  head: [S(p + 1) * 3, S(p) * 12, S(p * 2) * 1.5],
  antenna: [S(p * 3) * 6, 0, S(p * 2 + 1) * 7],
  armL: [S(p * 2) * 4, 0, 3 + S(p * 2 + 1) * 3],
  armR: [S(p * 2 + 1) * 4, 0, -3 - S(p * 2) * 3],
  blink: Math.min(blinkAt(t, 0.3), blinkAt(t, 0.36), blinkAt(t, 0.8)),
  flame: 0.68 + flicker(p, 6),
}))
const glide = (lean, swing, bob, flame, spread) => (p) => ({
  lift: S(p * 2) * bob,
  root: [lean, S(p) * 3, S(p) * 3],
  head: [-lean * 0.55, -S(p) * 3, 0],
  antenna: [-lean * 0.9 - 6 + S(p * 2) * 6, 0, S(p) * 6],
  armL: [lean * 1.1 + S(p) * swing, 0, spread],
  armR: [lean * 1.1 - S(p) * swing, 0, -spread],
  flame: flame + flicker(p, 4),
})
clip('Walk', 1.1, 24, glide(10, 14, 0.03, 1.05, 8))
clip('Run', 0.7, 20, glide(23, 10, 0.022, 1.65, 18))
clip('Jump', 0.9, 16, (p, t) => {
  const up = S(t * Math.PI)
  return {
    root: [4, 0, 0], head: [-6 * up, 0, 0], antenna: [-22 * up, 0, 0],
    armL: [0, 0, 22 + 52 * up], armR: [0, 0, -22 - 52 * up],
    flame: 1.9 + flicker(p, 4),
  }
})
clip('Wave', 1.3, 26, (p) => ({
  lift: S(p) * 0.04,
  root: [0, 0, S(p) * 2.5],
  head: [3, 0, 6 + S(p) * 3],
  antenna: [0, 0, S(p * 2) * 10],
  armL: [S(p) * 3, 0, 8],
  armR: [0, 0, -128 + S(p * 2) * 15],
  happy: 1,
  flame: 0.72 + flicker(p, 6),
}))

await MeshoptEncoder.ready
await MeshoptDecoder.ready
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMaterialsUnlit, KHRMeshQuantization]).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
})
const out = path.resolve('public/models/character.glb')
fs.mkdirSync(path.dirname(out), { recursive: true })
await io.write(out, doc)
console.log(`character.glb: ${(fs.statSync(out).size / 1024).toFixed(1)} KB, ${(solid.idx.length + lit.idx.length) / 3} tris`)
