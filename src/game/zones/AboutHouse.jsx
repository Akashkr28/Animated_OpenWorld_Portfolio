import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { HOUSE, ROOM, ZONES } from '../world/layout'
import { player } from '../player/playerState'
import { zoneText } from '../../data/portfolio'
import { sfx } from '../../lib/audio'
import HouseInterior from './HouseInterior'
import ZoneMarker from './ZoneMarker'
import { bulb } from '../world/glow'

const W = HOUSE.halfW * 2, D = HOUSE.halfD * 2, H = 3.6, ROOF = 2.8
const T = 0.25 // wall thickness
const DOOR_W = 1.6, DOOR_H = 2.5
const OPEN_WITHIN = 3.6
const OPEN_ANGLE = 1.75
const SIDE = (D - DOOR_W) / 2

// Each wall is drawn and collided from the same box: [centre, full size].
const WALLS = [
  [[0, H / 2, -D / 2 + T / 2], [W, H, T]],
  [[0, H / 2, D / 2 - T / 2], [W, H, T]],
  [[-W / 2 + T / 2, H / 2, 0], [T, H, D]],
]
// The door wall, hidden while the visitor is inside so the camera can look in from the porch.
const FRONT = [
  [[W / 2 - T / 2, H / 2, -(DOOR_W + SIDE) / 2], [T, H, SIDE]],
  [[W / 2 - T / 2, H / 2, (DOOR_W + SIDE) / 2], [T, H, SIDE]],
  [[W / 2 - T / 2, (H + DOOR_H) / 2, 0], [T, H - DOOR_H, DOOR_W]],
]
const FURNITURE = [
  [[ROOM.desk[0], 0.4, ROOM.desk[1]], [0.85, 0.8, 2]],
  [[ROOM.stool[0], 0.15, ROOM.stool[1]], [0.45, 0.3, 0.45]],
  [[ROOM.bed[0], 0.33, ROOM.bed[1]], [2.4, 0.66, 1.26]],
  [[ROOM.shelf[0], 1.2, ROOM.shelf[1]], [1.82, 2.4, 0.4]],
  [[ROOM.plant[0], 0.3, ROOM.plant[1]], [0.5, 0.6, 0.5]],
]

function Wall({ position, size }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshLambertMaterial color="#fff1dc" />
    </mesh>
  )
}

function Front() {
  const group = useRef()
  useFrame(() => {
    group.current.visible = !player.indoors
  })
  return (
    <group ref={group}>
      {FRONT.map(([position, size]) => <Wall key={position.join()} position={position} size={size} />)}
      <Door />
      <mesh position={[W / 2 + 0.12, 2.75, 1.25]}>
        <icosahedronGeometry args={[0.16, 0]} />
        <primitive object={bulb('#ffd591')} attach="material" />
      </mesh>
      <Window position={[W / 2 + 0.02, 1.9, 2.1]} rotation={Math.PI / 2} />
      <Window position={[W / 2 + 0.02, 1.9, -2.1]} rotation={Math.PI / 2} />
    </group>
  )
}

// Swings outward onto the porch as the visitor comes near.
function Door() {
  const hinge = useRef()
  const open = useRef(false)
  useFrame((_, dt) => {
    const near = Math.hypot(player.position.x - HOUSE.doorX, player.position.z - HOUSE.doorZ) < OPEN_WITHIN
    if (near !== open.current) {
      open.current = near
      sfx('door')
    }
    const target = near ? OPEN_ANGLE : 0
    hinge.current.rotation.y += (target - hinge.current.rotation.y) * Math.min(1, dt * 7)
  })
  return (
    <group ref={hinge} position={[W / 2, 0, -DOOR_W / 2]}>
      <mesh position={[0, DOOR_H / 2, DOOR_W / 2]} castShadow>
        <boxGeometry args={[0.1, DOOR_H, DOOR_W]} />
        <meshLambertMaterial color="#2fb7a8" />
      </mesh>
      <mesh position={[0.09, DOOR_H / 2 - 0.1, DOOR_W - 0.16]}>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color="#ffc27a" />
      </mesh>
    </group>
  )
}

function Window({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh>
        <boxGeometry args={[1.3, 1.3, 0.12]} />
        <meshLambertMaterial color="#6b4632" />
      </mesh>
      <mesh position-z={0.07}>
        <planeGeometry args={[1.05, 1.05]} />
        <primitive object={bulb('#ffd591')} attach="material" />
      </mesh>
      <mesh position-z={0.08}>
        <boxGeometry args={[0.07, 1.05, 0.02]} />
        <meshLambertMaterial color="#6b4632" />
      </mesh>
      <mesh position-z={0.08}>
        <boxGeometry args={[1.05, 0.07, 0.02]} />
        <meshLambertMaterial color="#6b4632" />
      </mesh>
    </group>
  )
}

export default function AboutHouse() {
  const y = heightAt(HOUSE.x, HOUSE.z)
  const roof = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-D / 2 - 0.5, 0)
    s.lineTo(0, ROOF)
    s.lineTo(D / 2 + 0.5, 0)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: W + 1, bevelEnabled: false })
  }, [])
  const gable = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-D / 2, 0)
    s.lineTo(0, ROOF - 0.35)
    s.lineTo(D / 2, 0)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])

  return (
    <>
      <ZoneMarker zone={{ ...ZONES.about, x: HOUSE.doorX + 4.5, z: HOUSE.doorZ + 3 }} label={zoneText.about.label} height={11} />
      <group position={[HOUSE.x, y, HOUSE.z]}>
        {WALLS.map(([position, size]) => <Wall key={position.join()} position={position} size={size} />)}
        <mesh position-y={H + 0.03}>
          <boxGeometry args={[W, 0.06, D]} />
          <meshLambertMaterial color="#fff1dc" />
        </mesh>
        <mesh geometry={roof} position={[-W / 2 - 0.5, H, 0]} rotation-y={Math.PI / 2} castShadow>
          <meshLambertMaterial color="#ff7a59" flatShading />
        </mesh>
        <mesh geometry={gable} position={[W / 2 + 0.01, H, 0]} rotation-y={Math.PI / 2}>
          <meshLambertMaterial color="#ffe3bf" />
        </mesh>
        <mesh position={[-1.6, H + 2.2, 1.5]} castShadow>
          <boxGeometry args={[0.8, 2.2, 0.8]} />
          <meshLambertMaterial color="#8a5a48" />
        </mesh>

        {/* Door and porch on the east gable, facing the path */}
        <Front />
        <mesh position={[W / 2 + 0.8, 0.09, 0]}>
          <boxGeometry args={[1.6, 0.18, 2.4]} />
          <meshLambertMaterial color="#c9b190" />
        </mesh>
        <Window position={[-1.8, 1.9, D / 2 + 0.02]} />
        <Window position={[1.8, 1.9, D / 2 + 0.02]} />
        <Window position={[-1.8, 1.9, -D / 2 - 0.02]} rotation={Math.PI} />
        <Window position={[1.8, 1.9, -D / 2 - 0.02]} rotation={Math.PI} />
        <HouseInterior height={H} />
      </group>
      <RigidBody type="fixed" colliders={false} position={[HOUSE.x, y, HOUSE.z]}>
        {[...WALLS, ...FRONT, ...FURNITURE].map(([position, size]) => (
          <CuboidCollider key={position.join()} args={size.map((v) => v / 2)} position={position} />
        ))}
        <CuboidCollider args={[W / 2, ROOF / 2, D / 2]} position={[0, H + ROOF / 2, 0]} />
      </RigidBody>
    </>
  )
}
