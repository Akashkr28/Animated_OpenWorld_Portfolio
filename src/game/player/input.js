import { useGameStore } from '../../store/useGameStore'

const keys = new Set()
const AXIS = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
}

export const input = {
  stick: { x: 0, y: 0 }, // on-screen joystick, -1..1
  jumpQueued: false,
}

export function readMove() {
  let x = input.stick.x, y = input.stick.y
  for (const code of keys) {
    const axis = AXIS[code]
    if (axis) { x += axis[0]; y += axis[1] }
  }
  const length = Math.hypot(x, y)
  if (length > 1) { x /= length; y /= length }
  const usingStick = input.stick.x !== 0 || input.stick.y !== 0
  return { x, y, run: keys.has('ShiftLeft') || keys.has('ShiftRight') || (usingStick && Math.hypot(x, y) > 0.8) }
}

export function interact() {
  const { nearby, panel, openPanel } = useGameStore.getState()
  if (nearby && !panel) openPanel(nearby.panel)
}

export function attachKeyboard() {
  const typing = (el) => el?.matches?.('input, textarea, select, [contenteditable]')
  const onDown = (e) => {
    const state = useGameStore.getState()
    if (e.key === 'Escape' && state.panel) { state.closePanel(); return }
    if (e.code === 'KeyM' && !e.repeat && state.ready && !typing(e.target)) {
      if (state.panel?.type === 'map') state.closePanel()
      else if (!state.panel) state.openPanel({ type: 'map' })
      return
    }
    if (state.panel || !state.ready || typing(e.target)) return

    // A focused button keeps Space and Enter; movement keys still reach the game.
    if ((e.code === 'Space' || e.code === 'Enter') && e.target.closest?.('button, a')) return

    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) input.jumpQueued = true }
    if (e.code === 'KeyE' && !e.repeat) interact()
    if (e.code === 'KeyG' && !e.repeat) state.greet()
    if (e.code in AXIS) e.preventDefault()
    keys.add(e.code)
  }
  const onUp = (e) => keys.delete(e.code)
  const clear = () => keys.clear()

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', clear)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', clear)
  }
}

export const clearKeys = () => keys.clear()
