import * as THREE from 'three'

export const DISPLAY = '"Bricolage Grotesque Variable", sans-serif'
export const BODY = '"Figtree Variable", sans-serif'

function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// A pill-shaped name tag for sprites. Returns the texture and its width/height ratio.
export function pillLabel(text, { color = '#ffc27a', size = 64 } = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const font = `700 ${size}px ${DISPLAY}`
  ctx.font = font
  const pad = size * 0.7
  canvas.width = Math.ceil(ctx.measureText(text).width + pad * 2 + size * 0.5)
  canvas.height = Math.ceil(size * 1.9)
  const h = canvas.height
  ctx.fillStyle = 'rgba(27,24,56,.82)'
  ctx.beginPath()
  ctx.roundRect(2, 2, canvas.width - 4, h - 4, h / 2 - 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(pad * 0.8, h / 2, size * 0.17, 0, 7)
  ctx.fill()
  ctx.font = font
  ctx.fillStyle = '#fff4e3'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, pad * 0.8 + size * 0.42, h / 2 + size * 0.04)
  return { texture: toTexture(canvas), aspect: canvas.width / h }
}

export function signTexture({ name, title, tagline }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 576
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#6b4632'
  ctx.fillRect(0, 0, 1024, 576)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,220,170,.05)' : 'rgba(30,10,0,.1)'
    ctx.fillRect(0, i * 96, 1024, 96)
    ctx.fillStyle = 'rgba(30,12,4,.4)'
    ctx.fillRect(0, i * 96 - 2, 1024, 4)
  }
  ctx.strokeStyle = '#ffc27a'
  ctx.lineWidth = 6
  ctx.strokeRect(26, 26, 972, 524)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffc27a'
  ctx.font = `600 40px ${BODY}`
  ctx.fillText('Welcome to the island of', 512, 120)
  ctx.fillStyle = '#fff4e3'
  ctx.font = `800 104px ${DISPLAY}`
  ctx.fillText(name, 512, 248, 930)
  ctx.fillStyle = '#ff9a7c'
  ctx.font = `700 54px ${DISPLAY}`
  ctx.fillText(title, 512, 340)
  ctx.fillStyle = '#fff4e3'
  ctx.font = `500 34px ${BODY}`
  ctx.fillText(tagline, 512, 440, 920)
  return toTexture(canvas)
}

export function numberTexture(n) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.font = `800 92px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff4e3'
  ctx.fillText(String(n), 64, 70)
  return toTexture(canvas)
}

// Vertical fade used by the light beams.
export function fadeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#000')
  g.addColorStop(0.75, '#555')
  g.addColorStop(1, '#fff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  return new THREE.CanvasTexture(canvas)
}
