import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { profile } from '../data/portfolio'

export default function LoadingScreen() {
  const ready = useGameStore((s) => s.ready)
  const target = useGameStore((s) => s.loadProgress ?? 0)
  const setMode = useGameStore((s) => s.setMode)
  const [shown, setShown] = useState(4)

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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-night px-6 text-center"
        >
          <svg viewBox="0 0 120 56" className="w-36" aria-hidden="true">
            <path d="M8 44C28 20 44 16 60 16s36 8 52 28Z" fill="#2fb7a8" />
            <path d="M60 2 74 30H46Z" fill="#ff7a59" />
            <path d="M0 48q15-7 30 0t30 0 30 0 30 0" fill="none" stroke="#ffc27a" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 text-cream/70">Washing ashore…</p>
          </div>
          <div
            role="progressbar"
            aria-label="Loading the island"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shown)}
            className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-cream/15"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-coral to-apricot" style={{ width: `${shown}%` }} />
          </div>
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
