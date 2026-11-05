import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fadeTexture, pillLabel } from '../world/labels'
import { heightAt } from '../world/heightfield'
import { world } from '../world/uniforms'

const BEAM_HEIGHT = 26
const scratch = new THREE.Vector3()

export default function ZoneMarker({ zone, label, height = 10 }) {
  const sprite = useRef()
  const beam = useRef()
  const gem = useRef()
  const ground = heightAt(zone.x, zone.z)
  const { texture, aspect } = useMemo(() => pillLabel(label, { color: zone.color }), [label, zone.color])
  const fade = useMemo(fadeTexture, [])

  useFrame(({ camera }) => {
    const distance = camera.position.distanceTo(sprite.current.getWorldPosition(scratch))
    // Holds a readable on-screen size at range and fades out up close.
    const size = THREE.MathUtils.clamp(distance * 0.05, 1.5, 3.8 + distance * 0.012)
    sprite.current.scale.set(size * aspect, size, 1)
    sprite.current.material.opacity = THREE.MathUtils.smoothstep(distance, 9, 18) * (1 - THREE.MathUtils.smoothstep(distance, 130, 190))
    beam.current.material.opacity = 0.05 + 0.38 * THREE.MathUtils.smoothstep(distance, 10, 34)
    gem.current.rotation.y = world.uTime.value * 0.8
    gem.current.position.y = height - 2 + Math.sin(world.uTime.value * 1.4) * 0.25
  })

  return (
    <group position={[zone.x, ground, zone.z]}>
      <mesh ref={beam} position-y={BEAM_HEIGHT / 2}>
        <cylinderGeometry args={[1.1, 0.5, BEAM_HEIGHT, 10, 1, true]} />
        <meshBasicMaterial color={zone.color} alphaMap={fade} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
      <mesh ref={gem}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshBasicMaterial color={zone.color} fog={false} />
      </mesh>
      <sprite ref={sprite} position-y={height + 0.2} renderOrder={10}>
        <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} fog={false} />
      </sprite>
    </group>
  )
}
