import { create } from 'zustand'
import { timeGreeting } from '../lib/greeting'

const GREETING_MS = 5500

export const ZONE_IDS = ['spawn', 'about', 'projects', 'journey', 'contact']

export const useGameStore = create((set, get) => ({
  mode: 'game', // 'game' | 'classic'
  ready: false,
  arriving: false, // the robot is flying in, so the controls stay hidden
  loadProgress: 8,
  canRun3D: true,
  autoClassic: false,
  quality: 'high', // 'high' | 'low'
  panel: null, // { type: 'about' | 'project' | 'contact', id? }
  nearby: null, // the interactable in range
  visited: {},
  achievement: false,
  milestone: null, // index of the scroll currently on screen
  milestoneQueue: [], // stones passed while another scroll is still being read
  milestonesSeen: {},
  tutorialDone: false,
  muted: true,
  fading: false,
  discovered: {},
  greeting: null, // { title, line, until } while the character is waving
  toast: null, // { id, title, text }
  guestbook: null, // { total, signed, names, bots } once the server has answered
  signer: null, // { name, tag } after this visitor has signed
  signPrompt: false,
  weather: 'clear',
  clock: '--:--',
  phase: '',

  setMode: (mode) => set({ mode, panel: null, nearby: null, ready: false, loadProgress: 45 }),
  setReady: () => set({ ready: true }),
  setQuality: (quality) => set({ quality }),
  setNearby: (nearby) => { if (get().nearby?.id !== nearby?.id) set({ nearby }) },
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  finishTutorial: () => { if (!get().tutorialDone) set({ tutorialDone: true }) },
  setMuted: (muted) => set({ muted }),
  setFading: (fading) => set({ fading }),
  dismissAchievement: () => set({ achievement: false }),
  clearMilestone: () => {
    const [next = null, ...rest] = get().milestoneQueue
    set({ milestone: next, milestoneQueue: rest })
  },

  markVisited: (zone) => {
    const { visited } = get()
    if (visited[zone]) return
    const next = { ...visited, [zone]: true }
    if (ZONE_IDS.every((z) => next[z])) set({ visited: next, achievement: 'zones' })
    else set({ visited: next })
  },
  greet: () => set({ greeting: { ...timeGreeting(), until: performance.now() + GREETING_MS } }),
  endGreeting: () => { if (get().greeting) set({ greeting: null }) },
  showToast: (title, text) => set({ toast: { id: Date.now(), title, text } }),
  clearToast: () => set({ toast: null }),
  discover: (id, title, text, total) => {
    const { discovered } = get()
    if (discovered[id]) return
    const next = { ...discovered, [id]: true }
    set({ discovered: next, toast: { id: Date.now(), title: `Discovered: ${title}`, text } })
    if (Object.keys(next).length === total) set({ achievement: 'world' })
  },
  revealMilestone: (index) => {
    const { milestone, milestoneQueue, milestonesSeen } = get()
    if (milestonesSeen[index]) return
    const seen = { ...milestonesSeen, [index]: true }
    if (milestone === null) set({ milestone: index, milestonesSeen: seen })
    else set({ milestoneQueue: [...milestoneQueue, index], milestonesSeen: seen })
  },
}))
