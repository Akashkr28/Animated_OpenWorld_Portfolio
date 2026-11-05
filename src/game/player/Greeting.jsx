import { Html } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'

// Speech bubble above the character's head. Screen readers get the same text from the HUD.
export default function Greeting() {
  const greeting = useGameStore((s) => s.greeting)
  return (
    <Html position={[0, 2.5, 0]} center pointerEvents="none" zIndexRange={[9, 0]}>
      <AnimatePresence>
        {greeting && (
          <motion.div
            className="relative w-max max-w-64 rounded-2xl bg-cream px-4 py-2.5 text-center text-night shadow-xl"
            initial={{ opacity: 0, scale: 0.6, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          >
            <p className="font-display text-lg leading-tight font-bold">{greeting.title}</p>
            <p className="text-sm">{greeting.line}</p>
            <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3.5 -translate-x-1/2 rotate-45 bg-cream" />
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  )
}
