import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import CharacterModel from './CharacterModel'
import Dust from './Dust'
import BlobShadow from './BlobShadow'
import Wake from './Wake'
import { attachKeyboard, input, readMove } from './input'
import { camera, player } from './playerState'
import { arrival } from '../Arrival'
import { heightAt, isWalkable, waterLevelAt } from '../world/heightfield'
import { HOUSE, insideHouse, ROOM, SPAWN } from '../world/layout'
import { useGameStore } from '../../store/useGameStore'
import { robot, setAmbience } from '../../lib/audio'

const WALK = 3.8
const RUN = 7.2
const GRAVITY = 26
const JUMP = 9
const COYOTE = 0.12
const MUTTER_MIN = 9
const MUTTER_RANGE = 12
const CAPSULE_HALF = 0.55
const CAPSULE_RADIUS = 0.35
const FOOT_OFFSET = CAPSULE_HALF + CAPSULE_RADIUS

// Lying on the bed: on his back, with his head on the pillow to the west.
const REST_POSE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
))
const REST_OFFSET = { x: 0.95, y: 0.72 }

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

export default function Player() {
  const { world } = useRapier()
  const body = useRef()
  const collider = useRef()
  const visual = useRef()
  const controller = useRef()
  const state = useRef({ vx: 0, vz: 0, vy: 0, airTime: 0, stride: 0, lift: 0, idle: 0, nextMutter: MUTTER_MIN, safe: new THREE.Vector3(SPAWN.x, 3, SPAWN.z) })
  const dust = useRef()
  const wake = useRef()
  const center = useRef(new THREE.Vector3(SPAWN.x, heightAt(SPAWN.x, SPAWN.z) + FOOT_OFFSET + 0.05, SPAWN.z))

  useEffect(attachKeyboard, [])

  useEffect(() => {
    const kcc = world.createCharacterController(0.03)
    kcc.setSlideEnabled(true)
    kcc.setMaxSlopeClimbAngle((55 * Math.PI) / 180)
    kcc.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    kcc.enableAutostep(0.35, 0.2, false)
    kcc.enableSnapToGround(0.35)
    controller.current = kcc
    return () => {
      world.removeCharacterController(kcc)
      controller.current = null
    }
  }, [world])

  useFrame((_, rawDt) => {
    const kcc = controller.current
    if (!kcc || !body.current || !collider.current) return
    player.body = body.current
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const c = center.current
    const game = useGameStore.getState()
    const paused = !!game.panel || game.fading || player.sleeping || arrival.active

    if (player.teleport) {
      const { x, z } = player.teleport
      c.set(x, heightAt(x, z) + FOOT_OFFSET + 0.05, z)
      body.current.setTranslation(c, true)
      player.teleport = null
      s.safe.copy(c)
      s.vx = s.vz = s.vy = 0
    }

    const move = paused ? { x: 0, y: 0, run: false } : readMove()
    const moving = move.x !== 0 || move.y !== 0
    if (moving) game.finishTutorial()
    const greeting = game.greeting
    if (greeting && (moving || paused || performance.now() > greeting.until)) game.endGreeting()

    // Camera-relative direction, then eased so starts and stops have weight.
    const sin = Math.sin(camera.yaw), cos = Math.cos(camera.yaw)
    const dirX = -sin * move.y + cos * move.x
    const dirZ = -cos * move.y - sin * move.x
    // The robot hovers, so water doesn't slow it: it rides above the surface instead.
    const surface = waterLevelAt(c.x, c.z)
    const depth = Math.max(0, surface - (c.y - FOOT_OFFSET))
    const top = move.run ? RUN : WALK
    const grip = 1 - Math.exp(-(player.grounded ? 12 : 3.5) * dt)
    s.vx += (dirX * top - s.vx) * grip
    s.vz += (dirZ * top - s.vz) * grip

    if (player.grounded) {
      if (s.airTime > 0.3) robot('land')
      s.airTime = 0
    } else s.airTime += dt
    if (input.jumpQueued && !paused && s.airTime < COYOTE) {
      s.vy = JUMP
      s.airTime = COYOTE
      robot('boost')
    }
    input.jumpQueued = false
    s.vy = player.grounded && s.vy <= 0 ? -1 : s.vy - GRAVITY * dt

    kcc.computeColliderMovement(collider.current, { x: s.vx * dt, y: s.vy * dt, z: s.vz * dt })
    const m = kcc.computedMovement()
    let nx = c.x + m.x, nz = c.z + m.z
    // The shoreline is a soft wall: keep whichever axis stays on land.
    if (!isWalkable(nx, nz)) {
      if (isWalkable(nx, c.z)) nz = c.z
      else if (isWalkable(c.x, nz)) nx = c.x
      else { nx = c.x; nz = c.z }
    }
    const traveled = Math.hypot(nx - c.x, nz - c.z)
    c.set(nx, c.y + m.y, nz)
    player.grounded = kcc.computedGrounded()
    if (player.grounded && s.vy < 0) s.vy = 0

    // The shoreline clamp can cancel horizontal movement after the controller has already
    // gone downhill, so the terrain height is enforced here as well.
    const floor = heightAt(c.x, c.z) + FOOT_OFFSET
    if (c.y < floor - 0.25) {
      c.y = floor
      s.vy = 0
      player.grounded = true
    }
    // Anything that does end up in deep water returns to the last solid footing.
    if (player.grounded && c.y - FOOT_OFFSET > -1.3) s.safe.copy(c)
    else if (c.y - FOOT_OFFSET < -1.6) {
      robot('oops')
      c.copy(s.safe)
      body.current.setTranslation(c, true)
      s.vx = s.vz = s.vy = 0
    }
    body.current.setNextKinematicTranslation(c)

    const speed = dt > 0 ? traveled / dt : 0
    player.speed += (speed - player.speed) * Math.min(1, dt * 14)
    player.position.set(c.x, c.y - FOOT_OFFSET, c.z)
    if (s.airTime > 0.14 || s.vy > 0.5) player.anim = 'jump'
    else if (player.speed > 5.2) player.anim = 'run'
    else if (player.speed > 0.35) player.anim = 'walk'
    else player.anim = 'idle'

    if (moving) {
      const target = Math.atan2(s.vx, s.vz)
      player.yaw += angleDelta(player.yaw, target) * Math.min(1, dt * 12)
    } else if (useGameStore.getState().greeting) {
      // Turns to face the visitor, who is looking through the camera.
      player.yaw += angleDelta(player.yaw, camera.yaw) * Math.min(1, dt * 6)
      if (player.grounded) player.anim = 'wave'
    }
    s.lift += (depth - s.lift) * Math.min(1, dt * 6)
    visual.current.position.copy(player.position)
    visual.current.position.y += s.lift
    visual.current.rotation.set(0, player.yaw, 0)
    if (arrival.active) {
      // Only the model flies. The real position waits on the plaza, so grass grows there first.
      visual.current.position.add(arrival.offset)
      visual.current.rotation.set(arrival.tilt, player.yaw, 0, 'YXZ')
      if (arrival.offset.y > 0.05) player.anim = 'jump'
      if (arrival.landed) {
        arrival.landed = false
        robot('land')
        dust.current?.puff(player.position, 24)
      }
    }
    if (player.sleeping) {
      visual.current.position.set(HOUSE.x + ROOM.bed[0] + REST_OFFSET.x, heightAt(HOUSE.x, HOUSE.z) + REST_OFFSET.y, HOUSE.z + ROOM.bed[1])
      visual.current.quaternion.copy(REST_POSE)
    }
    player.indoors = insideHouse(c.x, c.z)

    // Left alone, he mutters to himself now and then.
    s.idle = player.anim === 'idle' && !paused ? s.idle + dt : 0
    if (s.idle > s.nextMutter) {
      robot('mutter')
      s.idle = 0
      s.nextMutter = MUTTER_MIN + Math.random() * MUTTER_RANGE
    }

    // Footfalls are measured by distance, so dust and sound track the real stride.
    setAmbience({ hover: player.sleeping ? 0 : 0.5 + Math.min(1, player.speed / RUN) * 0.5 })
    if (player.grounded && player.speed > 0.8) {
      s.stride += traveled
      if (s.stride > (player.anim === 'run' ? 1.9 : 1.15)) {
        s.stride = 0
        if (depth > 0.08) wake.current?.ring(c.x, surface + 0.03, c.z)
        else dust.current?.puff(player.position, player.anim === 'run' ? 3 : 1)
      }
    }
  })

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={center.current.toArray()} ccd={false}>
        <CapsuleCollider ref={collider} args={[CAPSULE_HALF, CAPSULE_RADIUS]} />
      </RigidBody>
      <group ref={visual}>
        <CharacterModel />
      </group>
      <BlobShadow />
      <Dust ref={dust} />
      <Wake ref={wake} />
    </>
  )
}
