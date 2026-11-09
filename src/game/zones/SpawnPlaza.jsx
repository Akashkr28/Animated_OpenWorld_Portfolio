import { useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { signTexture } from '../world/labels'
import { heightAt } from '../world/heightfield'
import { PLAZA_LAMPS as lamps, ZONES } from '../world/layout'
import { profile, zoneText } from '../../data/portfolio'
import ZoneMarker from './ZoneMarker'
import { bulb } from '../world/glow'

const SIGN = { x: -5.5, z: 8.5, yaw: 0.5 }

function Lamp({ x, z }) {
  const y = heightAt(x, z)
  return (
    <group position={[x, y, z]}>
      <mesh position-y={1.3} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 2.6, 6]} />
        <meshLambertMaterial color="#2e2c5c" />
      </mesh>
      <mesh position-y={2.75}>
        <icosahedronGeometry args={[0.24, 0]} />
        <primitive object={bulb('#ffd591')} attach="material" />
      </mesh>
      <mesh position-y={3}>
        <coneGeometry args={[0.3, 0.2, 6]} />
        <meshLambertMaterial color="#2e2c5c" flatShading />
      </mesh>
    </group>
  )
}

export default function SpawnPlaza() {
  const texture = useMemo(() => signTexture(profile), [])
  const y = heightAt(SIGN.x, SIGN.z)

  return (
    <>
      <ZoneMarker zone={{ ...ZONES.spawn, z: ZONES.spawn.z - 13 }} label={zoneText.spawn.label} height={9} />
      <group position={[SIGN.x, y, SIGN.z]} rotation-y={SIGN.yaw}>
        <mesh position={[0, 2.7, 0]} castShadow>
          <boxGeometry args={[5.5, 3.2, 0.22]} />
          <meshLambertMaterial color="#54362a" />
        </mesh>
        <mesh position={[0, 2.7, 0.12]}>
          <planeGeometry args={[5.3, 2.98]} />
          <meshLambertMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.35} />
        </mesh>
        {[-2.3, 2.3].map((px) => (
          <mesh key={px} position={[px, 1.1, -0.02]} castShadow>
            <boxGeometry args={[0.3, 2.2, 0.3]} />
            <meshLambertMaterial color="#54362a" />
          </mesh>
        ))}
        <mesh position={[0, 4.42, 0]} castShadow>
          <boxGeometry args={[5.9, 0.2, 0.55]} />
          <meshLambertMaterial color="#ff7a59" />
        </mesh>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.8, 2.2, 0.25]} position={[SIGN.x, y + 2.2, SIGN.z]} rotation={[0, SIGN.yaw, 0]} />
        {lamps.map(([x, z], i) => <CylinderCollider key={i} args={[1.5, 0.16]} position={[x, heightAt(x, z) + 1.5, z]} />)}
      </RigidBody>
      {lamps.map(([x, z], i) => <Lamp key={i} x={x} z={z} />)}
    </>
  )
}
