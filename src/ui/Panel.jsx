import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

export default function Panel({ title, eyebrow, onClose, children }) {
  const dialog = useRef()
  const closeButton = useRef()

  useEffect(() => {
    const previous = document.activeElement
    closeButton.current?.focus()
    return () => previous?.focus?.()
  }, [])

  // Keeps Tab inside the dialog.
  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const items = [...dialog.current.querySelectorAll(FOCUSABLE)]
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-night/35 p-3 sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onKeyDown={onKeyDown}
        className="glass flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
        initial={{ y: 26, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 sm:px-8 sm:pt-7">
          <div>
            {eyebrow && <p className="text-sm font-semibold text-apricot">{eyebrow}</p>}
            <h2 id="panel-title" className="font-display text-2xl leading-tight font-bold sm:text-3xl">{title}</h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-cream/10 text-lg hover:bg-cream/20"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-6 pb-7 sm:px-8">{children}</div>
      </motion.div>
    </motion.div>
  )
}
