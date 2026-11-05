import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { camera as cameraState, player } from './playerState'
import { heightAt } from '../world/heightfield'
import { HOUSE } from '../world/layout'
import { world as shared } from '../world/uniforms'
import { useGameStore } from '../../store/useGameStore'
import { prefersReducedMotion } from '../../lib/device'

const HEAD = 1.45
const MIN_DIST = 3.2
const MAX_DIST = 12
const PITCH_MIN = 0.08
const PITCH_MAX = 1.05
// Indoors the door wall hides and the camera looks in from the porch, like a doll's house, so
// it never has to squeeze through a wall. Facing west matches the way the visitor walks in, so
// the controls don't change direction at the threshold.
const INDOOR_YAW = Math.PI / 2
const INDOOR_X = HOUSE.x + 5.2
const INDOOR_HEIGHT = 3.35
const INDOOR_TRACK = 0.4 // how far it slides sideways with the player
const INDOOR_LOOK_X = HOUSE.x + 1.5
const lookAt = new THREE.Vector3()
const scratch = new THREE.Vector3()

export default function FollowCamera() {
  const { rapier, world } = useRapier()
  const three = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const orbit = useRef({ pitch: 0.34, zoom: 7.6, dist: 7.6, indoor: 0, dragging: false, lastX: 0, lastY: 0, id: null, touchedAt: -10 })
  const focus = useRef(new THREE.Vector3())
  const started = useRef(false)
  const reduced = useRef(prefersReducedMotion())

  useEffect(() => {
    const o = orbit.current
    const down = (e) => {
      if (o.id !== null) return
      o.id = e.pointerId
      o.dragging = true
      o.lastX = e.clientX
      o.lastY = e.clientY
    }
    const move = (e) => {
      if (e.pointerId !== o.id) return
      cameraState.yaw -= (e.clientX - o.lastX) * 0.0055
      o.pitch = THREE.MathUtils.clamp(o.pitch + (e.clientY - o.lastY) * 0.0035, PITCH_MIN, PITCH_MAX)
      o.lastX = e.clientX
      o.lastY = e.clientY
    }
    const up = (e) => {
      if (e.pointerId !== o.id) return
      o.id = null
      o.dragging = false
    }
    const wheel = (e) => {
      e.preventDefault()
      o.zoom = THREE.MathUtils.clamp(o.zoom + e.deltaY * 0.008, MIN_DIST, MAX_DIST)
    }
    dom.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    dom.addEventListener('wheel', wheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      dom.removeEventListener('wheel', wheel)
    }
  }, [dom])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const o = orbit.current
    const { x, y, z } = player.position
    const paused = !!useGameStore.getState().panel

    if (!started.current) {
      focus.current.set(x, y + HEAD, z)
      started.current = true
    }

    // Swings gently behind the direction of travel. sin() leaves straight-back movement alone.
    const blend = reduced.current ? 1 : 1 - Math.exp(-5 * dt)
    o.indoor += ((player.indoors ? 1 : 0) - o.indoor) * blend
    if (player.indoors) cameraState.yaw += Math.atan2(Math.sin(INDOOR_YAW - cameraState.yaw), Math.cos(INDOOR_YAW - cameraState.yaw)) * blend
    else if (!reduced.current && !o.dragging && !paused && player.speed > 1) {
      const behind = player.yaw + Math.PI
      const side = Math.sin(behind - cameraState.yaw)
      cameraState.yaw += side * 0.75 * dt * Math.min(1, player.speed / 4)
    }

    const follow = reduced.current ? 1 : 1 - Math.exp(-7 * dt)
    focus.current.x += (x - focus.current.x) * follow
    focus.current.z += (z - focus.current.z) * follow
    focus.current.y += (y + HEAD - focus.current.y) * (reduced.current ? 1 : 1 - Math.exp(-4.5 * dt))

    const cp = Math.cos(o.pitch)
    const dirX = Math.sin(cameraState.yaw) * cp
    const dirY = Math.sin(o.pitch)
    const dirZ = Math.cos(cameraState.yaw) * cp

    // Shortens the boom when something solid sits between the character and the camera.
    let allowed = o.zoom
    const ray = new rapier.Ray(focus.current, { x: dirX, y: dirY, z: dirZ })
    const hit = world.castRay(ray, o.zoom + 0.4, true, undefined, undefined, undefined, player.body)
    if (hit) allowed = Math.max(1.1, (hit.timeOfImpact ?? hit.toi) - 0.35)

    const rate = allowed < o.dist ? 22 : 3
    o.dist += (allowed - o.dist) * (1 - Math.exp(-rate * dt))

    shared.uFocus.value = o.dist

    const cx = focus.current.x + dirX * o.dist
    const cz = focus.current.z + dirZ * o.dist
    const cy = Math.max(focus.current.y + dirY * o.dist, Math.max(heightAt(cx, cz), 0) + 0.45)
    three.position.set(cx, cy, cz)
    lookAt.copy(focus.current)
    if (o.indoor > 0.001) {
      three.position.lerp(scratch.set(INDOOR_X, heightAt(HOUSE.x, HOUSE.z) + INDOOR_HEIGHT, HOUSE.z + (z - HOUSE.z) * INDOOR_TRACK), o.indoor)
      lookAt.lerp(scratch.set(Math.min(x, INDOOR_LOOK_X), y + 0.9, z), o.indoor)
    }
    three.lookAt(lookAt)
  })

  return null
}
