import { useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { BODY, DISPLAY } from '../world/labels'
import { heightAt } from '../world/heightfield'
import { GUESTBOOK } from '../world/layout'
import { useGameStore } from '../../store/useGameStore'

const W = 4, H = 2.7
const ROWS = 6

function drawBoard(context, { total, signed, names }) {
  const { width: w, height: h } = context.canvas
  context.fillStyle = '#2c2148'
  context.fillRect(0, 0, w, h)
  context.textAlign = 'center'
  context.fillStyle = '#ffc27a'
  context.font = `700 62px ${DISPLAY}`
  context.fillText('Island guestbook', w / 2, 82)
  context.fillStyle = '#fff4e3'
  context.font = `600 34px ${BODY}`
  context.fillText(`${total} ${total === 1 ? 'visitor' : 'visitors'} · ${signed} signed`, w / 2, 134)
  context.fillStyle = '#ff7a59'
  context.fillRect(w * 0.12, 158, w * 0.76, 4)
  context.font = `600 36px ${BODY}`
  context.fillStyle = '#fff4e3'
  if (!names.length) {
    context.fillText('Be the first to sign', w / 2, 300)
    return
  }
  context.textAlign = 'left'
  names.slice(0, ROWS * 2).forEach(({ name }, i) => {
    context.fillText(name, i < ROWS ? 80 : w / 2 + 30, 216 + (i % ROWS) * 54)
  })
}

export default function Guestbook() {
  const book = useGameStore((s) => s.guestbook)
  const y = heightAt(GUESTBOOK.x, GUESTBOOK.z)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 576
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])

  useEffect(() => {
    if (!book) return
    drawBoard(texture.image.getContext('2d'), book)
    texture.needsUpdate = true
  }, [book, texture])

  if (!book) return null
  return (
    <>
      <group position={[GUESTBOOK.x, y, GUESTBOOK.z]} rotation-y={GUESTBOOK.yaw}>
        <mesh position-y={2.4} castShadow>
          <boxGeometry args={[W + 0.2, H + 0.2, 0.2]} />
          <meshLambertMaterial color="#54362a" />
        </mesh>
        <mesh position={[0, 2.4, 0.11]}>
          <planeGeometry args={[W, H - 0.45]} />
          <meshLambertMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.45} />
        </mesh>
        {[-1.7, 1.7].map((x) => (
          <mesh key={x} position={[x, 0.55, -0.02]} castShadow>
            <boxGeometry args={[0.26, 1.1, 0.26]} />
            <meshLambertMaterial color="#54362a" />
          </mesh>
        ))}
        <mesh position-y={3.92} castShadow>
          <boxGeometry args={[W + 0.6, 0.18, 0.5]} />
          <meshLambertMaterial color="#2fb7a8" />
        </mesh>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2 + 0.1, 2, 0.2]} position={[GUESTBOOK.x, y + 2, GUESTBOOK.z]} rotation={[0, GUESTBOOK.yaw, 0]} />
      </RigidBody>
    </>
  )
}
