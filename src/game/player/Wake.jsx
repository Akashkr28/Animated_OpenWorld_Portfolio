import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 12
const LIFE = 0.9
const scratch = new THREE.Object3D()

// Rings spreading from the player's legs while wading.
const Wake = forwardRef(function Wake(_, ref) {
  const mesh = useRef()
  const rings = useMemo(() => Array.from({ length: COUNT }, () => ({ age: LIFE, x: 0, y: -50, z: 0 })), [])
  const cursor = useRef(0)

  useImperativeHandle(ref, () => ({
    ring(x, y, z) {
      Object.assign(rings[cursor.current], { x, y, z, age: 0 })
      cursor.current = (cursor.current + 1) % COUNT
    },
  }), [rings])

  useFrame((_, dt) => {
    rings.forEach((r, i) => {
      r.age += dt
      const t = Math.min(1, r.age / LIFE)
      scratch.position.set(r.x, r.y, r.z)
      scratch.rotation.set(-Math.PI / 2, 0, 0)
      scratch.scale.setScalar(t >= 1 ? 0 : 0.35 + t * 1.7)
      scratch.updateMatrix()
      mesh.current.setMatrixAt(i, scratch.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, COUNT]} frustumCulled={false} renderOrder={2}>
      <ringGeometry args={[0.88, 1, 24]} />
      <meshBasicMaterial color="#f1fbff" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  )
})

export default Wake
