import { MapBase, pct } from '../Minimap'
import { LANDMARKS, SOCIAL, ZONES } from '../../game/world/layout'
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
      <span className="hud pointer-events-none absolute top-full z-10 mt-1 hidden rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap group-hover:block group-focus-visible:block">{label}</span>
    </button>
  )
}

export default function WorldMap() {
  const discovered = useGameStore((s) => s.discovered)
  const found = LANDMARKS.filter((l) => discovered[l.id])
  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-[min(30rem,60vh)] overflow-hidden rounded-2xl bg-[radial-gradient(circle,#2a86b5,#164e74)] shadow-[inset_0_0_40px_rgb(6_5_22/0.6)] ring-1 ring-cream/15">
        <MapBase />
        {Object.entries(ZONES).map(([id, zone]) => (
          <Pin key={id} x={zone.x} z={zone.z} label={zoneText[id].label} color={zone.color} onClick={() => teleportTo(id)} />
        ))}
        <Pin x={SOCIAL.x} z={SOCIAL.z} label="Find me online" color="#4aa3ff" square onClick={() => travel([SOCIAL.x - 7.5, SOCIAL.z], SOCIAL)} />
        {found.map((l) => (
          <Pin key={l.id} x={l.x} z={l.z} label={discoveries[l.id].title} color="#ffc27a" square onClick={() => travel([l.x + 3, l.z + 5], l)} />
        ))}
        <span
          aria-hidden="true"
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night bg-cream"
          style={{ left: `${pct(player.position.x)}%`, top: `${pct(player.position.z)}%` }}
        />
      </div>
      <p className="mt-4 text-center text-sm text-cream/85">
        {found.length} of {LANDMARKS.length} hidden places found. Follow the trails, climb the mountain and cross the bridges to find the rest.
      </p>
    </>
  )
}
