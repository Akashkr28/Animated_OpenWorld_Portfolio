// The island's guestbook. A visitor's bot stays for a day; their name stays on the board.
// Nothing here identifies anyone: browsers are random ids, kept only as a one-way tag.
import { createHash, timingSafeEqual } from 'node:crypto'
import { foreignOrigin, tooMany } from './_lib/limits.js'
import { cleanName } from './_lib/names.js'
import { run, storeReady } from './_lib/store.js'

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_SECONDS = 24 * 60 * 60
const MAX_BOTS = 30
const NAMES_SHOWN = 50
const ISLAND = 220 // nothing can be placed further out than this
const ID = /^[a-z0-9-]{8,40}$/

const TOTAL = 'visitors:total', NAMES = 'visitors:names', BOTS = 'visitors:bots'
const sha = (text) => createHash('sha256').update(text).digest()
const tagOf = (id) => sha(id).toString('hex').slice(0, 12)
const coordinate = (v) => (Number.isFinite(v) ? Math.max(-ISLAND, Math.min(ISLAND, Math.round(v * 10) / 10)) : null)
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers })
const offline = () => new Response('The guestbook is not connected.', { status: 503 })

function pairs(flat) {
  const out = []
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], JSON.parse(flat[i + 1])])
  return out
}

export async function GET() {
  if (!storeReady()) return offline()
  const [total, signed, names, flat] = await run(['GET', TOTAL], ['LLEN', NAMES], ['LRANGE', NAMES, 0, NAMES_SHOWN - 1], ['HGETALL', BOTS])
  const now = Date.now()
  const all = pairs(flat ?? [])
  const expired = all.filter(([, bot]) => now - bot.at > DAY_MS).map(([tag]) => tag)
  if (expired.length) await run(['HDEL', BOTS, ...expired])
  const bots = all
    .filter(([tag]) => !expired.includes(tag))
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_BOTS)
    .map(([tag, bot]) => ({ tag, ...bot }))
  return json(
    { total: Math.max(Number(total ?? 0), signed), signed, names: names.map((n) => JSON.parse(n)), bots },
    200,
    { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' },
  )
}

export async function POST(request) {
  if (!storeReady()) return offline()
  const blocked = foreignOrigin(request)
    ?? await tooMany(request, 'visitors', { perVisitor: 30, windowMs: 10 * 60 * 1000, perDay: 5000 })
  if (blocked) return blocked

  let body
  try {
    // Text, because a page closing sends its last update without a JSON content type.
    body = JSON.parse(await request.text())
  } catch {
    return new Response('Invalid request body.', { status: 400 })
  }
  if (!ID.test(body?.id ?? '')) return new Response('Invalid id.', { status: 400 })
  const tag = tagOf(body.id)

  if (body.type === 'visit') {
    // Each browser counts once a day.
    const [first] = await run(['SET', `visitors:seen:${tag}`, '1', 'NX', 'EX', DAY_SECONDS])
    if (first) await run(['INCR', TOTAL])
    return json({ tag })
  }

  const x = coordinate(body.x), z = coordinate(body.z)
  if (x === null || z === null) return new Response('Invalid position.', { status: 400 })

  if (body.type === 'sign') {
    const name = cleanName(body.name)
    if (!name) return json({ error: 'Please choose a different name.' }, 422)
    const at = Date.now()
    await run(['HSET', BOTS, tag, JSON.stringify({ name, x, z, at })])
    // Coming back the next day brings the bot back, but the board keeps one line per visitor.
    const [firstTime] = await run(['SET', `visitors:signer:${tag}`, name, 'NX'])
    if (firstTime) await run(['LPUSH', NAMES, JSON.stringify({ name, at })])
    return json({ name, tag })
  }

  if (body.type === 'move') {
    const [flat] = await run(['HGETALL', BOTS])
    const bot = pairs(flat ?? []).find(([t]) => t === tag)?.[1]
    if (bot) await run(['HSET', BOTS, tag, JSON.stringify({ ...bot, x, z })])
    return new Response(null, { status: 204 })
  }
  return new Response('Unknown request.', { status: 400 })
}

// Removes a name from the board and its bot: curl -X DELETE -H "x-admin-key: ..." -d '{"name":"..."}'
export async function DELETE(request) {
  const key = process.env.VISITORS_ADMIN_KEY
  const given = request.headers.get('x-admin-key') ?? ''
  if (!key || !storeReady() || !timingSafeEqual(sha(key), sha(given))) return new Response('Not allowed.', { status: 403 })

  let name
  try {
    name = JSON.parse(await request.text())?.name
  } catch {
    return new Response('Invalid request body.', { status: 400 })
  }
  const [entries, flat] = await run(['LRANGE', NAMES, 0, -1], ['HGETALL', BOTS])
  const lines = entries.filter((line) => JSON.parse(line).name === name)
  const tags = pairs(flat ?? []).filter(([, bot]) => bot.name === name).map(([tag]) => tag)
  if (lines.length) await run(...lines.map((line) => ['LREM', NAMES, 0, line]))
  if (tags.length) await run(['HDEL', BOTS, ...tags])
  return json({ names: lines.length, bots: tags.length })
}
