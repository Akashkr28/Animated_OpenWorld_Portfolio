import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { HOUSE, ZONES } from '../world/layout'
import { zoneText } from '../../data/portfolio'
import ZoneMarker from './ZoneMarker'

const W = 8, D = 7, H = 3.6, ROOF = 2.8

function Window({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh>
        <boxGeometry args={[1.3, 1.3, 0.12]} />
        <meshLambertMaterial color="#6b4632" />
      </mesh>
      <mesh position-z={0.07}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial color="#ffd591" />
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
      <ZoneMarker zone={{ ...ZONES.about, x: HOUSE.x, z: HOUSE.z }} label={zoneText.about.label} height={11} />
      <group position={[HOUSE.x, y, HOUSE.z]}>
        <mesh position-y={H / 2} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
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
        <mesh position={[W / 2 + 0.06, 1.2, 0]} rotation-y={Math.PI / 2}>
          <boxGeometry args={[1.35, 2.4, 0.12]} />
          <meshLambertMaterial color="#2fb7a8" />
        </mesh>
        <mesh position={[W / 2 + 0.16, 1.2, 0.42]}>
          <icosahedronGeometry args={[0.08, 0]} />
          <meshBasicMaterial color="#ffc27a" />
        </mesh>
        <mesh position={[W / 2 + 0.8, 0.09, 0]}>
          <boxGeometry args={[1.6, 0.18, 2.4]} />
          <meshLambertMaterial color="#c9b190" />
        </mesh>
        <mesh position={[W / 2 + 0.5, 2.9, 0]}>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshBasicMaterial color="#ffd591" />
        </mesh>

        <Window position={[W / 2 + 0.02, 1.9, 2.1]} rotation={Math.PI / 2} />
        <Window position={[W / 2 + 0.02, 1.9, -2.1]} rotation={Math.PI / 2} />
        <Window position={[-1.8, 1.9, D / 2 + 0.02]} />
        <Window position={[1.8, 1.9, D / 2 + 0.02]} />
        <Window position={[-1.8, 1.9, -D / 2 - 0.02]} rotation={Math.PI} />
        <Window position={[1.8, 1.9, -D / 2 - 0.02]} rotation={Math.PI} />
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, (H + ROOF) / 2, D / 2]} position={[HOUSE.x, y + (H + ROOF) / 2, HOUSE.z]} />
      </RigidBody>
    </>
  )
}
