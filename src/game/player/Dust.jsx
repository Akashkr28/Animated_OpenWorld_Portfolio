import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 28
const LIFE = 0.65
const scratch = new THREE.Object3D()

const Dust = forwardRef(function Dust(_, ref) {
  const mesh = useRef()
  const motes = useMemo(() => Array.from({ length: COUNT }, () => ({
    age: LIFE, position: new THREE.Vector3(), velocity: new THREE.Vector3(), size: 0.2,
  })), [])
  const cursor = useRef(0)

  useImperativeHandle(ref, () => ({
    puff(at, amount) {
      for (let i = 0; i < amount + 1; i++) {
        const m = motes[cursor.current]
        cursor.current = (cursor.current + 1) % COUNT
        m.age = 0
        m.size = 0.07 + Math.random() * 0.09
        m.position.set(at.x + (Math.random() - 0.5) * 0.3, at.y + 0.08, at.z + (Math.random() - 0.5) * 0.3)
        m.velocity.set((Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.9)
      }
    },
  }), [motes])

  useFrame((_, dt) => {
    motes.forEach((m, i) => {
      m.age += dt
      const t = Math.min(1, m.age / LIFE)
      m.position.addScaledVector(m.velocity, dt)
      m.velocity.multiplyScalar(1 - dt * 2)
      scratch.position.copy(m.position)
      scratch.scale.setScalar(t >= 1 ? 0 : m.size * (0.6 + t * 1.1) * (1 - t * t))
      scratch.updateMatrix()
      mesh.current.setMatrixAt(i, scratch.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color="#eedcb8" flatShading />
    </instancedMesh>
  )
})

export default Dust
