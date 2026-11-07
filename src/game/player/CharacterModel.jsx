import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import Greeting from './Greeting'
import { character } from './characterConfig'
import { player } from './playerState'
import { arrival } from '../Arrival'

const FADE = 0.22
const WALK_SPEED = 3.8
const RUN_SPEED = 7.2

export default function CharacterModel() {
  const group = useRef()
  const { scene, animations } = useGLTF(character.url)
  const { actions } = useAnimations(animations, group)
  const current = useRef(null)

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
      }
    })
  }, [scene])

  useFrame(() => {
    // Runs after the clips: asleep, his eyes stay shut and his thrusters go out.
    if (player.sleeping) {
      scene.getObjectByName('eyesOpen')?.scale.set(1, 0.08, 1)
      scene.getObjectByName('thrust')?.scale.setScalar(0.001)
    }

    if (arrival.active) scene.getObjectByName('thrust')?.scale.setScalar(1 + arrival.boost)

    const next = actions[character.clips[player.anim]] ?? actions[character.clips.idle]
    if (!next) return
    if (current.current !== next) {
      current.current?.fadeOut(FADE)
      next.reset().fadeIn(FADE).play()
      current.current = next
    }
    // Keeps stride in step with ground speed so feet don't slide.
    if (player.anim === 'walk') next.timeScale = Math.max(0.6, player.speed / WALK_SPEED)
    else if (player.anim === 'run') next.timeScale = Math.max(0.7, player.speed / RUN_SPEED)
    else next.timeScale = 1
  })

  return (
    <group ref={group} scale={character.scale} rotation-y={character.rotationY}>
      <primitive object={scene} />
      <Greeting />
    </group>
  )
}

useGLTF.preload(character.url)
