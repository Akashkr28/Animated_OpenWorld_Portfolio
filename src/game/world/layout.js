import { CatmullRomCurve3, Vector3 } from 'three'
import { milestones, projects } from '../../data/portfolio'

// Island coordinates: -Z is north. Heights come from terrain.js.
export const SPAWN = { x: 0, z: 19 }

// `arrival` is where the minimap teleport drops the player.
export const ZONES = {
  spawn: { x: 0, z: 16, radius: 12, color: '#ffc27a', arrival: [0, 19] },
  about: { x: -37, z: 3, radius: 13, color: '#ff7a59', arrival: [-29, 4] },
  projects: { x: 37, z: 1, radius: 14, color: '#7ad7f0', arrival: [28, 2] },
  journey: { x: -1, z: -17, radius: 0, color: '#c8b6ff', arrival: [0, 7] },
  contact: { x: 3, z: -46, radius: 11, color: '#2fb7a8', arrival: [2, -37] },
}

const curve = (points) => new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), false, 'catmullrom', 0.5)

export const journeyCurve = curve([[0, 6], [-9, -2], [6, -11], [-9, -21], [6, -30], [2, -39]])

const trail = (points, samples) => ({ curve: curve(points), samples, width: 1.35 })

export const PATHS = [
  { curve: curve([[-7, 13], [-16, 12], [-23, 5], [-30, 4]]), samples: 28 },
  { curve: curve([[7, 13], [15, 8], [23, 8], [28, 2]]), samples: 28 },
  { curve: journeyCurve, samples: 70, width: 2.3 },
  // Wilderness trails beyond the portfolio zones.
  trail([[46, 2], [58, 6], [66, 8], [82, 8], [92, 9], [108, 12]], 44),
  trail([[110, 6], [102, -20], [91, -42], [85, -56]], 46),
  trail([[85, -56], [100, -60], [118, -68], [122, -86], [108, -90]], 54),
  trail([[-46, 2], [-68, -10], [-86, -30], [-100, -42]], 50),
  trail([[-86, -30], [-78, -60], [-64, -94]], 50),
  trail([[-46, 9], [-68, 32], [-90, 58], [-103, 72]], 56),
  trail([[0, 27], [-6, 52], [-10, 84], [-12, 136]], 70),
  trail([[-2, -52], [-25, -74], [-52, -94]], 50),
].map((p) => ({ width: 1.7, ...p, points: p.curve.getSpacedPoints(p.samples) }))

export const MOUNTAIN = { x: 105, z: -85, height: 40, radius: 44 }
export const ISLET = { x: -176, z: 130, radius: 24 }

// River spine: x, z, surface height, half width. The steep pair of points is the waterfall.
const RIVER_POINTS = [
  [96, -88, 30, 1.5], [86, -80, 26.5, 2], [78, -72, 23.5, 2.4], [75.5, -69.5, 22.8, 2.6],
  [71.5, -65.5, 6, 3.2], [68, -62, 5, 5.5], [66, -50, 4.6, 3.5], [72, -32, 3.9, 3.5],
  [80, -12, 3.1, 4], [74, 8, 2.5, 4.5], [84, 30, 1.8, 5], [78, 54, 1.2, 5.5],
  [92, 78, 0.6, 6.5], [110, 98, 0.1, 8], [130, 118, -0.1, 10],
]
const riverCurve = new CatmullRomCurve3(RIVER_POINTS.map(([x, z]) => new Vector3(x, 0, z)), false, 'centripetal')
const PER_SEGMENT = 14
export const RIVER = Array.from({ length: (RIVER_POINTS.length - 1) * PER_SEGMENT + 1 }, (_, i) => {
  const u = i / PER_SEGMENT
  const a = Math.min(Math.floor(u), RIVER_POINTS.length - 2)
  const f = u - a
  const p = riverCurve.getPoint(u / (RIVER_POINTS.length - 1))
  return {
    x: p.x, z: p.z,
    y: RIVER_POINTS[a][2] + (RIVER_POINTS[a + 1][2] - RIVER_POINTS[a][2]) * f,
    w: RIVER_POINTS[a][3] + (RIVER_POINTS[a + 1][3] - RIVER_POINTS[a][3]) * f,
  }
})
export const WATERFALL = { x: 71, z: -65, y: 5.2 }

// Hidden places. `flat` levels the ground around them; `radius` is the discovery range.
export const LANDMARKS = [
  { id: 'summit', x: 106, z: -86, radius: 9, flat: 0 },
  { id: 'falls', x: 79, z: -57, radius: 13, flat: 0 },
  { id: 'windmill', x: 114, z: 12, radius: 12, flat: 9 },
  { id: 'grove', x: -105, z: -45, radius: 12, flat: 10 },
  { id: 'ruins', x: -64, z: -102, radius: 13, flat: 12 },
  { id: 'cove', x: -108, z: 76, radius: 11, flat: 8 },
  { id: 'pier', x: -12, z: 150, radius: 9, flat: 0 },
  { id: 'isle', x: -176, z: 130, radius: 13, flat: 0 },
]
export const landmark = (id) => LANDMARKS.find((l) => l.id === id)

export const PLAZA_LAMPS = [0.5, 1.6, 2.5, 3.65, 4.6, 5.6].map((a) => [ZONES.spawn.x + Math.cos(a) * 10, ZONES.spawn.z + Math.sin(a) * 10])

// Lantern posts every so often along the wilderness trails.
export const LANTERNS = PATHS.slice(3).flatMap((p) => p.points
  .filter((_, i) => i % 9 === 4)
  .map((pt, i) => [pt.x + (i % 2 ? 2.6 : -2.6), pt.z + (i % 2 ? -1 : 1)]))

// The house door faces east, toward the path from the plaza.
export const HOUSE = { x: -40, z: 3, doorX: -36, doorZ: 3, halfW: 4, halfD: 3.5 }
export const insideHouse = (x, z, margin = 0) => Math.abs(x - HOUSE.x) < HOUSE.halfW + margin && Math.abs(z - HOUSE.z) < HOUSE.halfD + margin

// Furniture, as [x, z] from the middle of the room.
export const ROOM = { desk: [-3.3, 1], stool: [-2.5, 1], bed: [-1, -2.6], shelf: [0, 3.04], certificate: [-3.72, -1.5], plant: [-3.3, -2.9] }
const inRoom = ([x, z]) => ({ x: HOUSE.x + x, z: HOUSE.z + z })

// Pedestals sit on an arc around the gallery, opening west toward the plaza.
export const pedestals = projects.map((project, i) => {
  const t = projects.length === 1 ? 0.5 : i / (projects.length - 1)
  const angle = -1.25 + t * 2.5
  return {
    project,
    x: ZONES.projects.x + Math.cos(angle) * 9.5,
    z: ZONES.projects.z + Math.sin(angle) * 9.5,
    facing: -angle - Math.PI / 2,
  }
})

// Stones sit just off the road at even spacing, alternating sides.
export const stones = milestones.map((milestone, i) => {
  const t = (i + 0.6) / (milestones.length + 0.2)
  const p = journeyCurve.getPointAt(t)
  const tangent = journeyCurve.getTangentAt(t)
  const side = i % 2 === 0 ? 1 : -1
  return {
    milestone,
    index: i,
    x: p.x - tangent.z * 3.4 * side,
    z: p.z + tangent.x * 3.4 * side,
    triggerX: p.x,
    triggerZ: p.z,
  }
})

export const GUESTBOOK = { x: 5.2, z: 8.4, yaw: -0.5 }
export const MAILBOX = { x: -2.4, z: -41.5 }
export const TOWER = { x: 3, z: -48 }

// Everything the player can press E on.
export const interactables = [
  { id: 'door', x: HOUSE.doorX + 1.8, z: HOUSE.doorZ, radius: 2.2, prompt: 'Go inside', action: 'enter' },
  { id: 'about', ...inRoom([-2.1, 1]), radius: 1.7, prompt: 'Use the laptop', panel: { type: 'about' } },
  { id: 'bed', ...inRoom([-1, -1.5]), radius: 1.5, prompt: 'Sleep until morning', action: 'sleep' },
  { id: 'shelf', ...inRoom([0, 2.2]), radius: 1.5, prompt: 'Browse the bookshelf', panel: { type: 'skills' } },
  { id: 'certificate', ...inRoom([-2.9, -1.2]), radius: 1.2, prompt: 'Read the certificate', panel: { type: 'education' } },
  ...pedestals.map(({ project, x, z }) => ({
    id: `project-${project.id}`, x, z, radius: 3.2, prompt: `View ${project.title}`, panel: { type: 'project', id: project.id },
  })),
  { id: 'guestbook', x: GUESTBOOK.x - 0.6, z: GUESTBOOK.z + 1.6, radius: 3, prompt: 'Read the guestbook', panel: { type: 'guestbook' } },
  { id: 'contact', x: MAILBOX.x, z: MAILBOX.z, radius: 3.4, prompt: 'Open the mailbox', panel: { type: 'contact' } },
]
