import { camera, player } from './player/playerState'
import { ZONES } from './world/layout'
import { useGameStore } from '../store/useGameStore'

const FADE_MS = 280

export const teleportTo = (id) => travel(ZONES[id].arrival, ZONES[id])

export function travel([x, z], zone) {
  const game = useGameStore.getState()
  if (game.fading) return
  game.closePanel()
  game.finishTutorial()
  game.setFading(true)
  setTimeout(() => {
    player.teleport = { x, z }
    // Arrive looking at the zone.
    const dx = zone.x - x, dz = zone.z - z
    if (dx || dz) {
      player.yaw = Math.atan2(dx, dz)
      camera.yaw = player.yaw + Math.PI
    }
    setTimeout(() => useGameStore.getState().setFading(false), 160)
  }, FADE_MS)
}
