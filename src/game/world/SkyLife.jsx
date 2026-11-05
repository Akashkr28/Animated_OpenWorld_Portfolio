import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { mulberry32 } from './heightfield'
import { world } from './uniforms'
import { env } from './environment'
import { player } from '../player/playerState'

const BIRDS = 10
const CLOUDS = 30
const dummy = new THREE.Object3D()

function birdGeometry() {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.75, 0, -0.1, 0, 0, 0.26, 0, 0, -0.2,
    0.75, 0, -0.1, 0, 0, -0.2, 0, 0, 0.26,
  ], 3))
  g.computeVertexNormals()
  return g
}

function birdMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: '#2b2547', side: THREE.DoubleSide, fog: false })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = world.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += abs(position.x) * sin(uTime * 8.0 + instanceMatrix[3].x) * 0.65;`)
  }
  return m
}

export default function SkyLife() {
  const birds = useRef()
  const clouds = useRef()
  const flock = useMemo(() => {
    const rand = mulberry32(5)
    return Array.from({ length: BIRDS }, () => ({
      offset: rand() * 0.7, radius: 34 + rand() * 12, height: 19 + rand() * 6, speed: 0.1 + rand() * 0.015,
    }))
  }, [])
  const cloudData = useMemo(() => {
    const rand = mulberry32(9)
    return Array.from({ length: CLOUDS }, () => ({
      a: rand() * 6.28, r: 120 + rand() * 260, y: 62 + rand() * 42, s: 9 + rand() * 14, rot: rand() * 6,
    }))
  }, [])
  const geometries = useMemo(() => ({
    bird: birdGeometry(),
    cloud: mergeGeometries([
      new THREE.IcosahedronGeometry(1, 1).scale(1.6, 0.6, 1),
      new THREE.IcosahedronGeometry(0.8, 1).scale(1.1, 0.7, 1).translate(1.3, 0.1, 0.2),
      new THREE.IcosahedronGeometry(0.7, 1).scale(1.1, 0.6, 0.9).translate(-1.4, 0, -0.1),
    ]),
  }), [])
  const materials = useMemo(() => ({
    bird: birdMaterial(),
    cloud: new THREE.MeshBasicMaterial({ color: '#fff7ec', fog: false }),
  }), [])

  useFrame(() => {
    const t = world.uTime.value
    birds.current.visible = env.night < 0.6 && env.rain < 0.4
    clouds.current.count = Math.round(6 + env.cloud * (CLOUDS - 6))
    materials.cloud.color.copy(env.cloudColor)
    flock.forEach((b, i) => {
      const a = t * b.speed + b.offset
      const wobble = Math.sin(t * 0.3 + i) * 3
      dummy.position.set(Math.cos(a) * (b.radius + wobble), b.height + Math.sin(t * 0.5 + i) * 0.8, -6 + Math.sin(a) * (b.radius + wobble))
      dummy.rotation.set(0, -a + Math.PI, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      birds.current.setMatrixAt(i, dummy.matrix)
    })
    birds.current.instanceMatrix.needsUpdate = true

    cloudData.forEach((c, i) => {
      const a = c.a + t * (0.003 + env.wind * 0.006)
      dummy.position.set(Math.cos(a) * c.r + player.position.x * 0.6, c.y, Math.sin(a) * c.r + player.position.z * 0.6)
      dummy.rotation.set(0, c.rot, 0)
      dummy.scale.setScalar(c.s)
      dummy.updateMatrix()
      clouds.current.setMatrixAt(i, dummy.matrix)
    })
    clouds.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={birds} args={[geometries.bird, materials.bird, BIRDS]} frustumCulled={false} />
      <instancedMesh ref={clouds} args={[geometries.cloud, materials.cloud, CLOUDS]} frustumCulled={false} />
    </>
  )
}
