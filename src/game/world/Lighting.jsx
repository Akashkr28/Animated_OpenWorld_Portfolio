import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { world } from './uniforms'
import { env, updateEnvironment } from './environment'
import { camera, player } from '../player/playerState'
import { prefersReducedMotion } from '../../lib/device'

const LANTERN = 15
const INDOOR_LANTERN = 5 // the room has its own light, and close walls would blow out

export default function Lighting({ shadows }) {
  const sun = useRef()
  const hemi = useRef()
  const lantern = useRef()
  const scene = useThree((s) => s.scene)
  const reduced = useRef(prefersReducedMotion())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    if (!reduced.current) world.uTime.value += dt
    updateEnvironment(dt)

    scene.fog.color.copy(world.uHorizon.value)
    scene.fog.near = world.uFogNear.value
    scene.fog.far = world.uFogFar.value

    const light = sun.current
    light.color.copy(env.light.color)
    light.intensity = env.light.intensity
    light.shadow.intensity = 0.85 * (1 - env.cloud * 0.75) * (env.sun.y > 0.02 ? env.sunUp : 0.6)
    hemi.current.color.copy(env.sky)
    hemi.current.groundColor.copy(env.ground)
    hemi.current.intensity = env.skyI + env.flash * 3

    // Shadow frustum tracks the player in coarse steps so edges don't shimmer.
    const px = Math.round(player.position.x / 2) * 2
    const pz = Math.round(player.position.z / 2) * 2
    light.target.position.set(px, player.position.y, pz)
    light.position.set(px, player.position.y, pz).addScaledVector(env.light.dir, 60)
    light.target.updateMatrixWorld()

    // Held slightly toward the camera so the character's face stays lit.
    lantern.current.position.set(
      player.position.x + Math.sin(camera.yaw) * 1.6, player.position.y + 2.2, player.position.z + Math.cos(camera.yaw) * 1.6,
    )
    lantern.current.intensity = env.dark * (player.indoors ? INDOOR_LANTERN : LANTERN)
  })

  return (
    <>
      <fog attach="fog" args={['#ffe6c7', 90, 430]} />
      <hemisphereLight ref={hemi} />
      <pointLight ref={lantern} color="#a9dcff" distance={20} decay={1.6} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
    </>
  )
}
