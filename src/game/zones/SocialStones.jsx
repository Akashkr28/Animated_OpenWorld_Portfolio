import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { SOCIAL, socialLamps, socialStones } from '../world/layout'
import { pillLabel } from '../world/labels'
import { env } from '../world/environment'
import { world } from '../world/uniforms'
import { bulb } from '../world/glow'
import { useGameStore } from '../../store/useGameStore'

// The carved face is pale and the cut sides darker, so each logo reads like chiselled stone.
const FACE = new THREE.MeshLambertMaterial({ color: '#dcd6e8', flatShading: true })
const SIDES = new THREE.MeshLambertMaterial({ color: '#8f88a8', flatShading: true })
const PLINTH = '#7d7697'
const STEP = '#a39db6'

// Each logo is a set of flat shapes on a 1-unit grid, extruded to different depths so the
// carving catches the light. Holes are cut straight through.
const rect = (x0, y0, x1, y1) => {
  const s = new THREE.Shape()
  s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath()
  return s
}
function rounded(w, h, r, path = new THREE.Shape()) {
  const x = -w / 2, y = -h / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r)
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y)
  return path
}
const circle = (x, y, r, path = new THREE.Shape()) => { path.absarc(x, y, r, 0, Math.PI * 2, false); return path }

function linkedin() {
  const plate = rounded(1, 1, 0.17)
  plate.holes.push(circle(-0.27, 0.27, 0.085), rect(-0.35, -0.36, -0.19, 0.12))
  const n = new THREE.Path()
  n.moveTo(-0.08, -0.36); n.lineTo(-0.08, 0.12); n.lineTo(0.07, 0.12); n.lineTo(0.07, 0.06)
  n.quadraticCurveTo(0.14, 0.15, 0.24, 0.14); n.quadraticCurveTo(0.36, 0.12, 0.36, -0.02)
  n.lineTo(0.36, -0.36); n.lineTo(0.21, -0.36); n.lineTo(0.21, -0.04)
  n.quadraticCurveTo(0.2, 0.02, 0.15, 0.02); n.quadraticCurveTo(0.07, 0.02, 0.07, -0.06)
  n.lineTo(0.07, -0.36); n.closePath()
  plate.holes.push(n)
  return [[plate, 0.22]]
}

function github() {
  const disc = circle(0, 0, 0.5)
  const cat = new THREE.Path()
  cat.moveTo(-0.13, -0.42); cat.lineTo(-0.13, -0.21)
  cat.quadraticCurveTo(-0.34, -0.17, -0.34, 0.03); cat.lineTo(-0.3, 0.12); cat.lineTo(-0.31, 0.3)
  cat.lineTo(-0.18, 0.22); cat.quadraticCurveTo(0, 0.27, 0.18, 0.22); cat.lineTo(0.31, 0.3)
  cat.lineTo(0.3, 0.12); cat.lineTo(0.34, 0.03); cat.quadraticCurveTo(0.34, -0.17, 0.13, -0.21)
  cat.lineTo(0.13, -0.42); cat.closePath()
  disc.holes.push(cat)
  return [[disc, 0.22]]
}

function email() {
  const flap = new THREE.Shape()
  flap.moveTo(-0.5, 0.33); flap.lineTo(0, -0.04); flap.lineTo(0.5, 0.33); flap.lineTo(0.5, 0.2)
  flap.lineTo(0, -0.19); flap.lineTo(-0.5, 0.2); flap.closePath()
  return [[rounded(1.1, 0.76, 0.07), 0.14], [flap, 0.26]]
}

function resume() {
  const page = new THREE.Shape()
  page.moveTo(-0.4, -0.52); page.lineTo(0.4, -0.52); page.lineTo(0.4, 0.3); page.lineTo(0.18, 0.52)
  page.lineTo(-0.4, 0.52); page.closePath()
  const fold = new THREE.Shape()
  fold.moveTo(0.18, 0.52); fold.lineTo(0.18, 0.3); fold.lineTo(0.4, 0.3); fold.closePath()
  const lines = [0.2, 0.02, -0.16, -0.34].map((y, i) => [rect(-0.26, y - 0.04, i === 0 ? 0.06 : 0.26, y + 0.04), 0.22])
  return [[page, 0.14], [fold, 0.24], ...lines]
}

const LOGOS = { linkedin, github, email, resume }

// One geometry per part, each keeping its face and side groups for the two stone materials.
function logoParts(kind) {
  return LOGOS[kind]().map(([shape, depth]) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 })
    g.translate(0, 0, -0.11)
    return g
  })
}

function Monument({ stone }) {
  const y = heightAt(stone.x, stone.z)
  const parts = useMemo(() => logoParts(stone.kind), [stone.kind])
  useEffect(() => () => parts.forEach((g) => g.dispose()), [parts])
  const label = useMemo(() => pillLabel(stone.label, { color: stone.color, size: 40 }), [stone])
  const inlay = useMemo(() => new THREE.MeshBasicMaterial({ color: stone.color }), [stone.color])
  const base = useMemo(() => new THREE.Color(stone.color), [stone.color])
  const logo = useRef()
  const tag = useRef()
  const ring = useRef()
  const id = `social-${stone.kind}`

  useFrame((_, dt) => {
    const near = useGameStore.getState().nearby?.id === id
    // The inlay is a soft stripe by day and a lit band at night, brighter when you step up.
    inlay.color.copy(base).multiplyScalar(0.9 + env.dark * 1.1 + (near ? 0.9 : 0))
    logo.current.position.y = THREE.MathUtils.damp(logo.current.position.y, near ? 2.32 : 2.2, 6, dt)
    tag.current.material.opacity = THREE.MathUtils.damp(tag.current.material.opacity, near ? 1 : 0.75, 6, dt)
    ring.current.material.opacity = THREE.MathUtils.damp(ring.current.material.opacity, near ? 0.85 : 0.25 + env.dark * 0.35, 6, dt)
    logo.current.rotation.y = THREE.MathUtils.damp(logo.current.rotation.y, near ? Math.sin(world.uTime.value * 0.8) * 0.12 : 0, 3, dt)
  })

  return (
    <group position={[stone.x, y, stone.z]} rotation-y={stone.yaw}>
      <mesh ref={ring} position-y={0.04} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.75, 1.95, 32]} />
        <meshBasicMaterial color={stone.color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh position-y={0.14} receiveShadow castShadow>
        <cylinderGeometry args={[1.45, 1.6, 0.28, 8]} />
        <meshLambertMaterial color={PLINTH} flatShading />
      </mesh>
      <mesh position-y={0.58} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.6, 0.95]} />
        <meshLambertMaterial color={STEP} flatShading />
      </mesh>
      <mesh position-y={0.91}>
        <boxGeometry args={[2.02, 0.07, 1.07]} />
        <meshLambertMaterial color={PLINTH} flatShading />
      </mesh>
      <mesh position={[0, 0.58, 0.48]} material={inlay}>
        <planeGeometry args={[1.5, 0.08]} />
      </mesh>
      <group ref={logo} position-y={2.2} scale={1.9}>
        {parts.map((g, i) => <mesh key={i} geometry={g} material={[FACE, SIDES]} castShadow receiveShadow />)}
      </group>
      <sprite ref={tag} position-y={3.75} scale={[0.6 * label.aspect, 0.6, 1]}>
        <spriteMaterial map={label.texture} transparent opacity={0.75} depthWrite={false} fog={false} />
      </sprite>
    </group>
  )
}

function Lamp({ x, z }) {
  const y = heightAt(x, z)
  return (
    <group position={[x, y, z]}>
      <mesh position-y={1.2} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 2.4, 6]} />
        <meshLambertMaterial color="#2e2c5c" />
      </mesh>
      <mesh position-y={2.5}>
        <icosahedronGeometry args={[0.2, 0]} />
        <primitive object={bulb('#ffd591')} attach="material" />
      </mesh>
      <mesh position-y={2.72}>
        <coneGeometry args={[0.26, 0.18, 6]} />
        <meshLambertMaterial color="#2e2c5c" flatShading />
      </mesh>
    </group>
  )
}

export default function SocialStones() {
  const sign = useMemo(() => pillLabel('Find me online', { color: '#ffc27a', size: 48 }), [])
  return (
    <>
      {socialStones.map((stone) => <Monument key={stone.kind} stone={stone} />)}
      {socialLamps.map(([x, z]) => <Lamp key={`${x},${z}`} x={x} z={z} />)}
      <sprite position={[SOCIAL.x, heightAt(SOCIAL.x, SOCIAL.z) + 5.8, SOCIAL.z]} scale={[0.85 * sign.aspect, 0.85, 1]}>
        <spriteMaterial map={sign.texture} transparent depthWrite={false} fog={false} />
      </sprite>
      <RigidBody type="fixed" colliders={false}>
        {socialStones.map((s) => (
          <CylinderCollider key={s.kind} args={[1.2, 1.15]} position={[s.x, heightAt(s.x, s.z) + 1, s.z]} />
        ))}
        {socialLamps.map(([x, z]) => <CylinderCollider key={`${x},${z}`} args={[1.2, 0.15]} position={[x, heightAt(x, z) + 1.2, z]} />)}
      </RigidBody>
    </>
  )
}
