import { MapBase, pct } from '../Minimap'
import { LANDMARKS, ZONES } from '../../game/world/layout'
import { player } from '../../game/player/playerState'
import { teleportTo, travel } from '../../game/teleport'
import { discoveries, zoneText } from '../../data/portfolio'
import { useGameStore } from '../../store/useGameStore'

function Pin({ x, z, label, color, square, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Travel to ${label}`}
      title={label}
      className="group absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center"
      style={{ left: `${pct(x)}%`, top: `${pct(z)}%` }}
    >
      <span className={`block size-3.5 border-2 border-night transition-transform group-hover:scale-150 group-focus-visible:scale-150 ${square ? 'rotate-45' : 'rounded-full'}`} style={{ background: color }} />
      <span className="pointer-events-none absolute top-full z-10 hidden rounded-md bg-night px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap group-hover:block group-focus-visible:block">{label}</span>
    </button>
  )
}

export default function WorldMap() {
  const discovered = useGameStore((s) => s.discovered)
  const found = LANDMARKS.filter((l) => discovered[l.id])
  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-[min(30rem,60vh)] overflow-hidden rounded-2xl bg-[#1f6f9c]">
        <MapBase />
        {Object.entries(ZONES).map(([id, zone]) => (
          <Pin key={id} x={zone.x} z={zone.z} label={zoneText[id].label} color={zone.color} onClick={() => teleportTo(id)} />
        ))}
        {found.map((l) => (
          <Pin key={l.id} x={l.x} z={l.z} label={discoveries[l.id].title} color="#ffc27a" square onClick={() => travel([l.x + 3, l.z + 5], l)} />
        ))}
        <span
          aria-hidden="true"
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night bg-cream"
          style={{ left: `${pct(player.position.x)}%`, top: `${pct(player.position.z)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-cream/85">
        {found.length} of {LANDMARKS.length} hidden places found. Follow the trails, climb the mountain and cross the bridges to find the rest.
      </p>
    </>
  )
}
