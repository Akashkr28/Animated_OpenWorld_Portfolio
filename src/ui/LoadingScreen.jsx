import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { profile } from '../data/portfolio'

const TIPS = [
  'Open the world map to travel anywhere in a moment.',
  'Eight hidden places are waiting out in the wilds.',
  'Walk up to anything glowing to open it.',
  'Prefer a plain page? Classic view is one click away.',
]

export default function LoadingScreen() {
  const ready = useGameStore((s) => s.ready)
  const target = useGameStore((s) => s.loadProgress ?? 0)
  const setMode = useGameStore((s) => s.setMode)
  const [shown, setShown] = useState(4)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  // Eases toward the real stage value and creeps during steps with no progress events.
  useEffect(() => {
    const id = setInterval(() => {
      setShown((v) => {
        if (ready) return 100
        const ceiling = Math.min(96, target + 14)
        return v + (ceiling - v) * 0.06
      })
    }, 60)
    return () => clearInterval(id)
  }, [ready, target])

  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="loading"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-[radial-gradient(ellipse_at_50%_40%,#2e2c5c,#14122e_70%)] px-6 text-center"
        >
          <svg viewBox="0 0 120 56" className="w-36 drop-shadow-[0_0_24px_rgb(255_122_89/0.45)]" aria-hidden="true">
            <path d="M8 44C28 20 44 16 60 16s36 8 52 28Z" fill="#2fb7a8" />
            <path d="M60 2 74 30H46Z" fill="#ff7a59" />
            <path d="M0 48q15-7 30 0t30 0 30 0 30 0" fill="none" stroke="#ffc27a" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <p className="hud-label">An interactive portfolio</p>
            <h1 className="text-glow mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{profile.name}</h1>
            <p className="mt-1 text-cream/75">{profile.title}</p>
          </div>
          <div
            role="progressbar"
            aria-label="Loading the island"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shown)}
            className="w-72 max-w-full"
          >
            <div className="meter warm !h-1.5"><span style={{ width: `${shown}%`, transition: 'none' }} /></div>
            <p className="mt-2 flex justify-between text-xs text-cream/65">
              <span>Washing ashore…</span>
              <span className="font-display font-bold text-apricot tabular-nums">{Math.round(shown)}%</span>
            </p>
          </div>
          <p className="max-w-xs text-sm text-cream/70"><span className="hud-label mr-1.5 !text-apricot">Tip</span>{tip}</p>
          <button
            type="button"
            onClick={() => setMode('classic')}
            className="text-sm text-cream/70 underline underline-offset-4 hover:text-cream"
          >
            Skip to classic view
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
