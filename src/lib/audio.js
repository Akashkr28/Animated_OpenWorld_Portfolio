// Everything is synthesised with Web Audio, so sound adds nothing to the download.
// The context is only created after the visitor unmutes.
let ctx, master
const bed = {} // gain nodes for wind, rain, water and night

function start() {
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

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
  const noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
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
  src.connect(surf).connect(surfGain).connect(master)
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
    s.connect(f).connect(g).connect(master)
    s.start()
    bed[name] = { gain: g, filter: f }
  }
  layer('wind', 'bandpass', 420, 1.1)
  layer('rain', 'highpass', 1800)
  layer('water', 'bandpass', 900, 0.5)

  // The robot's soft hover hum.
  const hum = ctx.createOscillator()
  hum.type = 'triangle'
  hum.frequency.value = 118
  const hover = ctx.createGain()
  hover.gain.value = 0
  hum.connect(hover).connect(master)
  hum.start()
  bed.hover = { gain: hover, pitch: hum.frequency }

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
  cricket.connect(pulse).connect(night).connect(master)
  cricket.start()
  chop.start()
  bed.night = { gain: night }
}

const LEVELS = { wind: 0.16, rain: 0.09, water: 0.11, night: 0.008, hover: 0.022 }

// Called every frame, so it only touches the layers that are passed in.
export function setAmbience(levels) {
  if (!ctx || ctx.state !== 'running') return
  for (const name in levels) {
    bed[name].gain.gain.setTargetAtTime(levels[name] * LEVELS[name], ctx.currentTime, 0.4)
    if (name === 'hover') bed.hover.pitch.setTargetAtTime(95 + levels.hover * 70, ctx.currentTime, 0.2)
    if (name === 'wind') bed.wind.filter.frequency.setTargetAtTime(300 + levels.wind * 560, ctx.currentTime, 0.5)
  }
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
  src.connect(f).connect(g).connect(master)
  src.start()
}

export function setMuted(muted) {
  if (!ctx) {
    if (muted) return
    start()
  }
  ctx.resume()
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
  reveal: () => { tone(659, 0, 0.3, 0.09); tone(988, 0.1, 0.4, 0.07) },
  achievement: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.5, 0.1)),
}
export function sfx(name) {
  if (ctx && ctx.state === 'running') SFX[name]?.()
}
