// Upstash Redis in production. Local development falls back to memory, which empties on restart.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

const memory = new Map()
const list = (key) => memory.get(key) ?? memory.set(key, []).get(key)
const hash = (key) => memory.get(key) ?? memory.set(key, new Map()).get(key)

const LOCAL = {
  INCR: (key) => { memory.set(key, (memory.get(key) ?? 0) + 1); return memory.get(key) },
  GET: (key) => memory.get(key) ?? null,
  SET: (key, value) => { if (memory.has(key)) return null; memory.set(key, value); return 'OK' },
  LPUSH: (key, value) => list(key).unshift(value),
  LRANGE: (key, from, to) => list(key).slice(from, to < 0 ? undefined : to + 1),
  LLEN: (key) => list(key).length,
  LREM: (key, _, value) => { const l = list(key), n = l.length; memory.set(key, l.filter((v) => v !== value)); return n - memory.get(key).length },
  HSET: (key, field, value) => { hash(key).set(field, value); return 1 },
  HGETALL: (key) => [...hash(key)].flat(),
  HDEL: (key, ...fields) => fields.filter((f) => hash(key).delete(f)).length,
}

export const storeReady = () => !!(URL_ && TOKEN) || process.env.NODE_ENV !== 'production'

// Runs commands in order and returns their results, e.g. run(['GET', 'a'], ['LLEN', 'b']).
export async function run(...commands) {
  if (!URL_ || !TOKEN) return commands.map(([name, ...args]) => LOCAL[name](...args))
  const response = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(commands),
  })
  if (!response.ok) throw new Error(`Upstash ${response.status}`)
  return (await response.json()).map((r) => r.result)
}
