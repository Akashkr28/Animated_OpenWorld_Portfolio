import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import ArrivalOverlay from './ArrivalOverlay'
import Minimap from './Minimap'
import Joystick from './Joystick'
import PanelHost from './panels/PanelHost'
import SignPrompt from './SignPrompt'
import { ResumeButton } from './panels/content'
import { Download, Gem, Layout, MapIcon, phaseIcon, SoundOff, SoundOn, WEATHER_ICONS } from './icons'
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
const tick = () => sfx('tick')
const initials = profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('')

function Tutorial({ touch }) {
  const done = useGameStore((s) => s.tutorialDone)
  const ready = useGameStore((s) => s.ready)
  const reduced = useReducedMotion()
  const pulse = (delay) => (reduced ? {} : {
    animate: { y: [0, 2, 0], opacity: [0.75, 1, 0.75] },
    transition: { duration: 1.6, repeat: Infinity, delay },
  })
  const keys = (list, label, delay) => (
    <span className="flex items-center gap-1.5">
      {list.map((k, i) => <motion.span key={k} className="keycap" {...pulse(delay + i * 0.2)}>{k}</motion.span>)}
      <span className="ml-0.5 text-cream/85">{label}</span>
    </span>
  )
  return (
    <AnimatePresence>
      {ready && !done && (
        <motion.div
          className="hud absolute bottom-48 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl px-5 py-3 sm:bottom-8"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
        >
          {touch ? (
            <p className="text-sm">Drag the <b>joystick</b> to walk. Swipe anywhere to look around.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <span className="hud-label">Controls</span>
              {keys(['W', 'A', 'S', 'D'], 'Walk', 0)}
              {keys(['Shift'], 'Run', 0.9)}
              {keys(['Space'], 'Jump', 1.1)}
              {keys(['E'], 'Interact', 1.3)}
              {keys(['M'], 'Map', 1.5)}
              {keys(['G'], 'Wave', 1.7)}
              <span className="text-cream/70">Drag to look</span>
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
          aria-label={nearby.prompt}
          className="hud hud-corners absolute bottom-48 left-1/2 flex w-max -translate-x-1/2 items-center gap-3 rounded-2xl py-2 pr-5 pl-2 text-left sm:bottom-28"
          initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
          <span className="relative grid size-11 place-items-center">
            <span aria-hidden="true" className="ring-out absolute inset-0 rounded-xl ring-2 ring-apricot/70" />
            {touch ? <span className="keycap size-9 text-base">✋</span> : <span className="keycap size-9 text-base">E</span>}
          </span>
          <span>
            <span className="hud-label block">{touch ? 'Tap' : 'Interact'}</span>
            <span className="block font-display text-base leading-tight font-bold">{nearby.prompt}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function PlayerCard() {
  return (
    <div className="hud hud-corners flex items-center gap-3 rounded-2xl py-2 pr-4 pl-2">
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-apricot to-coral font-display text-sm font-extrabold text-night shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_6px_18px_-6px_rgb(255_122_89/0.9)]">
        {initials}
      </span>
      <div>
        <h1 className="font-display text-sm leading-tight font-bold sm:text-base">{profile.name}</h1>
        <p className="text-xs text-cream/75">{profile.title}</p>
      </div>
    </div>
  )
}

function Checklist() {
  const visited = useGameStore((s) => s.visited)
  const [open, setOpen] = useState(() => window.innerWidth >= 640)
  const count = ZONE_IDS.filter((z) => visited[z]).length
  const discovered = useGameStore((s) => Object.keys(s.discovered).length)
  const hidden = Object.keys(discoveries).length
  return (
    <div className="hud w-44 rounded-2xl p-3 text-sm sm:w-52">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="hud-label">Explored</span>
        <span className="font-display font-bold text-apricot">{count}/{ZONE_IDS.length}</span>
      </button>
      <div className="meter mt-2" aria-hidden="true"><span style={{ width: `${(count / ZONE_IDS.length) * 100}%` }} /></div>
      {open && (
        <ul className="mt-2.5 space-y-1.5">
          {ZONE_IDS.map((z) => (
            <li key={z} className={`flex items-center gap-2.5 ${visited[z] ? '' : 'text-cream/65'}`}>
              <span
                aria-hidden="true"
                className={`grid size-4 shrink-0 place-items-center text-[10px] font-black ${visited[z] ? 'rounded-full bg-lagoon text-night shadow-[0_0_10px_rgb(47_183_168/0.8)]' : 'rotate-45 rounded-[3px] border border-cream/40'}`}
              >
                {visited[z] ? '✓' : ''}
              </span>
              <span className={visited[z] ? 'font-semibold' : ''}>{zoneText[z].short}</span>
              <span className="sr-only">{visited[z] ? ' visited' : ' not visited yet'}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 border-t border-cream/10 pt-2">
        <p className="flex items-center justify-between">
          <span className="hud-label">Discoveries</span>
          <span className="font-display font-bold text-apricot">{discovered}/{hidden}</span>
        </p>
        <div className="meter warm mt-1.5" aria-hidden="true"><span style={{ width: `${(discovered / hidden) * 100}%` }} /></div>
      </div>
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
  const PhaseIcon = phaseIcon(phase)
  const WeatherIcon = WEATHER_ICONS[weather]
  const row = 'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-cream/10'
  return (
    <div ref={box} className="hud relative z-20 w-36 rounded-2xl p-1.5 text-xs sm:w-44 sm:text-sm">
      <button type="button" onClick={nextTime} onPointerEnter={tick} aria-label={`Time is ${clock}, ${phase}. Skip to ${TIMES[(timeIndex + 1) % TIMES.length][0]}`} className={row}>
        <PhaseIcon className="size-4 text-apricot" />
        <span className="font-display font-bold tabular-nums">{clock}</span>
        <span className="ml-auto text-cream/70">{phase}</span>
      </button>
      <button type="button" onClick={() => setPicking(!picking)} onPointerEnter={tick} aria-expanded={picking} aria-label={`Weather is ${WEATHER[weather].label}. Change weather`} className={`${row} bg-cream/8`}>
        <WeatherIcon className="size-4 text-lagoon" />
        <span className="font-semibold">{WEATHER[weather].label}</span>
        <span aria-hidden="true" className={`ml-auto text-cream/60 transition-transform ${picking ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <AnimatePresence>
        {picking && (
          <motion.ul
            className="hud absolute top-full right-0 z-10 mt-2 grid w-52 grid-cols-2 gap-1 rounded-2xl p-1.5"
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {WEATHER_ORDER.map((name) => {
              const Glyph = WEATHER_ICONS[name]
              return (
                <li key={name}>
                  <button
                    type="button" onClick={() => pick(name)} onPointerEnter={tick} aria-pressed={name === weather}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold ${name === weather ? 'btn-primary !px-2.5 !py-2' : 'hover:bg-cream/10'}`}
                  >
                    <Glyph className="size-4" />
                    {WEATHER[name].label}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
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
    <div className="absolute top-[30%] left-1/2 -translate-x-1/2" role="status">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            className="w-[min(32rem,calc(100vw-2rem))] text-center"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="rule mx-auto w-3/4" aria-hidden="true"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.25, 1] }}
            >
              <span className="text-[10px]">◆</span>
            </motion.div>
            <p className="text-glow mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{toast.title}</p>
            {toast.text && <p className="mt-1 text-sm text-cream/90 [text-shadow:0_2px_10px_rgb(6_5_22/0.85)] sm:text-base">{toast.text}</p>}
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
          className="hud hud-corners absolute top-1/4 left-1/2 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-3xl py-4 pr-7 pl-4"
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-apricot to-coral text-night shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_0_28px_rgb(255_194_122/0.7)]">
            <Gem className="size-7" />
          </span>
          <div>
            <p className="hud-label !text-apricot">Achievement unlocked</p>
            <p className="font-display text-2xl font-extrabold">{show === 'world' ? 'World Wanderer' : 'Island Explorer'}</p>
            <p className="mt-0.5 text-sm text-cream/85">
              {show === 'world' ? 'You found every hidden place. Impressive.' : "You've seen all five zones. There's more out in the wilds!"}
            </p>
          </div>
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
  const nearby = useGameStore((s) => !!s.nearby)
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
            <PlayerCard />
            <Checklist />
            {/* On phones these sit here so they don't cover the character's speech bubble. */}
            <div className="flex gap-2 sm:hidden">
              <button type="button" onClick={openMap} aria-label="World map" className="hud hud-icon"><MapIcon /></button>
              <ResumeButton label={<Download />} aria-label="Download resume" className="hud hud-icon" />
            </div>
          </div>

          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 sm:top-4 sm:right-4">
            <div className="flex gap-2">
              <button
                type="button" onClick={toggleMute} onPointerEnter={tick} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                title={muted ? 'Sound off' : 'Sound on'} className={`hud hud-icon ${muted ? 'text-cream/70' : 'text-lagoon'}`}
              >
                {muted ? <SoundOff /> : <SoundOn />}
              </button>
              <button type="button" onClick={() => setMode('classic')} onPointerEnter={tick} className="hud hud-pill">
                <Layout className="size-4" />
                <span className="sm:hidden">Classic</span>
                <span className="hidden sm:inline">Classic view</span>
              </button>
            </div>
            <Minimap />
            <WorldControls />
            <div className="hidden flex-col items-end gap-2 sm:flex">
              <button type="button" onClick={openMap} onPointerEnter={tick} className="hud hud-pill">
                <MapIcon className="size-4" /> World map <span className="keycap !h-5 !min-w-5 !px-1 !text-[10px]">M</span>
              </button>
              <ResumeButton label={<><Download className="size-4" /> Download resume</>} className="hud hud-pill" />
            </div>
          </div>

          <MilestoneScroll />
          {!signPrompt && !nearby && <Tutorial touch={touch} />}
          <SignPrompt />
          <Prompt touch={touch} />
          <Toast />
          <p className="sr-only" role="status">{greeting && `${greeting.title} ${greeting.line}`}</p>
          <Achievement />

          {touch && (
            <>
              <div className="pointer-events-auto absolute bottom-6 left-5"><Joystick /></div>
              <div className="absolute right-6 bottom-8 flex flex-col items-center gap-3">
                <button type="button" onClick={() => { input.jumpQueued = true }} className="hud size-16 rounded-full text-sm font-bold">Jump</button>
                <button type="button" onClick={interact} className="btn-primary size-20 justify-center !rounded-full !p-0">Interact</button>
              </div>
            </>
          )}
        </motion.div>
      )}
      <PanelHost />
    </>
  )
}
