import { useRef } from 'react'
import { input } from '../game/player/input'

const RADIUS = 52

export default function Joystick() {
  const knob = useRef()
  const origin = useRef(null)

  const update = (e) => {
    if (e.pointerId !== origin.current?.id) return
    let dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y
    const length = Math.hypot(dx, dy)
    if (length > RADIUS) { dx *= RADIUS / length; dy *= RADIUS / length }
    knob.current.style.transform = `translate(${dx}px,${dy}px)`
    input.stick.x = dx / RADIUS
    input.stick.y = -dy / RADIUS
  }
  const end = (e) => {
    if (e.pointerId !== origin.current?.id) return
    origin.current = null
    knob.current.style.transform = ''
    input.stick.x = input.stick.y = 0
  }

  return (
    <div
      role="presentation"
      className="glass relative size-32 touch-none rounded-full"
      onPointerDown={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        origin.current = { id: e.pointerId, x: box.left + box.width / 2, y: box.top + box.height / 2 }
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={update}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div ref={knob} className="absolute top-1/2 left-1/2 -mt-7 -ml-7 size-14 rounded-full bg-cream/80 shadow-lg" />
    </div>
  )
}
