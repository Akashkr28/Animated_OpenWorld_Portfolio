import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { heightAt, waterLevelAt } from '../world/heightfield'
import { pillLabel } from '../world/labels'
import { world } from '../world/uniforms'
import { player } from '../player/playerState'
import { useGameStore } from '../../store/useGameStore'

const MAX_BOTS = 30
const SHELLS = ['#ffd9c7', '#c9f2e8', '#d9d2ff', '#ffe9b8', '#cfe4ff', '#ffc9dd']
const LABEL_RANGE = 45
const SPACING = 2.3 // bots left in the same spot shuffle apart
const HOVER = 0.28
const LABEL_HEIGHT = 2.15
const LABEL_STEP = 0.3 // neighbours' names sit at different heights so a crowd stays readable

const numberOf = (tag) => parseInt(tag.slice(0, 8), 16)

function part(geometry, x, y, z, sx = 1, sy = sx, sz = sx, color) {
  const g = geometry.clone()
  g.scale(sx, sy, sz)
  g.translate(x, y, z)
  if (color) {
    const c = new THREE.Color(color)
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).map((_, i) => [c.r, c.g, c.b][i % 3]), 3))
  }
  return g
}

// A low-detail stand-in for the player's robot: about 30 of these cost less than one of it.
function botGeometry() {
  const ball = new THREE.SphereGeometry(1, 20, 14)
  const shell = mergeGeometries([
    part(ball, 0, 1.28, 0, 0.5, 0.46, 0.48),
    part(ball, 0, 0.62, 0, 0.36, 0.4, 0.34),
    part(ball, -0.52, 1.28, 0, 0.08, 0.15, 0.15),
    part(ball, 0.52, 1.28, 0, 0.08, 0.15, 0.15),
    part(ball, -0.44, 0.68, 0.02, 0.1, 0.27, 0.1),
    part(ball, 0.44, 0.68, 0.02, 0.1, 0.27, 0.1),
  ])
  const face = mergeGeometries([
    part(ball, 0, 1.3, 0.36, 0.34, 0.23, 0.15, '#0d2470'),
    part(ball, -0.13, 1.33, 0.5, 0.05, 0.075, 0.02, '#aaf0ff'),
    part(ball, 0.13, 1.33, 0.5, 0.05, 0.075, 0.02, '#aaf0ff'),
    part(ball, 0, 0.66, 0.31, 0.09, 0.09, 0.04, '#58e6ff'),
    part(ball, 0, 1.92, 0, 0.055, 0.055, 0.055, '#ff7a59'),
    part(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), 0, 1.8, 0, 1, 1, 1, '#ff7a59'),
  ])
  return { shell, face }
}

function NameTag({ name, x, y, z, color, row }) {
  const sprite = useRef()
  const { texture, aspect } = useMemo(() => pillLabel(name, { color, size: 44 }), [name, color])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame(({ camera }) => {
    const distance = camera.position.distanceTo(sprite.current.position)
    const size = THREE.MathUtils.clamp(distance * 0.042, 0.28, 1.2)
    sprite.current.scale.set(size * aspect, size, 1)
    sprite.current.material.opacity = 1 - THREE.MathUtils.smoothstep(distance, LABEL_RANGE - 10, LABEL_RANGE)
    sprite.current.visible = distance < LABEL_RANGE
  })
  return (
    <sprite ref={sprite} position={[x, y + LABEL_HEIGHT + row * LABEL_STEP, z]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

function OwnTag({ name }) {
  const group = useRef()
  const { texture, aspect } = useMemo(() => pillLabel(name, { color: '#ffc27a', size: 44 }), [name])
  useFrame(() => {
    const { greeting } = useGameStore.getState()
    group.current.visible = !greeting && !player.sleeping
    group.current.position.set(player.position.x, player.position.y + 2.2, player.position.z)
  })
  return (
    <sprite ref={group} scale={[0.34 * aspect, 0.34, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

// Bots left behind by earlier visitors. They have no collision, so nobody can be blocked by one.
export default function VisitorBots() {
  const bots = useGameStore((s) => s.guestbook?.bots)
  const signer = useGameStore((s) => s.signer)
  const shells = useRef()
  const faces = useRef()
  const parts = useMemo(botGeometry, [])
  const scratch = useMemo(() => new THREE.Object3D(), [])

  const placed = useMemo(() => {
    const list = []
    for (const bot of bots ?? []) {
      if (bot.tag === signer?.tag) continue
      const n = numberOf(bot.tag)
      let { x, z } = bot
      for (let step = 1; list.some((o) => Math.hypot(o.x - x, o.z - z) < SPACING) && step < 24; step++) {
        const angle = (n % 360) * 0.0175 + step * 2.4
        x = bot.x + Math.cos(angle) * SPACING * Math.sqrt(step)
        z = bot.z + Math.sin(angle) * SPACING * Math.sqrt(step)
      }
      list.push({
        ...bot, x, z,
        y: Math.max(heightAt(x, z), waterLevelAt(x, z)) + HOVER,
        yaw: (n % 628) / 100,
        phase: (n % 100) / 16,
        color: SHELLS[n % SHELLS.length],
        row: list.length % 3,
      })
    }
    return list
  }, [bots, signer])

  useLayoutEffect(() => {
    const color = new THREE.Color()
    placed.forEach((bot, i) => shells.current.setColorAt(i, color.set(bot.color)))
    shells.current.count = faces.current.count = placed.length
    if (shells.current.instanceColor) shells.current.instanceColor.needsUpdate = true
  }, [placed])

  useFrame(() => {
    const t = world.uTime.value
    placed.forEach((bot, i) => {
      scratch.position.set(bot.x, bot.y + Math.sin(t * 1.7 + bot.phase) * 0.06, bot.z)
      scratch.rotation.y = bot.yaw
      scratch.updateMatrix()
      shells.current.setMatrixAt(i, scratch.matrix)
      faces.current.setMatrixAt(i, scratch.matrix)
    })
    shells.current.instanceMatrix.needsUpdate = true
    faces.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={shells} args={[parts.shell, null, MAX_BOTS]} count={0} frustumCulled={false} castShadow>
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={faces} args={[parts.face, null, MAX_BOTS]} count={0} frustumCulled={false}>
        <meshBasicMaterial vertexColors />
      </instancedMesh>
      {placed.map((bot) => <NameTag key={bot.tag} {...bot} />)}
      {signer && <OwnTag name={signer.name} />}
    </>
  )
}
