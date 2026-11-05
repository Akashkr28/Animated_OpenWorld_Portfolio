import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { stones, ZONES } from '../world/layout'
import { numberTexture } from '../world/labels'
import { zoneText } from '../../data/portfolio'
import { useGameStore } from '../../store/useGameStore'
import ZoneMarker from './ZoneMarker'

const DORMANT = new THREE.Color('#8f89a1')
const AWAKE = new THREE.Color('#c8b6ff')

function Stone({ stone }) {
  const body = useRef()
  const aura = useRef()
  const number = useRef()
  const revealed = useGameStore((s) => !!s.milestonesSeen[stone.index])
  const texture = useMemo(() => numberTexture(stone.index + 1), [stone.index])
  const y = heightAt(stone.x, stone.z)

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-3 * dt)
    body.current.material.color.lerp(revealed ? AWAKE : DORMANT, k)
    aura.current.material.opacity += ((revealed ? 0.55 : 0) - aura.current.material.opacity) * k
  })

  return (
    <group position={[stone.x, y, stone.z]}>
      <mesh ref={body} position-y={1} scale={[0.72, 1.35, 0.55]} rotation-y={stone.index} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial flatShading color={DORMANT} />
      </mesh>
      <mesh ref={aura} position-y={0.12} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.05, 1.45, 24]} />
        <meshBasicMaterial color="#c8b6ff" transparent opacity={0} depthWrite={false} />
      </mesh>
      <sprite ref={number} position-y={2.95} scale={0.95}>
        <spriteMaterial map={texture} transparent depthWrite={false} fog={false} />
      </sprite>
    </group>
  )
}

export default function JourneyPath() {
  return (
    <>
      <ZoneMarker zone={ZONES.journey} label={zoneText.journey.label} height={11} />
      {stones.map((s) => <Stone key={s.index} stone={s} />)}
      <RigidBody type="fixed" colliders={false}>
        {stones.map((s) => <CylinderCollider key={s.index} args={[1.2, 0.68]} position={[s.x, heightAt(s.x, s.z) + 1, s.z]} />)}
      </RigidBody>
    </>
  )
}
