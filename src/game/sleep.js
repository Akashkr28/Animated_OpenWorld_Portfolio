import { player } from './player/playerState'
import { env } from './world/environment'
import { robot } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const FADE_MS = 280
const NAP_MS = 3800
const MORNING = 0.3

// He climbs into bed, snores a little, and wakes to a fresh morning.
export function sleep() {
  const game = useGameStore.getState()
  if (game.fading || player.sleeping) return
  game.setFading(true)
  setTimeout(() => {
    player.sleeping = true
    game.setFading(false)
    game.showToast('Zzz…', 'Sleeping until morning')
    robot('snore')
    setTimeout(() => {
      game.setFading(true)
      setTimeout(() => {
        env.time = MORNING
        env.timeTarget = null
        player.sleeping = false
        game.setFading(false)
        game.showToast('Good morning!', 'A fresh day on the island')
        game.greet()
      }, FADE_MS)
    }, NAP_MS)
  }, FADE_MS)
}
