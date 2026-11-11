// Everything is synthesised with Web Audio, so sound adds nothing to the download.
// The context is only created after the visitor unmutes.
let ctx, master, noise, voice
let lastChirp = 0
let outdoors, outdoorsLevel
let indoors = false
let soundOn = false

// A code edit during development reloads this file, and the old sounds would otherwise play on.
if (import.meta.env.DEV) window.__islandAudio?.close()
let rainRequested = false

// Compressed audio gains silence at both ends, so the file carries spare audio there and only
// the middle loops. Everything inside repeats every RAIN_LOOP seconds, so the seam is inaudible.
const OPEN_AIR = 20000
const THROUGH_WALLS = 650
const RAIN_URL = '/sounds/rain-loop.m4a'
const RAIN_MARGIN = 0.5
const RAIN_LOOP = 24
const bed = {} // gain nodes for wind, rain, water and night

function start() {
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (import.meta.env.DEV) window.__islandAudio = ctx
  document.addEventListener('visibilitychange', followTab)
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // Everything from outside runs through here, so the walls can muffle it.
  outdoors = ctx.createBiquadFilter()
  outdoors.type = 'lowpass'
  outdoors.frequency.value = OPEN_AIR
  outdoorsLevel = ctx.createGain()
  outdoors.connect(outdoorsLevel).connect(master)

  // Warm pad: a slow suspended chord.
  const pad = ctx.createGain()
  pad.gain.value = 0.05
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 620
  pad.connect(filter).connect(master)
  ;[146.83, 220, 293.66, 329.63].forEach((f, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    osc.detune.value = (i - 1.5) * 4
    const g = ctx.createGain()
    g.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05 + i * 0.023
    const depth = ctx.createGain()
    depth.gain.value = 0.35
    lfo.connect(depth).connect(g.gain)
    osc.connect(g).connect(pad)
    osc.start()
    lfo.start()
  })

  // Surf: looped noise swelling through a lowpass.
  noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const surf = ctx.createBiquadFilter()
  surf.type = 'lowpass'
  surf.frequency.value = 480
  const surfGain = ctx.createGain()
  surfGain.gain.value = 0.035
  const swell = ctx.createOscillator()
  swell.frequency.value = 0.11
  const swellDepth = ctx.createGain()
  swellDepth.gain.value = 0.02
  swell.connect(swellDepth).connect(surfGain.gain)
  src.connect(surf).connect(surfGain).connect(outdoors)
  src.start()
  swell.start()

  const layer = (name, type, frequency, q = 0.7) => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = frequency
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.value = 0
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.loop = true
    s.connect(f).connect(g).connect(outdoors)
    s.start()
    bed[name] = { gain: g, filter: f }
  }
  layer('wind', 'bandpass', 420, 1.1)

  const rainGain = ctx.createGain()
  rainGain.gain.value = 0
  rainGain.connect(outdoors)
  bed.rain = { gain: rainGain }

  layer('water', 'bandpass', 900, 0.5)

  // The robot floating: a soft force field that throbs slowly, and quickens as he moves.
  // Two clean tones a fifth apart, kept away from the low notes that sound like a motor.
  const hover = ctx.createGain()
  hover.gain.value = 0
  hover.connect(master)
  const field = ctx.createOscillator()
  field.frequency.value = 330
  const fieldGain = ctx.createGain()
  fieldGain.gain.value = 0.07
  const throb = ctx.createOscillator()
  throb.frequency.value = 0.9
  const throbDepth = ctx.createGain()
  throbDepth.gain.value = 0.06
  throb.connect(throbDepth).connect(fieldGain.gain)
  field.connect(fieldGain).connect(hover)
  const fifth = ctx.createOscillator()
  fifth.frequency.value = 495
  const fifthGain = ctx.createGain()
  fifthGain.gain.value = 0.025
  fifth.connect(fifthGain).connect(hover)
  field.start()
  fifth.start()
  throb.start()
  bed.hover = { gain: hover, rate: throb.frequency }

  // His voice runs through a soft lowpass and a short echo, so the beeps sound like a small metal body.
  voice = ctx.createBiquadFilter()
  voice.type = 'lowpass'
  voice.frequency.value = 3400
  const voiceLevel = ctx.createGain()
  voiceLevel.gain.value = 3.4 // sits clearly above the surf and wind
  voice.connect(voiceLevel).connect(master)
  const echo = ctx.createDelay(0.3)
  echo.delayTime.value = 0.085
  const echoGain = ctx.createGain()
  echoGain.gain.value = 0.24
  voiceLevel.connect(echo).connect(echoGain).connect(master)
  echoGain.connect(echo)

  // Crickets: a high tone chopped into quick pulses.
  const cricket = ctx.createOscillator()
  cricket.frequency.value = 4300
  const chop = ctx.createOscillator()
  chop.type = 'square'
  chop.frequency.value = 17
  const chopGain = ctx.createGain()
  chopGain.gain.value = 0.5
  const pulse = ctx.createGain()
  pulse.gain.value = 0.5
  chop.connect(chopGain).connect(pulse.gain)
  const night = ctx.createGain()
  night.gain.value = 0
  cricket.connect(pulse).connect(night).connect(outdoors)
  cricket.start()
  chop.start()
  bed.night = { gain: night }
}

const LEVELS = { wind: 0.16, rain: 1.25, water: 0.11, night: 0.008, hover: 0.7 }

// Called every frame, so it only touches the layers that are passed in.
export function setAmbience(levels) {
  if (!ctx || ctx.state !== 'running') return
  for (const name in levels) {
    bed[name].gain.gain.setTargetAtTime(levels[name] * LEVELS[name], ctx.currentTime, 0.4)
    if (name === 'hover') bed.hover.rate.setTargetAtTime(0.9 + (levels.hover - 0.5) * 3.2, ctx.currentTime, 0.4)
    if (name === 'rain' && levels.rain > 0.02) loadRain()
    if (name === 'wind') bed.wind.filter.frequency.setTargetAtTime(300 + levels.wind * 560, ctx.currentTime, 0.5)
  }
}

// Fetched the first time it rains, so clear-weather visitors never download it.
async function loadRain() {
  if (rainRequested) return
  rainRequested = true
  try {
    const res = await fetch(RAIN_URL)
    const rain = ctx.createBufferSource()
    rain.buffer = await ctx.decodeAudioData(await res.arrayBuffer())
    rain.loop = true
    rain.loopStart = RAIN_MARGIN
    rain.loopEnd = RAIN_MARGIN + RAIN_LOOP
    rain.connect(bed.rain.gain)
    rain.start(0, RAIN_MARGIN)
  } catch {
    rainRequested = false // try again next time it rains
  }
}

// Levels only update while the island is drawing, so a hidden tab must pause or they stick.
function followTab() {
  if (document.hidden) ctx.suspend()
  else if (soundOn) ctx.resume()
}

export function setIndoors(on) {
  if (on === indoors) return
  indoors = on
  if (!ctx) return
  outdoors.frequency.setTargetAtTime(on ? THROUGH_WALLS : OPEN_AIR, ctx.currentTime, 0.18)
  outdoorsLevel.gain.setTargetAtTime(on ? 0.6 : 1, ctx.currentTime, 0.18)
}

export function thunder() {
  if (!ctx || ctx.state !== 'running') return
  const length = 3
  const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 170
  const g = ctx.createGain()
  g.gain.value = 1.1
  src.connect(f).connect(g).connect(outdoors)
  src.start()
}

export function setMuted(muted) {
  if (!ctx) {
    if (muted) return
    start()
  }
  soundOn = !muted
  if (!document.hidden) ctx.resume()
  master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.25)
}

function tone(freq, at, length, volume, type = 'sine') {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

const SFX = {
  open: () => { tone(523, 0, 0.16, 0.12); tone(784, 0.07, 0.22, 0.1) },
  close: () => tone(392, 0, 0.14, 0.08),
  tick: () => tone(1320, 0, 0.035, 0.018),
  door: () => { tone(196, 0, 0.16, 0.09, 'triangle'); tone(147, 0.08, 0.2, 0.07, 'triangle') },
  reveal: () => { tone(659, 0, 0.3, 0.09); tone(988, 0.1, 0.4, 0.07) },
  achievement: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.5, 0.1)),
}
export function sfx(name) {
  if (ctx && ctx.state === 'running') SFX[name]?.()
}

// One beep of his voice, gliding between two pitches.
function blip(from, to, at, length, volume = 0.055, type = 'square') {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + length)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume, t + 0.008)
  g.gain.setValueAtTime(volume, t + length * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(g).connect(voice)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

// A fast flutter between two notes, the sound of him being pleased.
function trill(low, high, at, length) {
  const step = 0.042
  for (let i = 0; i * step < length; i++) {
    const f = i % 2 ? high : low
    blip(f, f, at + i * step, step, 0.045, 'triangle')
  }
}

function whoosh(from, to, length, volume) {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.2
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + length)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + length)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random() * 3, length + 0.05)
}

const between = (low, high) => low + Math.random() * (high - low)

// Every phrase starts from a random pitch, so he never says the same thing twice.
const PHRASES = {
  hello: () => {
    const f = between(620, 760)
    blip(f, f * 1.5, 0, 0.09)
    blip(f * 1.25, f * 1.1, 0.11, 0.07)
    blip(f * 1.1, f * 2, 0.2, 0.15)
    trill(f * 2, f * 2.5, 0.37, 0.24)
  },
  curious: () => {
    const f = between(520, 680)
    blip(f, f * 0.8, 0, 0.09)
    blip(f * 0.85, f * 1.65, 0.13, 0.2)
  },
  happy: () => {
    const f = between(640, 780)
    ;[1, 1.25, 1.5, 2].forEach((step, i) => blip(f * step, f * step * 1.04, i * 0.075, 0.07))
    trill(f * 2, f * 2.67, 0.32, 0.3)
  },
  mutter: () => {
    const beeps = 2 + Math.floor(Math.random() * 3)
    let at = 0
    for (let i = 0; i < beeps; i++) {
      const length = between(0.05, 0.12)
      blip(between(420, 1100), between(420, 1100), at, length, 0.035)
      at += length + between(0.03, 0.09)
    }
  },
  oops: () => {
    blip(980, 210, 0, 0.5, 0.05, 'triangle')
    blip(240, 190, 0.54, 0.09, 0.05)
    blip(240, 170, 0.67, 0.14, 0.05)
  },
  snore: () => {
    for (let i = 0; i < 3; i++) {
      blip(190, 120, i * 1.25, 0.7, 0.02, 'triangle')
      blip(420, 560, i * 1.25 + 0.75, 0.16, 0.012, 'sine')
    }
  },
  boost: () => {
    whoosh(380, 1500, 0.38, 0.4)
    blip(420, 880, 0, 0.24, 0.05, 'sine')
  },
  land: () => {
    blip(190, 70, 0, 0.13, 0.12, 'sine')
    whoosh(1800, 500, 0.16, 0.2)
  },
}

export function robot(name) {
  if (!ctx || ctx.state !== 'running') return
  // Two beeps at once turn to noise. Thrusters are exempt, since they aren't his voice.
  const chatter = name !== 'boost' && name !== 'land'
  if (chatter && ctx.currentTime - lastChirp < 0.35) return
  if (chatter) lastChirp = ctx.currentTime
  PHRASES[name]()
}
