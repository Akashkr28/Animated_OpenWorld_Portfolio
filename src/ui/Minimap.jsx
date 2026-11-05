import { useEffect, useMemo, useRef } from 'react'
import { islandRadius } from '../game/world/heightfield'
import { ISLET, LANDMARKS, MOUNTAIN, PATHS, RIVER, ZONES } from '../game/world/layout'
import { player } from '../game/player/playerState'
import { teleportTo } from '../game/teleport'
import { zoneText } from '../data/portfolio'
import { useGameStore } from '../store/useGameStore'

export const WORLD = 240 // world units from centre to the map's edge
export const pct = (v) => ((v + WORLD) / (WORLD * 2)) * 100
const VIEW = 80 // units shown from the player to the minimap's edge
const ZOOM = WORLD / VIEW

export function MapBase() {
  const { shore, roads, river } = useMemo(() => {
    const pts = []
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2, r = islandRadius(a) * 0.96
      pts.push(`${pct(Math.cos(a) * r).toFixed(1)},${pct(Math.sin(a) * r).toFixed(1)}`)
    }
    const line = (points) => points.map((p) => `${pct(p.x).toFixed(1)},${pct(p.z).toFixed(1)}`).join(' ')
    return { shore: pts.join(' '), roads: PATHS.map((p) => line(p.points)), river: line(RIVER) }
  }, [])
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
      <polygon points={shore} fill="#7fb85c" stroke="#f1d9a8" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx={pct(ISLET.x)} cy={pct(ISLET.z)} r="3.4" fill="#7fb85c" stroke="#f1d9a8" strokeWidth="0.6" />
      <circle cx={pct(MOUNTAIN.x)} cy={pct(MOUNTAIN.z)} r="8" fill="#8f8a96" />
      <circle cx={pct(MOUNTAIN.x)} cy={pct(MOUNTAIN.z)} r="3.4" fill="#f4f6fb" />
      <polyline points={river} fill="none" stroke="#4fd3c1" strokeWidth="1.1" strokeLinejoin="round" />
      {roads.map((r, i) => <polyline key={i} points={r} fill="none" stroke="#f1d9a8" strokeWidth="0.55" strokeLinejoin="round" />)}
    </svg>
  )
}

export default function Minimap() {
  const layer = useRef()
  const arrow = useRef()
  const visited = useGameStore((s) => s.visited)
  const discovered = useGameStore((s) => s.discovered)

  // The map slides under a fixed arrow, so the player is always in the centre.
  useEffect(() => {
    let frame
    const tick = () => {
      if (layer.current) {
        const x = pct(player.position.x) / 100, z = pct(player.position.z) / 100
        layer.current.style.transform = `translate(${(0.5 / ZOOM - x) * 100}%, ${(0.5 / ZOOM - z) * 100}%)`
        arrow.current.style.transform = `translate(-50%,-50%) rotate(${Math.PI - player.yaw}rad)`
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <nav aria-label="Island map" className="glass relative size-32 overflow-clip rounded-2xl bg-[#1f6f9c]/70 sm:size-40">
      <div ref={layer} className="absolute top-0 left-0" style={{ width: `${ZOOM * 100}%`, height: `${ZOOM * 100}%` }}>
        <MapBase />
        {LANDMARKS.filter((l) => discovered[l.id]).map((l) => (
          <span key={l.id} className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-apricot" style={{ left: `${pct(l.x)}%`, top: `${pct(l.z)}%` }} />
        ))}
        {Object.entries(ZONES).map(([id, zone]) => (
          <button
            key={id}
            type="button"
            onClick={(e) => { teleportTo(id); e.currentTarget.blur() }}
            aria-label={`Go to ${zoneText[id].label}${visited[id] ? ' (visited)' : ''}`}
            title={zoneText[id].label}
            className="group absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${pct(zone.x)}%`, top: `${pct(zone.z)}%` }}
          >
            <span
              className="block size-3 rounded-full border-2 border-night transition-transform group-hover:scale-150 group-focus-visible:scale-150"
              style={{ background: zone.color }}
            />
          </button>
        ))}
      </div>
      <svg ref={arrow} viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 left-1/2 size-3.5" aria-hidden="true">
        <path d="M6 0 11 12 6 9 1 12Z" fill="#fff4e3" stroke="#1b1838" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </nav>
  )
}
