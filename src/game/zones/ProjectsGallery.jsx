import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { pedestals, ZONES } from '../world/layout'
import { pillLabel } from '../world/labels'
import { world } from '../world/uniforms'
import { zoneText } from '../../data/portfolio'
import { useGameStore } from '../../store/useGameStore'
import ZoneMarker from './ZoneMarker'

function Pedestal({ project, x, z, index }) {
  const crystal = useRef()
  const ring = useRef()
  const y = heightAt(x, z)
  const label = useMemo(() => pillLabel(project.title, { color: project.color, size: 44 }), [project])
  const id = `project-${project.id}`

  useFrame((_, dt) => {
    const near = useGameStore.getState().nearby?.id === id
    const t = world.uTime.value
    crystal.current.rotation.y = t * 0.7 + index
    crystal.current.position.y = 2.25 + Math.sin(t * 1.5 + index) * 0.1
    const target = near ? 1.3 : 1
    crystal.current.scale.setScalar(THREE.MathUtils.damp(crystal.current.scale.x, target, 8, dt))
    ring.current.material.opacity = THREE.MathUtils.damp(ring.current.material.opacity, near ? 0.9 : 0.3, 8, dt)
  })

  return (
    <group position={[x, y, z]}>
      <mesh position-y={0.1} receiveShadow>
        <cylinderGeometry args={[1.25, 1.4, 0.2, 6]} />
        <meshLambertMaterial color="#8d86a3" flatShading />
      </mesh>
      <mesh position-y={0.8} castShadow>
        <cylinderGeometry args={[0.62, 0.85, 1.25, 6]} />
        <meshLambertMaterial color="#3a3670" flatShading />
      </mesh>
      <mesh position-y={1.46}>
        <cylinderGeometry args={[0.8, 0.68, 0.1, 6]} />
        <meshLambertMaterial color={project.color} flatShading />
      </mesh>
      <mesh ref={crystal} position-y={2.25} castShadow>
        <octahedronGeometry args={[0.46, 0]} />
        <meshBasicMaterial color={project.color} />
      </mesh>
      <mesh ref={ring} position-y={0.24} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.5, 1.72, 24]} />
        <meshBasicMaterial color={project.color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <sprite position-y={3.35} scale={[0.72 * label.aspect, 0.72, 1]}>
        <spriteMaterial map={label.texture} transparent depthWrite={false} fog={false} />
      </sprite>
    </group>
  )
}

export default function ProjectsGallery() {
  return (
    <>
      <ZoneMarker zone={ZONES.projects} label={zoneText.projects.label} height={10} />
      {pedestals.map((p, i) => <Pedestal key={p.project.id} {...p} index={i} />)}
      <RigidBody type="fixed" colliders={false}>
        {pedestals.map(({ project, x, z }) => (
          <CylinderCollider key={project.id} args={[1.2, 0.85]} position={[x, heightAt(x, z) + 1.2, z]} />
        ))}
      </RigidBody>
    </>
  )
}
