// Decides whether the 3D island should run at all on this device.
export function detectCapability() {
  const canvas = document.createElement('canvas')
  const webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  if (!webgl) return { canRun3D: false, lowEnd: true }

  // Returns null when the browser would fall back to software rendering.
  const fast = !!document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4
  const saveData = navigator.connection?.saveData === true
  return { canRun3D: true, lowEnd: !fast || cores <= 2 || memory <= 2 || saveData }
}

export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
