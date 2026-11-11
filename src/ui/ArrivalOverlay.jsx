import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Color } from 'three'
import { endArrival } from '../game/Arrival'
import { world } from '../game/world/uniforms'

// Clouds the visitor falls out of, tinted to match the sky at this time of day.
export default function ArrivalOverlay() {
  const cloud = useMemo(() => new Color().copy(world.uHorizon.value).lerp(new Color('#ffffff'), 0.45).getStyle(), [])
  const bank = (at) => ({ background: `radial-gradient(ellipse 75% 95% at ${at} 50%, ${cloud} 58%, transparent 100%)` })
  const parting = { duration: 2, delay: 0.5, ease: [0.5, 0, 0.3, 1] }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <motion.div className="absolute inset-0" style={{ background: cloud }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, delay: 0.5 }} />
      <motion.div className="absolute inset-y-0 left-0 w-3/4" style={bank('0%')} initial={{ x: 0, opacity: 1 }} animate={{ x: '-100%', opacity: 0 }} transition={parting} />
      <motion.div className="absolute inset-y-0 right-0 w-3/4" style={bank('100%')} initial={{ x: 0, opacity: 1 }} animate={{ x: '100%', opacity: 0 }} transition={parting} />
      <button
        type="button" onClick={endArrival}
        className="hud hud-pill pointer-events-auto absolute right-4 bottom-6"
      >
        Skip intro <span aria-hidden="true" className="keycap !h-5 !min-w-5 !px-1 !text-[10px]">Any key</span>
      </button>
    </div>
  )
}
