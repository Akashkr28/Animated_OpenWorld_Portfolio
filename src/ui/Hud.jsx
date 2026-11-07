import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import ArrivalOverlay from './ArrivalOverlay'
import Minimap from './Minimap'
import Joystick from './Joystick'
import PanelHost from './panels/PanelHost'
import SignPrompt from './SignPrompt'
import { ResumeButton } from './panels/content'
import { input, interact } from '../game/player/input'
import { discoveries, milestones, profile, zoneText } from '../data/portfolio'
import { setWeather, skipToTime, TIMES, WEATHER, WEATHER_ORDER } from '../game/world/environment'
import { robot, setMuted, sfx } from '../lib/audio'
import { keepBotInPlace, startVisit } from '../lib/visitors'
import { useGameStore, ZONE_IDS } from '../store/useGameStore'

const SCROLL_MS = 7000
const QUEUED_SCROLL_MS = 4500 // long enough to read when another scroll is waiting
const GREET_DELAY_MS = 500
const SIGN_DELAY_MS = 4000 // after the robot's hello
const SOUND_ON_HELLO_MS = 350 // lets the island fade in first
const hudButton = 'glass rounded-full px-3.5 py-2 text-sm font-semibold hover:bg-night/80'

function Tutorial({ touch }) {
  const done = useGameStore((s) => s.tutorialDone)
  const ready = useGameStore((s) => s.ready)
  const reduced = useReducedMotion()
  const pulse = (delay) => (reduced ? {} : {
    animate: { y: [0, 2, 0], opacity: [0.7, 1, 0.7] },
    transition: { duration: 1.6, repeat: Infinity, delay },
  })
  return (
    <AnimatePresence>
      {ready && !done && (
        <motion.div
          className="glass absolute bottom-48 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl px-5 py-3 sm:bottom-10"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
        >
          {touch ? (
            <p className="text-sm">Drag the <b>joystick</b> to walk. Swipe anywhere to look around.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                {['W', 'A', 'S', 'D'].map((k, i) => <motion.span key={k} className="keycap" {...pulse(i * 0.2)}>{k}</motion.span>)}
                <span className="ml-1">Walk</span>
              </span>
              <span className="flex items-center gap-1.5"><motion.span className="keycap" {...pulse(0.9)}>Shift</motion.span>Run</span>
              <span className="flex items-center gap-1.5"><motion.span className="keycap" {...pulse(1.1)}>Space</motion.span>Jump</span>
              <span className="flex items-center gap-1.5"><motion.span className="keycap" {...pulse(1.3)}>E</motion.span>Interact</span>
              <span className="flex items-center gap-1.5"><motion.span className="keycap" {...pulse(1.5)}>M</motion.span>Map</span>
              <span className="flex items-center gap-1.5"><motion.span className="keycap" {...pulse(1.7)}>G</motion.span>Wave</span>
              <span className="text-cream/75">Drag to look</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Prompt({ touch }) {
  const nearby = useGameStore((s) => s.nearby)
  const panel = useGameStore((s) => s.panel)
  return (
    <AnimatePresence>
      {nearby && !panel && (
        <motion.button
          key={nearby.id}
          type="button"
          onClick={interact}
          className="glass absolute bottom-48 left-1/2 flex w-max -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:bottom-14"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        >
          {!touch && <span className="keycap">E</span>}
          {touch ? `Tap: ${nearby.prompt}` : `Press E · ${nearby.prompt}`}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function Checklist() {
  const visited = useGameStore((s) => s.visited)
  const [open, setOpen] = useState(() => window.innerWidth >= 640)
  const count = ZONE_IDS.filter((z) => visited[z]).length
  const discovered = useGameStore((s) => Object.keys(s.discovered).length)
  return (
    <div className="glass w-40 rounded-2xl px-3.5 py-2 text-sm sm:w-44">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold">
        <span>Explored</span>
        <span className="text-apricot">{count}/{ZONE_IDS.length}</span>
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {ZONE_IDS.map((z) => (
            <li key={z} className={`flex items-center gap-2 ${visited[z] ? '' : 'text-cream/70'}`}>
              <span aria-hidden="true" className={`grid size-4 place-items-center rounded-full text-[10px] font-bold ${visited[z] ? 'bg-lagoon text-night' : 'border border-cream/40'}`}>
                {visited[z] ? '✓' : ''}
              </span>
              {zoneText[z].short}
              <span className="sr-only">{visited[z] ? ' visited' : ' not visited yet'}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 flex justify-between border-t border-cream/15 pt-1.5 font-semibold">
        <span>Discoveries</span>
        <span className="text-apricot">{discovered}/{Object.keys(discoveries).length}</span>
      </p>
    </div>
  )
}

function WorldControls() {
  const weather = useGameStore((s) => s.weather)
  const clock = useGameStore((s) => s.clock)
  const phase = useGameStore((s) => s.phase)
  const [timeIndex, setTimeIndex] = useState(2)
  const [picking, setPicking] = useState(false)
  const box = useRef()

  useEffect(() => {
    if (!picking) return
    const outside = (e) => { if (!box.current.contains(e.target)) setPicking(false) }
    const escape = (e) => { if (e.key === 'Escape') setPicking(false) }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
    }
  }, [picking])

  const pick = (name) => {
    setWeather(name)
    setPicking(false)
  }
  const nextTime = () => {
    const next = (timeIndex + 1) % TIMES.length
    setTimeIndex(next)
    skipToTime(TIMES[next][1])
  }
  const chip = 'flex w-full items-center justify-between gap-3 rounded-lg px-1.5 py-1 hover:bg-cream/10'
  return (
    <div ref={box} className="glass relative z-20 w-32 rounded-2xl p-1.5 text-xs sm:w-40 sm:text-sm">
      <button type="button" onClick={nextTime} aria-label={`Time is ${clock}, ${phase}. Skip to ${TIMES[(timeIndex + 1) % TIMES.length][0]}`} className={chip}>
        <span className="font-semibold tabular-nums">{clock}</span>
        <span className="text-apricot">{phase}</span>
      </button>
      <button type="button" onClick={() => setPicking(!picking)} aria-expanded={picking} aria-label={`Weather is ${WEATHER[weather].label}. Change weather`} className={`${chip} bg-cream/10`}>
        <span className="font-semibold">Weather</span>
        <span className="text-apricot">{WEATHER[weather].label} <span aria-hidden="true">▾</span></span>
      </button>
      {picking && (
        <ul className="absolute top-full right-0 z-10 mt-2 grid w-48 grid-cols-2 gap-1 rounded-2xl border border-cream/20 bg-night p-1.5 shadow-xl">
          {WEATHER_ORDER.map((name) => (
            <li key={name}>
              <button
                type="button" onClick={() => pick(name)} aria-pressed={name === weather}
                className={`w-full rounded-lg px-2 py-2 text-sm font-semibold ${name === weather ? 'bg-coral text-night' : 'hover:bg-cream/10'}`}
              >
                {WEATHER[name].label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Toast() {
  const toast = useGameStore((s) => s.toast)
  const clear = useGameStore((s) => s.clearToast)
  useEffect(() => {
    if (!toast) return
    sfx('reveal')
    const id = setTimeout(clear, 4200)
    return () => clearTimeout(id)
  }, [toast, clear])
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2" role="status">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            className="w-max max-w-[calc(100vw-2rem)] text-center [text-shadow:0_2px_12px_rgb(10_8_30/0.75)]"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-display text-2xl font-bold sm:text-3xl">{toast.title}</p>
            {toast.text && <p className="text-sm sm:text-base">{toast.text}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MilestoneScroll() {
  const index = useGameStore((s) => s.milestone)
  const clear = useGameStore((s) => s.clearMilestone)
  const waiting = useGameStore((s) => s.milestoneQueue.length > 0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (index !== null) sfx('reveal')
  }, [index])

  useEffect(() => {
    if (index === null) return
    const id = setTimeout(clear, waiting ? QUEUED_SCROLL_MS : SCROLL_MS)
    return () => clearTimeout(id)
  }, [index, waiting, clear])

  const m = milestones[index]
  return (
    <div className="absolute top-4 left-1/2 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2" aria-live="polite">
      <AnimatePresence mode="wait">
        {m && (
          <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <div className="relative z-10 h-3.5 rounded-full bg-gradient-to-b from-[#a4744c] to-[#6b4632] shadow-md" />
            <motion.div
              className="parchment mx-2 overflow-hidden"
              initial={{ height: reduced ? 'auto' : 0 }} animate={{ height: 'auto' }}
              transition={{ duration: 0.65, ease: [0.2, 0.8, 0.25, 1] }}
            >
              <div className="px-5 py-3.5">
                <p className="text-xs font-bold tracking-wide text-[#a4502f] uppercase">
                  Stone {index + 1} of {milestones.length} · {m.when}
                </p>
                <p className="font-display text-xl font-bold">{m.title}</p>
                <p className="mt-1 text-sm leading-snug">{m.text}</p>
              </div>
            </motion.div>
            <div className="relative z-10 h-3.5 rounded-full bg-gradient-to-b from-[#a4744c] to-[#6b4632] shadow-md" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Achievement() {
  const show = useGameStore((s) => s.achievement)
  const dismiss = useGameStore((s) => s.dismissAchievement)

  useEffect(() => {
    if (!show) return
    sfx('achievement')
    confetti({
      particleCount: 130, spread: 85, origin: { y: 0.45 }, zIndex: 40, disableForReducedMotion: true,
      colors: ['#ff7a59', '#ffc27a', '#2fb7a8', '#fff4e3', '#c8b6ff'],
    })
    const id = setTimeout(dismiss, 8000)
    return () => clearTimeout(id)
  }, [show, dismiss])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          className="glass absolute top-1/4 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl px-7 py-5 text-center"
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <p className="text-sm font-semibold text-apricot">Achievement unlocked</p>
          <p className="font-display text-2xl font-bold">{show === 'world' ? 'World Wanderer' : 'Island Explorer'}</p>
          <p className="mt-1 text-sm text-cream/85">
            {show === 'world' ? 'You found every hidden place. Impressive.' : "You've seen all five zones. There's more out in the wilds!"}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Hud({ touch }) {
  const ready = useGameStore((s) => s.ready)
  const arriving = useGameStore((s) => s.arriving)
  const muted = useGameStore((s) => s.muted)
  const fading = useGameStore((s) => s.fading)
  const greeting = useGameStore((s) => s.greeting)
  const signPrompt = useGameStore((s) => s.signPrompt)
  const setMode = useGameStore((s) => s.setMode)
  const setMutedState = useGameStore((s) => s.setMuted)

  // Greets once the loading screen has lifted and the robot has landed.
  useEffect(() => {
    if (!ready || arriving) return
    const id = setTimeout(() => useGameStore.getState().greet(), GREET_DELAY_MS)
    return () => clearTimeout(id)
  }, [ready, arriving])

  useEffect(() => {
    if (!ready || arriving) return
    const id = setTimeout(startVisit, SIGN_DELAY_MS)
    return () => clearTimeout(id)
  }, [ready, arriving])

  useEffect(keepBotInPlace, [])

  // The classic page has no sound button, and nothing updates the island's levels there.
  useEffect(() => () => {
    setMuted(true)
    useGameStore.getState().setMuted(true)
  }, [])

  useEffect(() => useGameStore.subscribe((s, prev) => {
    if (!!s.panel !== !!prev.panel) sfx(s.panel ? 'open' : 'close')
    if (s.greeting && !prev.greeting) robot('hello')
    if (s.nearby && s.nearby.id !== prev.nearby?.id) robot('curious')
    if (s.discovered !== prev.discovered || (s.achievement && !prev.achievement)) robot('happy')
  }), [])

  const openMap = () => useGameStore.getState().openPanel({ type: 'map' })
  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
    if (muted) setTimeout(() => robot('hello'), SOUND_ON_HELLO_MS)
  }

  return (
    <>
      <motion.div
        className="pointer-events-none fixed inset-0 z-20 bg-night"
        initial={false} animate={{ opacity: fading ? 1 : 0 }} transition={{ duration: 0.24 }}
      />
      {ready && arriving && <ArrivalOverlay />}
      {ready && !arriving && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-10 select-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        >
          <div className="absolute top-3 left-3 flex flex-col items-start gap-2 sm:top-4 sm:left-4">
            <div className="glass rounded-2xl px-3.5 py-2">
              <h1 className="font-display text-sm leading-tight font-bold sm:text-base">{profile.name}</h1>
              <p className="text-xs text-cream/80">{profile.title}</p>
            </div>
            <Checklist />
            {/* On phones these sit here so they don't cover the character's speech bubble. */}
            <div className="flex gap-2 sm:hidden">
              <button type="button" onClick={openMap} className={hudButton}>Map</button>
              <ResumeButton label="Resume" className={hudButton} />
            </div>
          </div>

          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 sm:top-4 sm:right-4">
            <div className="flex gap-2">
              <button type="button" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} className={hudButton}>
                <span className="sm:hidden">{muted ? 'Muted' : 'Sound'}</span>
                <span className="hidden sm:inline">{muted ? 'Sound off' : 'Sound on'}</span>
              </button>
              <button type="button" onClick={() => setMode('classic')} className={hudButton}>
                <span className="sm:hidden">Classic</span>
                <span className="hidden sm:inline">Classic view</span>
              </button>
            </div>
            <Minimap />
            <WorldControls />
            <div className="hidden flex-col items-end gap-2 sm:flex">
              <button type="button" onClick={openMap} className={hudButton}>World map</button>
              <ResumeButton className={hudButton} />
            </div>
          </div>

          <MilestoneScroll />
          {!signPrompt && <Tutorial touch={touch} />}
          <SignPrompt />
          <Prompt touch={touch} />
          <Toast />
          <p className="sr-only" role="status">{greeting && `${greeting.title} ${greeting.line}`}</p>
          <Achievement />

          {touch && (
            <>
              <div className="pointer-events-auto absolute bottom-6 left-5"><Joystick /></div>
              <div className="absolute right-6 bottom-8 flex flex-col items-center gap-3">
                <button type="button" onClick={() => { input.jumpQueued = true }} className="glass size-16 rounded-full text-sm font-bold">Jump</button>
                <button type="button" onClick={interact} className="size-20 rounded-full bg-coral font-bold text-night shadow-lg">Interact</button>
              </div>
            </>
          )}
        </motion.div>
      )}
      <PanelHost />
    </>
  )
}
