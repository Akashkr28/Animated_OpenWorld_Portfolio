import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import SharedShader from '../world/SharedShader'
import { heightAt, WALKWAYS } from '../world/heightfield'
import { landmark, LANTERNS } from '../world/layout'
import { env } from '../world/environment'
import { world } from '../world/uniforms'

const dummy = new THREE.Object3D()
const STONE = '#9a95a8'
const WOOD = '#7a5038'

const at = (id) => { const l = landmark(id); return [l.x, heightAt(l.x, l.z), l.z] }

function Instanced({ items, color, children, castShadow = true }) {
  const mesh = useRef()
  useLayoutEffect(() => {
    items.forEach((m, i) => mesh.current.setMatrixAt(i, m))
    mesh.current.instanceMatrix.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={mesh} args={[null, null, items.length]} castShadow={castShadow} frustumCulled={false}>
      {children}
      <meshLambertMaterial color={color} flatShading />
    </instancedMesh>
  )
}

function Walkway({ walkway }) {
  const { a, b, ya, yb, arch, width, pieces } = walkway
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  const heightOn = (t) => ya + (yb - ya) * t + arch * Math.sin(Math.PI * t)

  const { planks, posts, colliders } = useMemo(() => {
    const planks = [], posts = []
    const count = Math.round(length / 0.62)
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const pitch = -Math.atan2(heightOn(t + 0.01) - heightOn(t - 0.01), length * 0.02)
      dummy.position.set(a.x + dx * t, heightOn(t) - 0.1, a.z + dz * t)
      dummy.rotation.set(pitch, yaw, 0, 'YXZ')
      dummy.scale.set(width * 2, 0.11, 0.54)
      dummy.updateMatrix()
      planks.push(dummy.matrix.clone())
    }
    const postCount = Math.max(2, Math.round(length / 3.4))
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount
      for (const side of [-1, 1]) {
        const x = a.x + dx * t + (dz / length) * side * width, z = a.z + dz * t - (dx / length) * side * width
        const top = heightOn(t) + 1
        const bottom = Math.min(heightOn(t) - 0.2, Math.max(heightAt(x, z), -3))
        dummy.position.set(x, (top + bottom) / 2, z)
        dummy.rotation.set(0, 0, 0, 'XYZ')
        dummy.scale.set(0.15, top - bottom, 0.15)
        dummy.updateMatrix()
        posts.push(dummy.matrix.clone())
      }
    }
    const colliders = Array.from({ length: pieces }, (_, i) => {
      const t0 = i / pieces, t1 = (i + 1) / pieces, tm = (t0 + t1) / 2
      const rise = heightOn(t1) - heightOn(t0), run = length / pieces
      const e = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(rise, run), yaw, 0, 'YXZ')), 'XYZ',
      )
      return {
        position: [a.x + dx * tm, heightOn(tm) - 0.14, a.z + dz * tm],
        rotation: [e.x, e.y, e.z],
        half: [width, 0.12, Math.hypot(rise, run) / 2 + 0.05],
      }
    })
    return { planks, posts, colliders }
  }, [walkway]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Instanced items={planks} color="#9a7350"><boxGeometry /></Instanced>
      <Instanced items={posts} color={WOOD}><boxGeometry /></Instanced>
      <RigidBody type="fixed" colliders={false}>
        {colliders.map((c, i) => <CuboidCollider key={i} args={c.half} position={c.position} rotation={c.rotation} />)}
      </RigidBody>
    </>
  )
}

// A cloth flag rippling in the wind direction.
function Flag({ position, color = '#ff7a59' }) {
  const uniforms = useMemo(() => ({
    uTime: world.uTime, uWind: world.uWind, uWindDir: world.uWindDir, uColor: { value: new THREE.Color(color) }, uNight: world.uNight,
  }), [color])
  return (
    <group position={position}>
      <mesh position-y={2.4} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 4.8, 6]} />
        <meshLambertMaterial color="#54362a" />
      </mesh>
      <mesh position-y={4.2} frustumCulled={false}>
        <planeGeometry args={[1.9, 1.05, 16, 4]} />
        <SharedShader
          side={THREE.DoubleSide} uniforms={uniforms}
          vertexShader={/* glsl */ `
            uniform float uTime, uWind;
            uniform vec2 uWindDir;
            varying float vShade;
            void main() {
              float s = position.x / 1.9 + 0.5; // 0 at the pole
              float streak = 0.28 + uWind * 0.72;
              float wave = sin(s * 9.0 - uTime * (5.0 + uWind * 8.0)) * s * (0.1 + uWind * 0.2);
              vec3 dir = vec3(uWindDir.x, 0.0, uWindDir.y);
              vec3 side = vec3(-dir.z, 0.0, dir.x);
              vec3 p = dir * s * 1.9 * streak + side * wave + vec3(0.0, position.y - s * (1.0 - streak) * 0.95, 0.0);
              vShade = 0.72 + 0.28 * cos(s * 9.0 - uTime * (5.0 + uWind * 8.0));
              gl_Position = projectionMatrix * viewMatrix * (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(p, 0.0));
            }`}
          fragmentShader={/* glsl */ `
            uniform vec3 uColor;
            uniform float uNight;
            varying float vShade;
            void main() {
              gl_FragColor = vec4(uColor * vShade * (1.0 - uNight * 0.72), 1.0);
              #include <colorspace_fragment>
            }`}
        />
      </mesh>
    </group>
  )
}

function Windmill() {
  const [x, y, z] = at('windmill')
  const rotor = useRef()
  useFrame((_, dt) => { rotor.current.rotation.z -= dt * (0.25 + env.wind * 3.4) })
  return (
    <>
      <group position={[x, y, z]} rotation-y={-0.5}>
        <mesh position-y={4.2} castShadow>
          <cylinderGeometry args={[1.7, 2.8, 8.4, 8]} />
          <meshLambertMaterial color="#fff1dc" flatShading />
        </mesh>
        <mesh position-y={9.3} castShadow>
          <coneGeometry args={[2.2, 2, 8]} />
          <meshLambertMaterial color="#2e2c5c" flatShading />
        </mesh>
        <mesh position={[0, 1.2, 2.75]}>
          <boxGeometry args={[1.2, 2.4, 0.2]} />
          <meshLambertMaterial color="#7a5038" />
        </mesh>
        <group ref={rotor} position={[0, 8, 2.2]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.28, 0.28, 0.7, 8]} />
            <meshLambertMaterial color={WOOD} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation-z={(i * Math.PI) / 2}>
              <mesh position-y={2.8} castShadow>
                <boxGeometry args={[0.16, 5.6, 0.1]} />
                <meshLambertMaterial color={WOOD} />
              </mesh>
              <mesh position={[0.46, 3.4, 0]} castShadow>
                <boxGeometry args={[0.92, 3.8, 0.04]} />
                <meshLambertMaterial color="#ffc27a" side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[4.2, 2.7]} position={[x, y + 4.2, z]} />
      </RigidBody>
    </>
  )
}

function Grove() {
  const [x, y, z] = at('grove')
  const crystal = useRef()
  const stones = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return [x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 1.9 + (i % 3) * 0.5, a]
  }), [x, z])
  useFrame(() => {
    crystal.current.rotation.y = world.uTime.value * 0.6
    crystal.current.material.color.set('#7ad7f0').lerp(new THREE.Color('#c8b6ff'), env.night)
  })
  return (
    <>
      {stones.map(([sx, sz, h, a], i) => (
        <mesh key={i} position={[sx, heightAt(sx, sz) + h / 2, sz]} rotation-y={-a} scale={[0.7, h, 0.5]} castShadow>
          <boxGeometry />
          <meshLambertMaterial color="#79808a" flatShading />
        </mesh>
      ))}
      <mesh ref={crystal} position={[x, y + 2, z]}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {stones.map(([sx, sz, h], i) => <CylinderCollider key={i} args={[h / 2, 0.5]} position={[sx, heightAt(sx, sz) + h / 2, sz]} />)}
      </RigidBody>
    </>
  )
}

function Ruins() {
  const [x, , z] = at('ruins')
  const columns = useMemo(() => [
    [-6, -5, 6], [-2, -6, 3.4], [2, -6, 6], [6, -5, 2.2], [-6, 3, 4.6], [6, 3, 6], [-2, 5, 1.6], [2.6, 5, 3],
  ].map(([cx, cz, h]) => [x + cx, z + cz, h]), [x, z])
  return (
    <>
      {columns.map(([cx, cz, h], i) => {
        const y = heightAt(cx, cz)
        return (
          <group key={i} position={[cx, y, cz]}>
            <mesh position-y={0.2}>
              <boxGeometry args={[1.5, 0.4, 1.5]} />
              <meshLambertMaterial color={STONE} />
            </mesh>
            <mesh position-y={h / 2 + 0.3} rotation-z={i % 3 === 1 ? 0.05 : 0} castShadow>
              <cylinderGeometry args={[0.46, 0.56, h, 8]} />
              <meshLambertMaterial color="#b4afbc" flatShading />
            </mesh>
          </group>
        )
      })}
      <mesh position={[x - 2, heightAt(x, z - 6) + 6.5, z - 6]} rotation-z={0.03} castShadow>
        <boxGeometry args={[10, 0.7, 1.3]} />
        <meshLambertMaterial color="#a7a2b0" flatShading />
      </mesh>
      <mesh position={[x + 1, heightAt(x + 1, z + 1) + 0.4, z + 1]} rotation={[0.1, 0.5, 0.2]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
        <meshLambertMaterial color="#b4afbc" flatShading />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {columns.map(([cx, cz, h], i) => <CylinderCollider key={i} args={[h / 2 + 0.3, 0.72]} position={[cx, heightAt(cx, cz) + h / 2 + 0.3, cz]} />)}
      </RigidBody>
    </>
  )
}

function Cove() {
  const [x, y, z] = at('cove')
  const flame = useRef()
  useFrame(() => {
    const t = world.uTime.value
    flame.current.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.08, 1 + Math.cos(t * 11) * 0.1)
    flame.current.visible = env.rain < 0.75
  })
  return (
    <>
      <group position={[x, y, z]}>
        {[0, 1.05, 2.1].map((r) => (
          <mesh key={r} position-y={0.13} rotation={[Math.PI / 2, 0, r]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 1.5, 6]} />
            <meshLambertMaterial color="#54362a" />
          </mesh>
        ))}
        <group ref={flame} position-y={0.2}>
          <mesh position-y={0.4}>
            <coneGeometry args={[0.36, 0.95, 6]} />
            <meshBasicMaterial color="#ff8a3c" />
          </mesh>
          <mesh position-y={0.3}>
            <coneGeometry args={[0.2, 0.58, 6]} />
            <meshBasicMaterial color="#ffe08a" />
          </mesh>
        </group>
        <mesh position={[3.4, 1.2, -2]} rotation-y={0.785} castShadow>
          <coneGeometry args={[2.3, 2.4, 4]} />
          <meshLambertMaterial color="#2fb7a8" flatShading />
        </mesh>
        <mesh position={[-2.2, 0.28, 1.2]} rotation={[0, 0.5, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 2, 7]} />
          <meshLambertMaterial color={WOOD} flatShading />
        </mesh>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.2, 1.7]} position={[x + 3.4, y + 1.2, z - 2]} />
        <CylinderCollider args={[0.5, 0.65]} position={[x, y + 0.5, z]} />
      </RigidBody>
    </>
  )
}

function Summit() {
  const [x, y, z] = at('summit')
  const stones = [[0, 0.4, 0, 1.2], [0.1, 1.2, 0.1, 0.8], [-0.1, 1.8, 0, 0.55], [0, 2.25, 0, 0.36]]
  return (
    <>
      {stones.map(([sx, sy, sz, r], i) => (
        <mesh key={i} position={[x + sx, y + sy, z + sz]} rotation-y={i} scale={[r, r * 0.68, r]} castShadow>
          <dodecahedronGeometry />
          <meshLambertMaterial color={STONE} flatShading />
        </mesh>
      ))}
      <Flag position={[x + 1.6, y, z + 0.6]} />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.3, 1.1]} position={[x, y + 1.3, z]} />
      </RigidBody>
    </>
  )
}

function Boat({ position }) {
  const hull = useRef()
  useFrame(() => {
    const t = world.uTime.value
    hull.current.position.y = position[1] + Math.sin(t * 1.1) * 0.1 * (0.6 + env.wind)
    hull.current.rotation.z = Math.sin(t * 0.9) * 0.07 * (0.6 + env.wind)
    hull.current.rotation.x = Math.cos(t * 0.7) * 0.05 * (0.6 + env.wind)
  })
  return (
    <group ref={hull} position={position}>
      <mesh scale={[1, 0.5, 2.6]} position-y={0.1} castShadow>
        <cylinderGeometry args={[1, 0.62, 1, 8]} />
        <meshLambertMaterial color="#ff7a59" flatShading />
      </mesh>
      <mesh position-y={0.38}>
        <boxGeometry args={[1.5, 0.08, 0.34]} />
        <meshLambertMaterial color="#fff1dc" />
      </mesh>
    </group>
  )
}

function Pier() {
  const pier = WALKWAYS[0]
  return (
    <>
      <Flag position={[pier.b.x - 1.2, pier.yb - 0.12, pier.b.z - 0.5]} color="#2fb7a8" />
      <Boat position={[pier.b.x + 3.6, 0.15, pier.b.z - 6]} />
    </>
  )
}

function Isle() {
  const [x, y, z] = at('isle')
  return (
    <>
      <group position={[x, y, z]}>
        <mesh position-y={0.3}>
          <cylinderGeometry args={[1.5, 1.8, 0.6, 6]} />
          <meshLambertMaterial color={STONE} flatShading />
        </mesh>
        <mesh position-y={2} castShadow>
          <cylinderGeometry args={[0.32, 0.5, 2.8, 6]} />
          <meshLambertMaterial color="#aca7b8" flatShading />
        </mesh>
        <mesh position-y={3.9}>
          <boxGeometry args={[1.3, 1.1, 1.3]} />
          <meshBasicMaterial color="#ffd591" />
        </mesh>
        <mesh position-y={4.95} castShadow>
          <coneGeometry args={[1.5, 1, 4]} />
          <meshLambertMaterial color="#2e2c5c" flatShading />
        </mesh>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[2.5, 1.5]} position={[x, y + 2.5, z]} />
      </RigidBody>
    </>
  )
}

function TrailLanterns() {
  const posts = useMemo(() => LANTERNS.map(([x, z]) => {
    dummy.position.set(x, heightAt(x, z) + 0.95, z)
    dummy.rotation.set(0, 0, 0, 'XYZ')
    dummy.scale.set(0.1, 1.9, 0.1)
    dummy.updateMatrix()
    return dummy.matrix.clone()
  }), [])
  const heads = useMemo(() => LANTERNS.map(([x, z]) => {
    dummy.position.set(x, heightAt(x, z) + 2.05, z)
    dummy.scale.setScalar(0.27)
    dummy.updateMatrix()
    return dummy.matrix.clone()
  }), [])
  return (
    <>
      <Instanced items={posts} color="#2e2c5c"><boxGeometry /></Instanced>
      <Instanced items={heads} color="#ffc27a" castShadow={false}><boxGeometry /></Instanced>
      <RigidBody type="fixed" colliders={false}>
        {LANTERNS.map(([x, z], i) => <CylinderCollider key={i} args={[1, 0.12]} position={[x, heightAt(x, z) + 1, z]} />)}
      </RigidBody>
    </>
  )
}

export default function Landmarks() {
  return (
    <>
      {WALKWAYS.map((w) => <Walkway key={w.id} walkway={w} />)}
      <Windmill />
      <Grove />
      <Ruins />
      <Cove />
      <Summit />
      <Pier />
      <Isle />
      <TrailLanterns />
    </>
  )
}
