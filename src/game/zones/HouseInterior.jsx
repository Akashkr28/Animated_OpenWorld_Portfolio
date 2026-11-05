import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../world/heightfield'
import { HOUSE, ROOM } from '../world/layout'
import { certifications, profile } from '../../data/portfolio'

const IN_X = HOUSE.halfW - 0.25
const IN_Z = HOUSE.halfD - 0.25
const WOOD = '#8a5a3c'
const DARK_WOOD = '#6b4632'
const SHOW_WITHIN = 28
const GLOW = 0.3 // the room stays warmly lit whatever the sky is doing
const BOOKS = ['#ff7a59', '#2fb7a8', '#ffc27a', '#c8b6ff', '#fff1dc', '#5b7fa6', '#d9534f']

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function Box({ size, position, color, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} emissive={color} emissiveIntensity={GLOW} />
    </mesh>
  )
}

function Lining({ position, rotation, size, color = '#fff1dc' }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshLambertMaterial color={color} emissive={color} emissiveIntensity={GLOW + 0.12} />
    </mesh>
  )
}

function Floor({ height }) {
  const texture = useMemo(() => {
    const t = canvasTexture(256, 256, (c, w, h) => {
      const rand = mulberry32(9)
      for (let i = 0; i < 8; i++) {
        c.fillStyle = `hsl(26 ${38 + rand() * 10}% ${40 + rand() * 9}%)`
        c.fillRect(0, (i * h) / 8, w, h / 8 - 2)
      }
    })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 2)
    return t
  }, [])
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={0.07}>
        <planeGeometry args={[IN_X * 2, IN_Z * 2]} />
        <meshLambertMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={GLOW} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={height - 0.01}>
        <planeGeometry args={[IN_X * 2, IN_Z * 2]} />
        <meshLambertMaterial color="#ffe3bf" emissive="#ffe3bf" emissiveIntensity={GLOW} />
      </mesh>
    </>
  )
}

function InnerWindow({ position, rotation }) {
  return (
    <group position={position} rotation-y={rotation}>
      <Box size={[1.3, 1.3, 0.04]} position={[0, 0, 0]} color={DARK_WOOD} />
      <mesh position-z={0.03}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial color="#ffe9c4" />
      </mesh>
      <Box size={[0.32, 1.5, 0.05]} position={[-0.62, -0.05, 0.08]} color="#ff7a59" />
      <Box size={[0.32, 1.5, 0.05]} position={[0.62, -0.05, 0.08]} color="#ff7a59" />
      <Box size={[1.7, 0.05, 0.05]} position={[0, 0.72, 0.08]} color={DARK_WOOD} />
    </group>
  )
}

function Desk() {
  const [x, z] = ROOM.desk
  const screen = useMemo(() => canvasTexture(320, 200, (c, w, h) => {
    c.fillStyle = '#16142e'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#ff7a59'
    c.fillRect(0, 0, w, 16)
    c.fillStyle = '#fff4e3'
    c.font = 'bold 24px Figtree, sans-serif'
    c.fillText(profile.name, 18, 54)
    c.fillStyle = '#ffc27a'
    c.font = '15px Figtree, sans-serif'
    c.fillText(profile.title, 18, 76)
    const rand = mulberry32(5)
    for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#2fb7a8', '#c8b6ff', '#ffc27a'][i % 3]
      c.fillRect(18 + (i % 3) * 14, 98 + i * 15, 50 + rand() * 170, 6)
    }
  }), [])
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.85, 0.06, 2]} position={[0, 0.78, 0]} color={WOOD} />
      {[[-0.36, -0.92], [0.36, -0.92], [-0.36, 0.92], [0.36, 0.92]].map(([lx, lz]) => (
        <Box key={`${lx}${lz}`} size={[0.07, 0.75, 0.07]} position={[lx, 0.4, lz]} color={DARK_WOOD} />
      ))}
      <group position={[0.02, 0.81, 0]} rotation-y={Math.PI / 2}>
        <Box size={[0.62, 0.025, 0.42]} position={[0, 0.012, 0]} color="#c9ced6" />
        <group position={[0, 0.02, -0.21]} rotation-x={-0.24}>
          <Box size={[0.62, 0.4, 0.02]} position={[0, 0.2, -0.01]} color="#c9ced6" />
          <mesh position={[0, 0.2, 0.002]}>
            <planeGeometry args={[0.57, 0.355]} />
            <meshBasicMaterial map={screen} />
          </mesh>
        </group>
      </group>
      {/* Mug and a small stack of notebooks */}
      <mesh position={[0.1, 0.86, 0.72]}>
        <cylinderGeometry args={[0.05, 0.045, 0.1, 12]} />
        <meshLambertMaterial color="#2fb7a8" emissive="#2fb7a8" emissiveIntensity={GLOW} />
      </mesh>
      <Box size={[0.3, 0.04, 0.22]} position={[0, 0.83, -0.7]} color="#ffc27a" />
      <Box size={[0.28, 0.04, 0.2]} position={[0.01, 0.87, -0.69]} color="#c8b6ff" />
      <mesh position={[0.8, 0.26, 0]}>
        <cylinderGeometry args={[0.24, 0.2, 0.06, 16]} />
        <meshLambertMaterial color="#ff7a59" emissive="#ff7a59" emissiveIntensity={GLOW} />
      </mesh>
      <mesh position={[0.8, 0.12, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.24, 8]} />
        <meshLambertMaterial color={DARK_WOOD} />
      </mesh>
    </group>
  )
}

function Bed() {
  const [x, z] = ROOM.bed
  return (
    <group position={[x, 0, z]}>
      <Box size={[2.3, 0.26, 1.2]} position={[0, 0.25, 0]} color={WOOD} />
      <Box size={[2.2, 0.2, 1.12]} position={[0, 0.46, 0]} color="#fff1dc" />
      <Box size={[1.4, 0.08, 1.16]} position={[0.4, 0.58, 0]} color="#ff7a59" />
      <Box size={[0.5, 0.14, 0.8]} position={[-0.8, 0.62, 0]} color="#ffffff" />
      <Box size={[0.1, 1.05, 1.24]} position={[-1.15, 0.55, 0]} color={DARK_WOOD} />
      <Box size={[0.1, 0.65, 1.24]} position={[1.15, 0.35, 0]} color={DARK_WOOD} />
    </group>
  )
}

function Bookshelf() {
  const [x, z] = ROOM.shelf
  const books = useRef()
  const placed = useMemo(() => {
    const rand = mulberry32(21)
    const list = []
    for (let row = 0; row < 4; row++) {
      for (let at = -0.8; at < 0.76;) {
        const width = 0.07 + rand() * 0.07
        const height = 0.3 + rand() * 0.14
        if (rand() > 0.12) list.push({ at: at + width / 2, y: 0.17 + row * 0.53 + height / 2, width, height, color: BOOKS[Math.floor(rand() * BOOKS.length)] })
        at += width + 0.006
      }
    }
    return list
  }, [])
  useLayoutEffect(() => {
    const m = new THREE.Object3D(), color = new THREE.Color()
    placed.forEach((b, i) => {
      m.position.set(b.at, b.y, -0.02)
      m.scale.set(b.width, b.height, 0.26)
      m.updateMatrix()
      books.current.setMatrixAt(i, m.matrix)
      books.current.setColorAt(i, color.set(b.color))
    })
    books.current.instanceMatrix.needsUpdate = true
    books.current.instanceColor.needsUpdate = true
  }, [placed])
  return (
    <group position={[x, 0, z]}>
      <Box size={[1.8, 2.3, 0.04]} position={[0, 1.2, 0.17]} color={DARK_WOOD} />
      <Box size={[0.06, 2.3, 0.38]} position={[-0.88, 1.2, 0]} color={WOOD} />
      <Box size={[0.06, 2.3, 0.38]} position={[0.88, 1.2, 0]} color={WOOD} />
      {[0, 1, 2, 3, 4].map((i) => <Box key={i} size={[1.76, 0.05, 0.36]} position={[0, 0.14 + i * 0.53, 0]} color={WOOD} />)}
      <instancedMesh ref={books} args={[null, null, placed.length]}>
        <boxGeometry />
        <meshLambertMaterial emissive="#55391f" />
      </instancedMesh>
    </group>
  )
}

function Certificate() {
  const [x, z] = ROOM.certificate
  const paper = useMemo(() => canvasTexture(320, 240, (c, w, h) => {
    c.fillStyle = '#fff8ea'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#c9a15a'
    c.lineWidth = 5
    c.strokeRect(12, 12, w - 24, h - 24)
    c.textAlign = 'center'
    c.fillStyle = '#6b4632'
    c.font = 'bold 22px Figtree, sans-serif'
    c.fillText('Certificate', w / 2, 62)
    c.font = 'bold 21px Figtree, sans-serif'
    c.fillStyle = '#1c1a3a'
    c.fillText(certifications[0].degree, w / 2, 112)
    c.font = '18px Figtree, sans-serif'
    c.fillText(certifications[0].school, w / 2, 146)
    c.fillStyle = '#ff7a59'
    c.beginPath()
    c.arc(w / 2, 188, 18, 0, Math.PI * 2)
    c.fill()
  }), [])
  return (
    <group position={[x, 1.75, z]} rotation-y={Math.PI / 2}>
      <Box size={[1, 0.78, 0.05]} position={[0, 0, 0]} color={DARK_WOOD} />
      <mesh position-z={0.03}>
        <planeGeometry args={[0.9, 0.68]} />
        <meshBasicMaterial map={paper} />
      </mesh>
    </group>
  )
}

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position-y={0.24}>
        <cylinderGeometry args={[0.24, 0.17, 0.42, 12]} />
        <meshLambertMaterial color="#ff7a59" emissive="#ff7a59" emissiveIntensity={GLOW} />
      </mesh>
      {[[0, 0.75, 0, 0.3], [0.17, 0.62, 0.08, 0.22], [-0.16, 0.65, -0.06, 0.24], [0.02, 0.6, -0.17, 0.2]].map(([px, py, pz, r]) => (
        <mesh key={`${px}${pz}`} position={[px, py, pz]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshLambertMaterial color="#3f9a5a" emissive="#3f9a5a" emissiveIntensity={GLOW} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export default function HouseInterior({ height }) {
  const group = useRef()
  // Nothing in here can be seen from far away, so it costs nothing out in the world.
  useFrame(({ camera }) => {
    group.current.visible = Math.hypot(camera.position.x - HOUSE.x, camera.position.z - HOUSE.z) < SHOW_WITHIN
  })
  const wallY = height / 2
  return (
    <group ref={group}>
      <Floor height={height} />
      <Lining position={[0, wallY, -IN_Z + 0.01]} size={[IN_X * 2, height]} />
      <Lining position={[0, wallY, IN_Z - 0.01]} rotation={[0, Math.PI, 0]} size={[IN_X * 2, height]} />
      <Lining position={[-IN_X + 0.01, wallY, 0]} rotation={[0, Math.PI / 2, 0]} size={[IN_Z * 2, height]} color="#ffe3bf" />

      {[-1.8, 1.8].map((x) => <InnerWindow key={`n${x}`} position={[x, 1.9, -IN_Z + 0.03]} rotation={0} />)}
      {[-1.8, 1.8].map((x) => <InnerWindow key={`s${x}`} position={[x, 1.9, IN_Z - 0.03]} rotation={Math.PI} />)}

      {[-1.6, 1.6].map((x) => <Box key={x} size={[0.18, 0.18, IN_Z * 2]} position={[x, height - 0.1, 0]} color={DARK_WOOD} />)}

      <mesh rotation-x={-Math.PI / 2} position={[0.7, 0.085, 0.1]}>
        <circleGeometry args={[1.7, 40]} />
        <meshLambertMaterial color="#2fb7a8" emissive="#2fb7a8" emissiveIntensity={GLOW} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.7, 0.09, 0.1]}>
        <ringGeometry args={[1.15, 1.35, 40]} />
        <meshLambertMaterial color="#ffc27a" emissive="#ffc27a" emissiveIntensity={GLOW} />
      </mesh>

      <Desk />
      <Bed />
      <Bookshelf />
      <Certificate />
      <Plant position={[ROOM.plant[0], 0, ROOM.plant[1]]} />

      {/* Pendant lamp */}
      <Box size={[0.03, 0.3, 0.03]} position={[0.7, height - 0.15, 0.1]} color="#2a2438" />
      <mesh position={[0.7, height - 0.42, 0.1]}>
        <coneGeometry args={[0.36, 0.3, 20, 1, true]} />
        <meshLambertMaterial color="#ff7a59" emissive="#ff7a59" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.7, height - 0.52, 0.1]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshBasicMaterial color="#fff0c9" />
      </mesh>
    </group>
  )
}
