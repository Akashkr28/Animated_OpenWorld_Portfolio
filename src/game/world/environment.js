import * as THREE from 'three'
import { world } from './uniforms'
import { arrival } from '../Arrival'
import { updateBulbs } from './glow'
import { useGameStore } from '../../store/useGameStore'
import { prefersReducedMotion } from '../../lib/device'
import { setAmbience, thunder } from '../../lib/audio'

const DAY_SECONDS = 360
export const WEATHER = {
  clear: { label: 'Clear', cloud: 0.12, rain: 0, wind: 0.22, fog: 0, next: ['cloudy', 'windy', 'clear'] },
  cloudy: { label: 'Cloudy', cloud: 0.72, rain: 0, wind: 0.36, fog: 0.15, next: ['rain', 'clear', 'fog'] },
  windy: { label: 'Windy', cloud: 0.38, rain: 0, wind: 1, fog: 0, next: ['clear', 'cloudy', 'rain'] },
  rain: { label: 'Rain', cloud: 0.93, rain: 0.6, wind: 0.5, fog: 0.4, next: ['storm', 'cloudy', 'clear'] },
  storm: { label: 'Storm', cloud: 1, rain: 1, wind: 1, fog: 0.55, next: ['rain'] },
  fog: { label: 'Fog', cloud: 0.6, rain: 0, wind: 0.08, fog: 1, next: ['clear', 'cloudy'] },
}
export const WEATHER_ORDER = Object.keys(WEATHER)
export const TIMES = [['Dawn', 0.27], ['Noon', 0.5], ['Dusk', 0.745], ['Night', 0.96]]

const c = (hex) => new THREE.Color(hex)
const KEYS = [
  { t: 0, top: c('#0a0d26'), horizon: c('#1b2348'), sun: c('#9db4ff'), sky: c('#46558f'), ground: c('#1d2238'), sunI: 0.55, skyI: 0.75 },
  { t: 0.21, top: c('#0a0d26'), horizon: c('#1b2348'), sun: c('#9db4ff'), sky: c('#46558f'), ground: c('#1d2238'), sunI: 0.55, skyI: 0.75 },
  { t: 0.27, top: c('#4a5fa8'), horizon: c('#ffb08a'), sun: c('#ffc49a'), sky: c('#b8a8d8'), ground: c('#8d7a8f'), sunI: 1.2, skyI: 1.1 },
  { t: 0.36, top: c('#6db6e6'), horizon: c('#e6f0ee'), sun: c('#fff3dc'), sky: c('#d9eeff'), ground: c('#9fbf7a'), sunI: 2.2, skyI: 1.5 },
  { t: 0.64, top: c('#6db6e6'), horizon: c('#ffe6c7'), sun: c('#fff3dc'), sky: c('#d9eeff'), ground: c('#9fbf7a'), sunI: 2.1, skyI: 1.5 },
  { t: 0.74, top: c('#3d2f78'), horizon: c('#ff8f5e'), sun: c('#ffa266'), sky: c('#a79be0'), ground: c('#8d6f8f'), sunI: 1.4, skyI: 1.2 },
  { t: 0.8, top: c('#0a0d26'), horizon: c('#1b2348'), sun: c('#9db4ff'), sky: c('#46558f'), ground: c('#1d2238'), sunI: 0.55, skyI: 0.75 },
  { t: 1, top: c('#0a0d26'), horizon: c('#1b2348'), sun: c('#9db4ff'), sky: c('#46558f'), ground: c('#1d2238'), sunI: 0.55, skyI: 0.75 },
]

const reduced = prefersReducedMotion()
const grey = new THREE.Color()

// The island starts at the visitor's real time of day, matching their greeting.
const now = new Date()

export const env = {
  time: (now.getHours() * 60 + now.getMinutes()) / 1440, // 0 = midnight, 0.5 = noon
  timeTarget: null,
  weather: 'clear',
  weatherTimer: 60,
  cloud: 0.12, rain: 0, wind: 0.22, fog: 0, wet: 0,
  night: 0, dark: 0, flash: 0, rainbow: 0, bolt: 0,
  windAngle: 0.65,
  sunUp: 1,
  strikeTimer: 5,
  sun: new THREE.Vector3(),
  moon: new THREE.Vector3(),
  light: { color: new THREE.Color(), intensity: 1, dir: new THREE.Vector3() },
  sky: new THREE.Color(), ground: new THREE.Color(), skyI: 1,
  cloudColor: new THREE.Color(),
}

export function setWeather(name) {
  env.weather = name
  env.weatherTimer = 80 + Math.random() * 70
  useGameStore.setState({ weather: name })
}
export const skipToTime = (t) => { env.timeTarget = t }

function announce(title, text) {
  useGameStore.getState().showToast(title, text)
}

function applyPalette(t) {
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++
  const a = KEYS[i], b = KEYS[i + 1]
  const f = THREE.MathUtils.smoothstep(t, a.t, b.t)
  const cover = env.cloud * env.cloud * 0.95
  const blend = (out, x, y) => {
    out.lerpColors(x, y, f)
    const l = out.r * 0.3 + out.g * 0.55 + out.b * 0.15
    return out.lerp(grey.setRGB(l * 0.8, l * 0.84, l * 0.92), cover)
  }
  blend(world.uTop.value, a.top, b.top)
  blend(world.uHorizon.value, a.horizon, b.horizon)
  world.uHorizon.value.lerp(grey.setRGB(0.72, 0.76, 0.8).multiplyScalar(1 - env.night * 0.85), env.fog * 0.6 * (1 - env.rain * 0.5))
  // Rain clouds block most of the light, so heavy weather gets properly dark.
  world.uTop.value.multiplyScalar(1 - env.rain * 0.66)
  world.uHorizon.value.multiplyScalar(1 - env.rain * 0.56)
  world.uSunColor.value.lerpColors(a.sun, b.sun, f)
  env.sky.lerpColors(a.sky, b.sky, f)
  env.ground.lerpColors(a.ground, b.ground, f)
  env.skyI = (a.skyI + (b.skyI - a.skyI) * f) * (1 - env.cloud * 0.28) * (1 - env.rain * 0.5)
  env.light.intensity = (a.sunI + (b.sunI - a.sunI) * f) * (1 - cover * 0.8) * (1 - env.rain * 0.4)
  env.light.color.copy(world.uSunColor.value)
}

export function updateEnvironment(dt) {
  if (env.timeTarget !== null) {
    const remaining = (env.timeTarget - env.time + 1) % 1
    const step = dt * 0.14
    if (remaining <= step) { env.time = env.timeTarget; env.timeTarget = null } else env.time = (env.time + step) % 1
  } else if (!reduced) env.time = (env.time + dt / DAY_SECONDS) % 1

  const a = (env.time - 0.25) * Math.PI * 2
  env.sun.set(Math.cos(a) * 0.85, Math.sin(a), 0.35).normalize()
  env.moon.set(-Math.cos(a) * 0.85, Math.max(-Math.sin(a), 0.12) * 0.9, 0.4).normalize()
  env.sunUp = THREE.MathUtils.smoothstep(env.sun.y, -0.04, 0.1)
  const night = 1 - THREE.MathUtils.smoothstep(env.sun.y, -0.16, 0.06)

  if (!reduced) {
    env.weatherTimer -= dt
    if (env.weatherTimer <= 0) {
      const options = WEATHER[env.weather].next
      const next = options[Math.floor(Math.random() * options.length)]
      if (next !== env.weather) announce(WEATHER[next].label, weatherLine(next))
      setWeather(next)
    }
  }

  const w = WEATHER[env.weather]
  const k = 1 - Math.exp(-dt * 0.45)
  const wasRaining = env.rain
  env.cloud += (w.cloud - env.cloud) * k
  env.rain += (w.rain - env.rain) * k
  env.fog += (w.fog - env.fog) * k
  env.night = night
  env.dark = Math.max(night, env.cloud * env.rain * 0.8)
  env.wet += ((env.rain > 0.08 ? 1 : 0) - env.wet) * (1 - Math.exp(-dt * (env.rain > 0.08 ? 0.5 : 0.07)))

  const t = world.uTime.value
  const gusting = 1 + Math.sin(t * 0.23) * 0.3 + Math.sin(t * 0.71 + 1) * 0.18
  env.wind += (w.wind * gusting - env.wind) * k
  env.windAngle += Math.sin(t * 0.05) * dt * 0.05

  if (wasRaining > 0.25 && env.rain <= 0.25 && env.sunUp > 0.5 && w.rain === 0) {
    env.rainbow = 1
    announce('A rainbow', 'The rain has passed.')
  }
  env.rainbow = Math.max(0, env.rainbow - dt / 50)

  if (env.weather === 'storm' && env.rain > 0.7 && !reduced) {
    env.strikeTimer -= dt
    if (env.strikeTimer <= 0) {
      env.strikeTimer = 5 + Math.random() * 11
      env.flash = 1
      env.bolt++
      setTimeout(thunder, 350 + Math.random() * 1400)
    }
  }
  env.flash = Math.max(0, env.flash - dt * 5)

  applyPalette(env.time)
  updateBulbs(env.dark)
  env.light.dir.copy(env.sun.y > 0.02 ? env.sun : env.moon)

  world.uSunDir.value.copy(env.sun)
  world.uMoonDir.value.copy(env.moon)
  world.uNight.value = night
  world.uCloud.value = env.cloud
  world.uRain.value = env.rain
  world.uWet.value = env.wet
  world.uWind.value = env.wind
  world.uWindDir.value.set(Math.cos(env.windAngle), Math.sin(env.windAngle))
  world.uFlash.value = env.flash
  // The arrival looks down from high up, so the haze lifts until the robot lands.
  const clearAir = arrival.active ? arrival.blend : 0
  world.uFogNear.value = 90 - env.fog * 78 + clearAir * 420
  world.uFogFar.value = 430 - env.fog * 335 + clearAir * 1200

  env.cloudColor.copy(world.uHorizon.value).lerp(grey.setRGB(1, 0.98, 0.95), 0.55 * (1 - night)).multiplyScalar(1 - env.cloud * 0.42 - night * 0.4)

  // Light rain drops away faster than it falls, so the sound ends with the last visible streaks.
  const rainHeard = env.rain * Math.min(1, env.rain * 2.5)
  setAmbience({ wind: env.wind, rain: rainHeard, night: night * (1 - env.rain) })
  publishClock()
}

function weatherLine(name) {
  return {
    clear: 'The sky opens up.', cloudy: 'Clouds are rolling in.', windy: 'The wind is picking up.',
    rain: 'Rain is starting to fall.', storm: 'A storm is breaking overhead.', fog: 'Fog is creeping across the island.',
  }[name]
}

function phaseOf(t) {
  if (t < 0.22 || t >= 0.8) return 'Night'
  if (t < 0.32) return 'Dawn'
  if (t < 0.68) return 'Day'
  return 'Dusk'
}

const PHASE_LINES = { Night: 'Lanterns are lighting across the island.', Dawn: 'A new day begins.', Dusk: 'The sun is going down.' }

function publishClock() {
  const minutes = Math.floor((env.time * 1440) / 10) * 10
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  const game = useGameStore.getState()
  if (game.clock === clock) return
  const phase = phaseOf(env.time)
  if (game.phase && phase !== game.phase && PHASE_LINES[phase]) announce(phase, PHASE_LINES[phase])
  useGameStore.setState({ clock, phase })
}
