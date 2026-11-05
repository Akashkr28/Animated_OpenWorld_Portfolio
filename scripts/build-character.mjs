// Generates public/models/character.glb: an original low-poly explorer with a real
// skeleton and Idle / Walk / Run / Jump clips, meshopt-compressed.
// Re-run with `npm run build:character` after editing colours or proportions.
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'
import fs from 'node:fs'
import path from 'node:path'

const C = {
  skin: '#c98a5e', hair: '#231a2e', jacket: '#ff7a59', jacketDark: '#d9583d', shirt: '#fff1dc',
  pants: '#2e2c5c', boot: '#5a3a2e', sole: '#efe2cc', pack: '#2fb7a8', packDark: '#1f8a80', eye: '#17132b',
}

// Rest-pose joint positions (metres, feet at y=0, facing +Z).
const JOINTS = {
  hips: { parent: null, at: [0, 0.92, 0] },
  spine: { parent: 'hips', at: [0, 1.04, 0] },
  chest: { parent: 'spine', at: [0, 1.26, 0] },
  head: { parent: 'chest', at: [0, 1.46, 0] },
  armL: { parent: 'chest', at: [0.27, 1.38, 0] },
  foreL: { parent: 'armL', at: [0.3, 1.1, 0] },
  armR: { parent: 'chest', at: [-0.27, 1.38, 0] },
  foreR: { parent: 'armR', at: [-0.3, 1.1, 0] },
  legL: { parent: 'hips', at: [0.11, 0.88, 0] },
  shinL: { parent: 'legL', at: [0.11, 0.48, 0] },
  legR: { parent: 'hips', at: [-0.11, 0.88, 0] },
  shinR: { parent: 'legR', at: [-0.11, 0.48, 0] },
}
const jointNames = Object.keys(JOINTS)

const pos = [], nor = [], col = [], jnt = [], idx = []
function add(geometry, joint, color, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  ))
  g.computeVertexNormals() // flat shading: non-indexed faces get per-face normals
  const c = new THREE.Color(color).convertSRGBToLinear()
  const p = g.attributes.position, n = g.attributes.normal, base = pos.length / 3, j = jointNames.indexOf(joint)
  for (let i = 0; i < p.count; i++) {
    pos.push(p.getX(i), p.getY(i), p.getZ(i))
    nor.push(n.getX(i), n.getY(i), n.getZ(i))
    col.push(c.r, c.g, c.b, 1)
    jnt.push(j, 0, 0, 0)
    idx.push(base + i)
  }
}
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z)
const taper = (rt, rb, h, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg)
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)

// Body
add(taper(0.2, 0.17, 0.2, 6), 'hips', C.pants, { at: [0, 0.94, 0] })
add(taper(0.23, 0.19, 0.28, 6), 'spine', C.jacket, { at: [0, 1.15, 0] })
add(taper(0.27, 0.23, 0.2, 6), 'chest', C.jacket, { at: [0, 1.33, 0] })
add(box(0.09, 0.42, 0.03), 'spine', C.shirt, { at: [0, 1.22, 0.2] })
add(taper(0.15, 0.2, 0.09, 6), 'chest', C.jacketDark, { at: [0, 1.45, 0] })
// Backpack with bedroll
add(box(0.34, 0.4, 0.17), 'chest', C.pack, { at: [0, 1.26, -0.28] })
add(box(0.26, 0.14, 0.05), 'chest', C.packDark, { at: [0, 1.17, -0.385] })
add(taper(0.07, 0.07, 0.42, 6), 'chest', C.shirt, { at: [0, 1.5, -0.27], rot: [0, 0, Math.PI / 2] })
// Head
add(taper(0.065, 0.075, 0.1, 6), 'head', C.skin, { at: [0, 1.5, 0] })
add(ico(0.19, 1), 'head', C.skin, { at: [0, 1.67, 0.01], scale: [1, 1.08, 1] })
add(ico(0.2, 1), 'head', C.hair, { at: [0, 1.74, -0.04], scale: [1.04, 0.82, 1.02] })
add(box(0.17, 0.07, 0.1), 'head', C.hair, { at: [0.06, 1.8, 0.14], rot: [0.3, 0, -0.28] })
add(box(0.05, 0.07, 0.02), 'head', C.eye, { at: [0.075, 1.67, 0.185] })
add(box(0.05, 0.07, 0.02), 'head', C.eye, { at: [-0.075, 1.67, 0.185] })
add(box(0.04, 0.05, 0.05), 'head', C.skin, { at: [0, 1.625, 0.195] })
// A small smile: a flat mouth with raised corners.
add(box(0.075, 0.016, 0.02), 'head', C.eye, { at: [0, 1.572, 0.178] })
add(box(0.026, 0.016, 0.02), 'head', C.eye, { at: [0.045, 1.58, 0.172], rot: [0, 0, 0.6] })
add(box(0.026, 0.016, 0.02), 'head', C.eye, { at: [-0.045, 1.58, 0.172], rot: [0, 0, -0.6] })
// Arms
for (const [s, a, f] of [[1, 'armL', 'foreL'], [-1, 'armR', 'foreR']]) {
  add(ico(0.095, 0), a, C.jacketDark, { at: [s * 0.27, 1.39, 0] })
  add(taper(0.075, 0.062, 0.28, 5), a, C.jacket, { at: [s * 0.285, 1.24, 0] })
  add(taper(0.06, 0.05, 0.24, 5), f, C.jacket, { at: [s * 0.3, 0.98, 0] })
  add(ico(0.06, 0), f, C.skin, { at: [s * 0.3, 0.83, 0] })
}
// Legs
for (const [s, l, sh] of [[1, 'legL', 'shinL'], [-1, 'legR', 'shinR']]) {
  add(taper(0.1, 0.075, 0.4, 5), l, C.pants, { at: [s * 0.11, 0.68, 0] })
  add(taper(0.075, 0.06, 0.34, 5), sh, C.pants, { at: [s * 0.11, 0.3, 0] })
  add(box(0.14, 0.12, 0.26), sh, C.boot, { at: [s * 0.11, 0.09, 0.04] })
  add(box(0.15, 0.03, 0.27), sh, C.sole, { at: [s * 0.11, 0.015, 0.04] })
}

// --- Assemble the glTF document ---
const doc = new Document()
doc.createExtension(KHRMeshQuantization)
const buffer = doc.createBuffer()
const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)

const material = doc.createMaterial('explorer').setRoughnessFactor(0.85).setMetallicFactor(0)
const prim = doc.createPrimitive()
  .setMaterial(material)
  .setIndices(acc('SCALAR', new Uint32Array(idx)))
  .setAttribute('POSITION', acc('VEC3', new Float32Array(pos)))
  .setAttribute('NORMAL', acc('VEC3', new Float32Array(nor)))
  .setAttribute('COLOR_0', acc('VEC4', new Float32Array(col)))
  .setAttribute('JOINTS_0', acc('VEC4', new Uint16Array(jnt)))
  .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(jnt.length).map((_, i) => (i % 4 === 0 ? 1 : 0))))

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
const skin = doc.createSkin('rig').setSkeleton(bones.hips).setInverseBindMatrices(acc('MAT4', ibm))
jointNames.forEach((n) => skin.addJoint(bones[n]))

const body = doc.createNode('body').setMesh(doc.createMesh('explorer').addPrimitive(prim)).setSkin(skin)
const root = doc.createNode('explorer').addChild(bones.hips).addChild(body)
doc.createScene('scene').addChild(root)

// --- Animation clips: per-joint keyframes as Euler degrees ---
const q = ([x, y, z]) => {
  const v = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180))
  return [v.x, v.y, v.z, v.w]
}
function clip(name, duration, steps, sample) {
  const anim = doc.createAnimation(name)
  const times = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * duration)
  const frames = times.map((t) => sample((t / duration) * Math.PI * 2, t / duration))
  const keys = new Set(frames.flatMap((f) => Object.keys(f)))
  for (const key of keys) {
    const isHipOffset = key === 'hipsY'
    const node = bones[isHipOffset ? 'hips' : key]
    const values = frames.flatMap((f) => (isHipOffset
      ? [0, JOINTS.hips.at[1] + (f.hipsY ?? 0), 0]
      : q(f[key] ?? [0, 0, 0])))
    const sampler = doc.createAnimationSampler().setInterpolation('LINEAR')
      .setInput(acc('SCALAR', new Float32Array(times)))
      .setOutput(acc(isHipOffset ? 'VEC3' : 'VEC4', new Float32Array(values)))
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel()
      .setTargetNode(node).setTargetPath(isHipOffset ? 'translation' : 'rotation').setSampler(sampler))
  }
}
const S = Math.sin, K = Math.cos

clip('Idle', 3.2, 16, (p) => ({
  hipsY: S(p) * 0.008,
  spine: [S(p) * 1.2, 0, 0],
  chest: [S(p + 0.6) * 1.8, S(p * 0.5) * 1.5, 0],
  head: [S(p + 1.2) * 1.5, S(p) * 5, 0],
  armL: [S(p) * 2, 0, 5 + S(p) * 1.2], foreL: [-10, 0, 0],
  armR: [-S(p) * 2, 0, -5 - S(p) * 1.2], foreR: [-10, 0, 0],
}))
const gait = (swing, knee, arm, elbow, lean, bounce) => (p) => ({
  hipsY: -Math.abs(S(p)) * bounce + bounce * 0.4,
  hips: [0, S(p) * 6, 0],
  spine: [lean, -S(p) * 5, 0],
  chest: [lean * 0.3, -S(p) * 6, 0],
  head: [-lean, S(p) * 4, 0],
  legL: [-S(p) * swing, 0, 0], shinL: [knee * Math.max(0, S(p + 2.2)) + 4, 0, 0],
  legR: [S(p) * swing, 0, 0], shinR: [knee * Math.max(0, S(p + 2.2 + Math.PI)) + 4, 0, 0],
  armL: [S(p) * arm, 0, 6], foreL: [-elbow, 0, 0],
  armR: [-S(p) * arm, 0, -6], foreR: [-elbow, 0, 0],
})
clip('Walk', 0.9, 16, gait(26, 44, 24, 18, 3, 0.03))
clip('Run', 0.58, 16, gait(46, 84, 48, 72, 11, 0.07))
clip('Jump', 0.9, 8, (_, t) => {
  const tuck = S(t * Math.PI)
  return {
    spine: [6 * tuck, 0, 0],
    legL: [-46 * tuck, 0, 0], shinL: [62 * tuck, 0, 0],
    legR: [18 * tuck, 0, 0], shinR: [46 * tuck, 0, 0],
    armL: [-40 * tuck, 0, 34], foreL: [-30, 0, 0],
    armR: [32 * tuck, 0, -34], foreR: [-30, 0, 0],
  }
})

clip('Wave', 1.3, 24, (p) => ({
  hipsY: S(p) * 0.008,
  spine: [0, 0, S(p) * 1.5],
  chest: [-2, 0, S(p) * 2],
  head: [3, 0, 5 + S(p) * 3],
  armL: [S(p) * 2, 0, 6], foreL: [-12, 0, 0],
  armR: [0, 0, -152 + S(p) * 7],
  foreR: [0, 0, S(p * 2) * 26],
}))

await MeshoptEncoder.ready
await MeshoptDecoder.ready
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
})
const out = path.resolve('public/models/character.glb')
fs.mkdirSync(path.dirname(out), { recursive: true })
await io.write(out, doc)
console.log(`character.glb: ${(fs.statSync(out).size / 1024).toFixed(1)} KB, ${idx.length / 3} tris`)
