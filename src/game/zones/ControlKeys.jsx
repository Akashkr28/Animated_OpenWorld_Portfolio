import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { BODY, DISPLAY } from '../world/labels'
import { env } from '../world/environment'
import { world } from '../world/uniforms'
import { useGameStore } from '../../store/useGameStore'

// The controls, set into the plaza floor in front of where the robot lands. Each key sinks and
// lights up while it's held, and until the visitor first moves they pulse in turn as an invitation.
const KEY = 0.9
// Laid out between the robot's landing spot and the camera, so they fill the lower screen.
const KEYS = [
  { id: 'w', legend: 'W', x: -3, z: 19.3, codes: ['KeyW', 'ArrowUp'] },
  { id: 'a', legend: 'A', x: -4, z: 20.3, codes: ['KeyA', 'ArrowLeft'] },
  { id: 's', legend: 'S', x: -3, z: 20.3, codes: ['KeyS', 'ArrowDown'] },
  { id: 'd', legend: 'D', x: -2, z: 20.3, codes: ['KeyD', 'ArrowRight'] },
  { id: 'shift', legend: 'Shift', x: -0.3, z: 20.3, width: 1.6, codes: ['ShiftLeft', 'ShiftRight'] },
  { id: 'space', legend: 'Space', x: 3, z: 20.3, width: 2.4, codes: ['Space'] },
  // The back row has no room for a label in front, so its action is printed on the cap.
  { id: 'e', legend: 'E', hint: 'Interact', x: 1.9, z: 19.3, codes: ['KeyE'] },
  { id: 'm', legend: 'M', hint: 'Map', x: 3, z: 19.3, codes: ['KeyM'] },
  { id: 'g', legend: 'G', hint: 'Wave', x: 4.1, z: 19.3, codes: ['KeyG'] },
]
const LABELS = [
  { text: 'Walk', x: -3, z: 21.15 },
  { text: 'Run', x: -0.3, z: 21.15 },
  { text: 'Jump', x: 3, z: 21.15 },
  { text: 'Drag to look', x: 1.35, z: 21.15, small: true },
]
const INVITE = ['w', 'a', 's', 'd', 'space', 'shift', 'e']

function textTexture(text, font, { width = 512, height = 192, color = '#fff4e3', hint } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2 + (hint ? -22 : 4))
  if (hint) {
    ctx.font = `700 46px ${BODY}`
    ctx.globalAlpha = 0.8
    ctx.fillText(hint, width / 2, height - 42)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function Key({ spec, held }) {
  const width = spec.width ?? KEY
  const cap = useRef()
  const legend = useMemo(() => {
    const long = spec.legend.length > 1
    const texture = textTexture(spec.legend, `800 ${long ? 96 : spec.hint ? 128 : 150}px ${DISPLAY}`, { width: long ? 640 : 256, height: 256, hint: spec.hint })
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: true })
  }, [spec.legend, spec.hint])
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc27a', transparent: true, opacity: 0, depthWrite: false }), [])
  useEffect(() => () => { legend.map.dispose(); legend.dispose(); glow.dispose() }, [legend, glow])
  const base = heightAt(spec.x, spec.z)

  useFrame((_, dt) => {
    const game = useGameStore.getState()
    const pressed = held.current.has(spec.id)
    // Before the first move, the keys light up one after another.
    const step = Math.floor(world.uTime.value * 2.2) % (INVITE.length + 2)
    const invite = !game.tutorialDone && INVITE[step] === spec.id ? 1 : 0
    const lit = Math.max(pressed ? 1 : 0, invite * 0.7)
    cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, pressed ? 0.05 : 0.14, 18, dt)
    glow.opacity = THREE.MathUtils.damp(glow.opacity, lit * 0.85, 12, dt)
    // The legend glows past white when lit, so the bloom catches it, and softly at night.
    legend.color.setScalar(THREE.MathUtils.damp(legend.color.r, 0.85 + env.dark * 0.35 + lit * 1.6, 12, dt))
  })

  return (
    <group position={[spec.x, base, spec.z]}>
      <mesh position-y={0.03} receiveShadow>
        <boxGeometry args={[width + 0.16, 0.06, KEY + 0.16]} />
        <meshLambertMaterial color="#5d5679" />
      </mesh>
      <mesh position-y={0.065} rotation-x={-Math.PI / 2} material={glow}>
        <planeGeometry args={[width + 0.5, KEY + 0.5]} />
      </mesh>
      <group ref={cap} position-y={0.14}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, 0.16, KEY]} />
          <meshLambertMaterial color="#2e2c5c" />
        </mesh>
        <mesh position-y={0.082} castShadow>
          <boxGeometry args={[width - 0.12, 0.012, KEY - 0.12]} />
          <meshLambertMaterial color="#3a3670" />
        </mesh>
        <mesh position-y={0.09} rotation-x={-Math.PI / 2} material={legend}>
          <planeGeometry args={[spec.legend.length > 1 ? width - 0.15 : KEY - 0.15, KEY - 0.15]} />
        </mesh>
      </group>
    </group>
  )
}

function Label({ text, x, z, small }) {
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    map: textTexture(text, `700 ${small ? 104 : 120}px ${BODY}`, { width: 768, height: 192, color: '#3b2a22' }),
    transparent: true, opacity: 0.72, depthWrite: false,
  }), [text, small])
  useEffect(() => () => { material.map.dispose(); material.dispose() }, [material])
  const w = small ? 1.3 : 1.6
  return (
    <mesh position={[x, heightAt(x, z) + 0.035, z]} rotation-x={-Math.PI / 2} material={material}>
      <planeGeometry args={[w, w / 4]} />
    </mesh>
  )
}

export default function ControlKeys() {
  const held = useRef(new Set())

  useEffect(() => {
    const byCode = new Map(KEYS.flatMap((k) => k.codes.map((code) => [code, k.id])))
    const typing = (el) => el?.matches?.('input, textarea, select, [contenteditable]')
    const down = (e) => { if (byCode.has(e.code) && !typing(e.target)) held.current.add(byCode.get(e.code)) }
    const up = (e) => { if (byCode.has(e.code)) held.current.delete(byCode.get(e.code)) }
    const clear = () => held.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return (
    <>
      {KEYS.map((spec) => <Key key={spec.id} spec={spec} held={held} />)}
      {LABELS.map((label) => <Label key={label.text} {...label} />)}
    </>
  )
}
