import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Close } from './icons'

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
      className="fixed inset-0 z-30 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgb(10_8_30/0.3),rgb(10_8_30/0.78))] p-3 backdrop-blur-[2px] sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onKeyDown={onKeyDown}
        className="hud hud-corners flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem]"
        initial={{ y: 28, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top_left,rgb(255_122_89/0.22),transparent_65%)]" />
        <header className="relative px-6 pt-6 pb-4 sm:px-9 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow && <p className="text-sm font-semibold text-apricot">{eyebrow}</p>}
              <h2 id="panel-title" className="mt-0.5 font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">{title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span aria-hidden="true" className="keycap hidden !h-6 !text-[10px] text-cream/70 sm:inline-flex">Esc</span>
              <button ref={closeButton} type="button" onClick={onClose} aria-label="Close panel" className="hud-icon bg-cream/8 ring-1 ring-cream/15">
                <Close />
              </button>
            </div>
          </div>
          <div aria-hidden="true" className="rule mt-5"><span className="text-[10px]">◆</span></div>
        </header>
        <div className="relative overflow-y-auto px-6 pb-8 sm:px-9">{children}</div>
      </motion.div>
    </motion.div>
  )
}
