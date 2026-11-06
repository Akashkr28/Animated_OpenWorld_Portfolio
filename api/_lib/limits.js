// Protection for the public routes.
import { createHash } from 'node:crypto'

// On Vercel every request can land on a different server copy, so counts live in Upstash Redis
// when it's connected. Without it they're kept in this server's memory.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const DAY = 24 * 60 * 60 * 1000

const hits = new Map()

function countInMemory(key, limit, windowMs) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
  const allowed = recent.length < limit
  if (allowed) recent.push(now)
  hits.set(key, recent)
  return allowed
}

// A fixed window: the first hit starts a counter that expires when the window ends.
async function countInRedis(key, limit, windowMs) {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify([['INCR', key], ['PEXPIRE', key, String(windowMs), 'NX']]),
  })
  if (!response.ok) throw new Error(`Upstash ${response.status}`)
  const [count] = await response.json()
  return count.result <= limit
}

async function allowed(key, limit, windowMs) {
  try {
    return REDIS_URL && REDIS_TOKEN ? await countInRedis(key, limit, windowMs) : countInMemory(key, limit, windowMs)
  } catch (err) {
    console.error('rate limit store failed:', err)
    return countInMemory(key, limit, windowMs)
  }
}

// Other sites can't borrow these routes from a visitor's browser.
export function foreignOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin || URL.canParse(origin) && new URL(origin).host === request.headers.get('host')) return null
  return new Response('Not allowed.', { status: 403 })
}

// One ceiling per visitor, and one for the whole site so a script can't flood the island.
export async function tooMany(request, bucket, { perVisitor, windowMs, perDay }) {
  // Hashed, so no IP address is ever written down, even in these short-lived counters.
  const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  const visitor = createHash('sha256').update(address).digest('hex').slice(0, 16)
  const ok = await allowed(`limit:${bucket}:${visitor}`, perVisitor, windowMs) && await allowed(`limit:${bucket}:site`, perDay, DAY)
  return ok ? null : new Response('Too many requests. Give it a minute.', { status: 429 })
}
