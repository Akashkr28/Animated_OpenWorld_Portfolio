import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from './playerState'
import { heightAt } from '../world/heightfield'

export default function BlobShadow() {
  const mesh = useRef()
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    g.addColorStop(0, 'rgba(20,12,40,.5)')
    g.addColorStop(1, 'rgba(20,12,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(() => {
    const { x, y, z } = player.position
    const ground = heightAt(x, z)
    const lift = Math.min(1, Math.max(0, y - ground) / 3)
    mesh.current.position.set(x, ground + 0.09, z)
    mesh.current.scale.setScalar(1.5 - lift * 0.6)
    mesh.current.material.opacity = 1 - lift * 0.65
  })

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} fog={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}
