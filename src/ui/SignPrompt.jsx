import { AnimatePresence, motion } from 'framer-motion'
import SignForm from './SignForm'
import { skipSigning } from '../lib/visitors'
import { useGameStore } from '../store/useGameStore'

export default function SignPrompt() {
  const open = useGameStore((s) => s.signPrompt && !s.panel)
  return (
    <AnimatePresence>
      {open && (
        <motion.section
          aria-label="Leave your name on the island"
          className="hud hud-corners pointer-events-auto absolute bottom-48 left-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl p-4 sm:bottom-28"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        >
          <p className="hud-label">Guestbook</p>
          <p className="mb-3 font-display text-lg leading-tight font-bold">Leave your name on the island?</p>
          <SignForm>
            <button type="button" onClick={skipSigning} className="btn-ghost">Skip</button>
          </SignForm>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
