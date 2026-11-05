import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { player } from './player/playerState'
import { interactables, LANDMARKS, stones, ZONES } from './world/layout'
import { distToRiver } from './world/heightfield'
import { discoveries } from '../data/portfolio'
import { setAmbience } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const REVEAL_RADIUS = 3.8
const CHECK_INTERVAL = 0.1

// Proximity checks: nearest interactable, zones entered, milestones passed.
export default function Systems() {
  const clock = useRef(0)

  useFrame((_, dt) => {
    clock.current += dt
    if (clock.current < CHECK_INTERVAL) return
    clock.current = 0

    const game = useGameStore.getState()
    const { x, z } = player.position

    let nearest = null, best = Infinity
    for (const item of interactables) {
      const d = Math.hypot(item.x - x, item.z - z)
      if (d < item.radius && d < best) { best = d; nearest = item }
    }
    game.setNearby(nearest)

    if (game.tutorialDone) {
      for (const id in ZONES) {
        const zone = ZONES[id]
        if (zone.radius > 0 && Math.hypot(zone.x - x, zone.z - z) < zone.radius) game.markVisited(id)
      }
    }

    for (const l of LANDMARKS) {
      if (Math.hypot(l.x - x, l.z - z) < l.radius) {
        const { title, text } = discoveries[l.id]
        game.discover(l.id, title, text, LANDMARKS.length)
      }
    }
    setAmbience({ water: 1 - Math.min(1, Math.max(0, distToRiver(x, z)) / 30) })

    for (const stone of stones) {
      if (Math.hypot(stone.triggerX - x, stone.triggerZ - z) < REVEAL_RADIUS) {
        game.revealMilestone(stone.index)
        game.markVisited('journey')
      }
    }
  })

  return null
}
