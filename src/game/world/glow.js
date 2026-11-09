import * as THREE from 'three'

// Lamps, lit windows and flames. Brighter than white once it's dark, so the bloom picks them up.
const bulbs = new Map()

export function bulb(hex, { always = false } = {}) {
  const key = `${hex}-${always}`
  if (!bulbs.has(key)) {
    const material = new THREE.MeshBasicMaterial({ color: hex })
    material.userData = { base: new THREE.Color(hex), always }
    bulbs.set(key, material)
  }
  return bulbs.get(key)
}

export function updateBulbs(dark) {
  for (const m of bulbs.values()) m.color.copy(m.userData.base).multiplyScalar(m.userData.always ? 1.8 : 1 + dark * 2.2)
}
