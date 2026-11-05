import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { MAILBOX, TOWER, ZONES } from '../world/layout'
import { fadeTexture } from '../world/labels'
import { world } from '../world/uniforms'
import { env } from '../world/environment'
import { zoneText } from '../../data/portfolio'
import { useGameStore } from '../../store/useGameStore'
import ZoneMarker from './ZoneMarker'

const STRIPES = [['#fff4e3', 3.1, 2.75], ['#ff7a59', 2.75, 2.42], ['#fff4e3', 2.42, 2.1], ['#ff7a59', 2.1, 1.8]]
const SEGMENT = 3

function Mailbox() {
  const flag = useRef()
  const y = heightAt(MAILBOX.x, MAILBOX.z)
  useFrame((_, dt) => {
    const near = useGameStore.getState().nearby?.id === 'contact'
    flag.current.rotation.z = THREE.MathUtils.damp(flag.current.rotation.z, near ? 0 : -Math.PI / 2, 8, dt)
  })
  return (
    <group position={[MAILBOX.x, y, MAILBOX.z]} rotation-y={Math.PI * 0.85}>
      <mesh position-y={0.6} castShadow>
        <boxGeometry args={[0.16, 1.2, 0.16]} />
        <meshLambertMaterial color="#6b4632" />
      </mesh>
      <mesh position-y={1.32} castShadow>
        <boxGeometry args={[0.62, 0.42, 0.95]} />
        <meshLambertMaterial color="#2fb7a8" />
      </mesh>
      <mesh position-y={1.53} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.31, 0.31, 0.95, 8, 1, false, 0, Math.PI]} />
        <meshLambertMaterial color="#2fb7a8" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.38, 0.485]}>
        <boxGeometry args={[0.5, 0.42, 0.03]} />
        <meshLambertMaterial color="#1f8a80" />
      </mesh>
      <group ref={flag} position={[0.36, 1.3, 0.1]}>
        <mesh position-y={0.25}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshLambertMaterial color="#ff7a59" />
        </mesh>
        <mesh position={[0, 0.43, 0.13]}>
          <boxGeometry args={[0.04, 0.2, 0.26]} />
          <meshLambertMaterial color="#ff7a59" />
        </mesh>
      </group>
    </group>
  )
}

export default function ContactTower() {
  const y = heightAt(TOWER.x, TOWER.z)
  const beam = useRef()
  const fade = useMemo(() => {
    const t = fadeTexture()
    t.center.set(0.5, 0.5)
    t.rotation = Math.PI / 2
    return t
  }, [])
  const top = SEGMENT * STRIPES.length

  useFrame(() => {
    beam.current.rotation.y = world.uTime.value * 0.5
    beam.current.visible = env.dark > 0.3 || env.fog > 0.5 // the lamp only runs when it's needed
  })

  return (
    <>
      <ZoneMarker zone={{ ...ZONES.contact, x: MAILBOX.x, z: MAILBOX.z }} label={zoneText.contact.label} height={6} />
      <group position={[TOWER.x, y, TOWER.z]}>
        {STRIPES.map(([color, bottom, topR], i) => (
          <mesh key={i} position-y={SEGMENT * i + SEGMENT / 2} castShadow>
            <cylinderGeometry args={[topR, bottom, SEGMENT, 10]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.2, 3.02]} rotation-x={-0.1}>
          <boxGeometry args={[1.3, 2.4, 0.2]} />
          <meshLambertMaterial color="#2e2c5c" />
        </mesh>
        <mesh position-y={top + 0.15}>
          <cylinderGeometry args={[2.4, 2.2, 0.3, 10]} />
          <meshLambertMaterial color="#2e2c5c" flatShading />
        </mesh>
        <mesh position-y={top + 1.2}>
          <cylinderGeometry args={[1.25, 1.25, 1.8, 8]} />
          <meshBasicMaterial color="#ffe6a8" />
        </mesh>
        <mesh position-y={top + 2.8} castShadow>
          <coneGeometry args={[1.8, 1.5, 8]} />
          <meshLambertMaterial color="#ff7a59" flatShading />
        </mesh>
        <group ref={beam} position-y={top + 1.2}>
          {[0, Math.PI].map((a) => (
            <mesh key={a} rotation-y={a}>
              <mesh position-x={16} rotation-z={Math.PI / 2}>
                <coneGeometry args={[3.4, 32, 10, 1, true]} />
                <meshBasicMaterial color="#ffe6a8" alphaMap={fade} transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
              </mesh>
            </mesh>
          ))}
        </group>
      </group>
      <Mailbox />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[top / 2 + 2, 3.1]} position={[TOWER.x, y + top / 2 + 2, TOWER.z]} />
        <CuboidCollider args={[0.35, 0.9, 0.5]} position={[MAILBOX.x, heightAt(MAILBOX.x, MAILBOX.z) + 0.9, MAILBOX.z]} rotation={[0, Math.PI * 0.85, 0]} />
      </RigidBody>
    </>
  )
}
