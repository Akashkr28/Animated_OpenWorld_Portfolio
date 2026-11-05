import { ISLET, LANDMARKS, landmark, MOUNTAIN, PATHS, RIVER, TOWER, WATERFALL, ZONES } from './layout'

export const SPAN = 480
export const SEG = 256
const CELL = SPAN / SEG
const N = SEG + 1

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function islandRadius(theta) {
  // The bump pushes the north-east coast out to make room for the mountain.
  const bump = Math.atan2(Math.sin(theta + 0.7), Math.cos(theta + 0.7))
  return 148 + Math.sin(theta * 3 + 1) * 16 + Math.sin(theta * 5 + 2.2) * 9 + Math.sin(theta * 9) * 5
    + 26 * Math.exp(-((bump / 0.6) ** 2))
}

// Spatial buckets keep "nearest point" queries cheap across the large grid.
function bucketed(points, size) {
  const map = new Map()
  const key = (i, j) => i * 4096 + j
  points.forEach((p) => {
    const i = Math.floor(p.x / size), j = Math.floor(p.z / size)
    const k = key(i, j)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(p)
  })
  return (x, z) => {
    const ci = Math.floor(x / size), cj = Math.floor(z / size)
    let best = null, bestD = Infinity
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const list = map.get(key(i, j))
        if (!list) continue
        for (const p of list) {
          const d = (p.x - x) ** 2 + (p.z - z) ** 2
          if (d < bestD) { bestD = d; best = p }
        }
      }
    }
    return { point: best, distance: Math.sqrt(bestD) }
  }
}

const nearestPath = bucketed(PATHS.flatMap((p) => p.points), 12)
const nearestRiver = bucketed(RIVER, 20)
const zoneList = [
  ...Object.values(ZONES).filter((z) => z.radius > 0),
  ...LANDMARKS.filter((l) => l.flat > 0).map((l) => ({ x: l.x, z: l.z, radius: l.flat })),
]

export const distToPath = (x, z) => nearestPath(x, z).distance

export function distToZone(x, z) {
  let best = Infinity
  for (const zone of zoneList) best = Math.min(best, Math.hypot(zone.x - x, zone.z - z) - zone.radius)
  return best
}

export function distToRiver(x, z) {
  const { point, distance } = nearestRiver(x, z)
  return point ? distance - point.w : Infinity
}

function carveRiver(x, z, h) {
  const { point, distance } = nearestRiver(x, z)
  if (!point) return h
  const bank = 7
  if (distance > point.w + bank) return h
  if (distance < point.w) return point.y - 0.8 * (1 - (distance / point.w) ** 2) - 0.08
  const target = point.y + 0.15 + (distance - point.w) * 0.32
  return h + (target - h) * (1 - smoothstep(point.w, point.w + bank, distance))
}

function sampleHeight(x, z) {
  const r = Math.hypot(x, z)
  const edge = smoothstep(0.8, 1.03, r / islandRadius(Math.atan2(z, x)))
  const wild = smoothstep(60, 125, r)
  const hills = (Math.sin(x * 0.085 + 1.3) * Math.cos(z * 0.075 - 0.4) * 1.1 + Math.sin(x * 0.04 - z * 0.05) * 0.8) * (1 + wild * 1.6)
    + wild * Math.sin(x * 0.021 + 0.7) * Math.cos(z * 0.019) * 3

  // Zones sit on level ground and paths on nearly level ground.
  const flat = Math.max(1 - smoothstep(0, 9, distToZone(x, z)), (1 - smoothstep(2, 6, distToPath(x, z))) * 0.75)
  const hill = 3.6 * (1 - smoothstep(9, 26, Math.hypot(x - TOWER.x, z - TOWER.z)))
  let h = (1.7 + hills * (1 - flat) + hill) * (1 - edge) - 3 * edge
  h = Math.max(h, 0.7 - edge * 6) // no hollows below sea level away from the coast

  const dx = x - MOUNTAIN.x, dz = z - MOUNTAIN.z, d = Math.hypot(dx, dz)
  // Ridges fade toward the peak, where they'd otherwise be too steep to climb.
  const ridge = 1 + Math.sin(Math.atan2(dz, dx) * 5 + 0.6) * 0.15 * smoothstep(12, 48, d) + Math.sin(d * 0.22) * 0.03
  h += MOUNTAIN.height * Math.exp(-((d / MOUNTAIN.radius) ** 2)) * ridge
  h += 13 * Math.exp(-((Math.hypot(x - 58, z + 118) / 26) ** 2))

  const isle = smoothstep(ISLET.radius, 9, Math.hypot(x - ISLET.x, z - ISLET.z))
  h = Math.max(h, -3 + isle * 5.2)
  return carveRiver(x, z, h)
}

export const heights = new Float32Array(N * N)
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) heights[j * N + i] = sampleHeight(i * CELL - SPAN / 2, j * CELL - SPAN / 2)
}

// Softens the jagged cells where the carved river drops over the falls.
for (let pass = 0; pass < 3; pass++) {
  const copy = heights.slice()
  for (let j = 1; j < SEG; j++) {
    for (let i = 1; i < SEG; i++) {
      const x = i * CELL - SPAN / 2, z = j * CELL - SPAN / 2
      if (Math.hypot(x - WATERFALL.x, z - WATERFALL.z) > 17) continue
      if (distToRiver(x, z) < 0.5) continue
      const o = j * N + i
      heights[o] = (copy[o] * 2 + copy[o - 1] + copy[o + 1] + copy[o - N] + copy[o + N]) / 6
    }
  }
}

// Must match the triangulated terrain closely, so it interpolates the same grid.
export function heightAt(x, z) {
  const gx = Math.min(SEG - 0.001, Math.max(0, (x + SPAN / 2) / CELL))
  const gz = Math.min(SEG - 0.001, Math.max(0, (z + SPAN / 2) / CELL))
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j
  const a = heights[j * N + i], b = heights[j * N + i + 1]
  const c = heights[(j + 1) * N + i], d = heights[(j + 1) * N + i + 1]
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz
}

export function slopeAt(x, z) {
  const e = 1.5
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e)
}

// Surface height of whatever water is here: the river, or sea level.
export function waterLevelAt(x, z) {
  const { point, distance } = nearestRiver(x, z)
  return point && distance < point.w + 0.5 ? Math.max(point.y, 0) : 0
}

function firstBelow(ax, az, bx, bz, level) {
  for (let t = 0; t <= 1; t += 0.005) {
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t
    if (heightAt(x, z) < level) return { x, z, t }
  }
  return { x: bx, z: bz, t: 1 }
}

const pierStart = firstBelow(-12, 100, -12, 190, 1.1)
const isleA = firstBelow(-100, 75, -176, 130, 1.25)
const isleB = firstBelow(-176, 130, -100, 75, 1.25)

// Bridges and piers: the player may stand over deep water on these.
export const WALKWAYS = [
  {
    id: 'pier', a: pierStart, b: { x: pierStart.x, z: pierStart.z + 30 },
    ya: 1.25, yb: 1.25, arch: 0, width: 1.5, pieces: 1,
  },
  {
    id: 'isle', a: isleA, b: isleB, ya: heightAt(isleA.x, isleA.z) + 0.1, yb: heightAt(isleB.x, isleB.z) + 0.1,
    arch: 2.2, width: 1.3, pieces: 12,
  },
  {
    id: 'river', a: { x: 65, z: 8 }, b: { x: 83, z: 8 }, ya: heightAt(65, 8) + 0.1, yb: heightAt(83, 8) + 0.1,
    arch: 1.3, width: 1.7, pieces: 8,
  },
]

// The pier's position depends on where the shore falls, so its landmark follows.
Object.assign(landmark('pier'), { x: pierStart.x, z: pierStart.z + 27 })

function onWalkway(x, z) {
  return WALKWAYS.some(({ a, b, width }) => {
    const dx = b.x - a.x, dz = b.z - a.z
    const t = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)
    return t >= 0 && t <= 0.99 && Math.hypot(a.x + dx * t - x, a.z + dz * t - z) < width - 0.25
  })
}

// Wading is allowed up to about waist depth; deep sea is the edge of the world.
export const isWalkable = (x, z) => heightAt(x, z) > -1 || onWalkway(x, z)

export function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
