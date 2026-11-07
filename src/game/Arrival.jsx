import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from './player/playerState'
import { heightAt, smoothstep } from './world/heightfield'
import { SPAWN } from './world/layout'
import { useGameStore } from '../store/useGameStore'
import { prefersReducedMotion } from '../lib/device'

// The first visit of the day opens with the robot flying down through the sky to the plaza.
const LANDS_AT = 5.4
const ENDS_AT = 6.4
const SEEN_KEY = 'island-arrival-day'
const ISLAND_MIDDLE = new THREE.Vector3(0, 6, -30)

const curve = (points) => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal')
// Both measured from the landing spot, so the robot leads and the camera chases it in over the sea.
const ROBOT_PATH = curve([[69, 196, 285], [52, 138, 205], [28, 70, 112], [8, 20, 30], [0, 3, 2], [0, 0, 0]])
const CAMERA_PATH = curve([[72, 205, 300], [58, 150, 225], [34, 84, 135], [12, 30, 48], [4, 9, 16], [0, 4.4, 8]])

export const arrival = {
  active: false,
  time: 0,
  offset: new THREE.Vector3(),
  tilt: 0,
  boost: 0,
  landed: false, // raised for one frame at touchdown
  touchedDown: false,
  blend: 1, // 1 is the flight camera, 0 the normal one
  camera: new THREE.Vector3(),
  look: new THREE.Vector3(),
}

const today = () => new Date().toDateString()
function seenToday() {
  try { return localStorage.getItem(SEEN_KEY) === today() } catch { return false }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, today()) } catch { /* private window: it just plays again */ }
}

export function prepareArrival() {
  // Adding ?intro to the address replays it on demand.
  const asked = new URLSearchParams(location.search).has('intro')
  if (!asked && (prefersReducedMotion() || seenToday())) return
  Object.assign(arrival, { active: true, time: 0, tilt: 0, boost: 0, landed: false, touchedDown: false, blend: 1 })
  useGameStore.setState({ arriving: true })
}

export function endArrival() {
  if (!arrival.active) return
  arrival.active = false
  arrival.offset.set(0, 0, 0)
  arrival.tilt = 0
  useGameStore.setState({ arriving: false })
}

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const spot = new THREE.Vector3()
const previous = new THREE.Vector3()
const heading = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(170,240,255,.75)')
  g.addColorStop(1, 'rgba(70,190,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

// From high up the robot is a speck, so it falls like a comet the visitor can follow.
function Comet() {
  const group = useRef()
  const glow = useRef()
  const tail = useRef()
  const texture = useMemo(glowTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame(({ camera }) => {
    const bright = arrival.active ? 1 - smoothstep(LANDS_AT - 1.4, LANDS_AT - 0.5, arrival.time) : 0
    group.current.visible = bright > 0.01
    if (!group.current.visible) return
    group.current.position.copy(arrival.offset).add(spot)
    group.current.position.y += 0.7
    const size = camera.position.distanceTo(group.current.position) * 0.075
    glow.current.scale.setScalar(size)
    glow.current.material.opacity = bright
    heading.copy(previous).sub(arrival.offset)
    const speed = heading.length()
    previous.copy(arrival.offset)
    if (speed > 0.001) tail.current.quaternion.setFromUnitVectors(UP, heading.normalize())
    tail.current.scale.set(size * 0.16, Math.min(90, 6 + speed * 22), size * 0.16)
    tail.current.material.opacity = bright * 0.6
  })

  return (
    <group ref={group} visible={false}>
      <sprite ref={glow}>
        <spriteMaterial map={texture} blending={THREE.AdditiveBlending} transparent depthWrite={false} fog={false} />
      </sprite>
      <mesh ref={tail}>
        <coneGeometry args={[1, 1, 10, 1, true]} />
        <meshBasicMaterial color="#a8ecff" blending={THREE.AdditiveBlending} transparent depthWrite={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function Arrival() {
  useEffect(() => {
    const skip = () => { if (useGameStore.getState().ready) endArrival() }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  useFrame((_, dt) => {
    if (!arrival.active) return
    // The first frames render from the sky too, so the loading screen lifts onto the right view.
    if (useGameStore.getState().ready) {
      if (arrival.time === 0) markSeen()
      arrival.time += Math.min(dt, 0.1)
    }
    const t = arrival.time
    if (t >= ENDS_AT) return endArrival()

    spot.set(SPAWN.x, heightAt(SPAWN.x, SPAWN.z), SPAWN.z)
    const flight = Math.min(1, t / LANDS_AT)
    ROBOT_PATH.getPoint(smoother(flight), arrival.offset)
    arrival.offset.y = Math.max(arrival.offset.y, 0)
    CAMERA_PATH.getPoint(smoother(t / ENDS_AT), arrival.camera).add(spot)

    arrival.look.copy(arrival.offset).add(spot)
    arrival.look.y += 1.2
    arrival.look.lerp(ISLAND_MIDDLE, 1 - smoothstep(1.4, 3.2, t))

    arrival.tilt = 0.85 * (1 - smoothstep(LANDS_AT - 1.5, LANDS_AT - 0.5, t))
    arrival.boost = t < LANDS_AT ? 0.8 + smoothstep(LANDS_AT - 1.6, LANDS_AT - 0.3, t) * 1.4 : 0
    arrival.blend = 1 - smoothstep(LANDS_AT - 0.8, ENDS_AT, t)
    if (t >= LANDS_AT && !arrival.touchedDown) {
      arrival.touchedDown = arrival.landed = true
      player.yaw = Math.PI
    }
  })
  return <Comet />
}
