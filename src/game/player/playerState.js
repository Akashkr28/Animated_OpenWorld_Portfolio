import { Vector3 } from 'three'

// Per-frame values live outside React so reading them never causes a re-render.
export const player = {
  position: new Vector3(),
  yaw: Math.PI, // spawns facing north, away from the camera
  speed: 0,
  grounded: true,
  indoors: false,
  sleeping: false,
  anim: 'idle',
  teleport: null, // { x, z } consumed by Player on the next frame
  body: null, // rapier body, excluded from the camera's obstacle ray
}

export const camera = { yaw: 0 }
