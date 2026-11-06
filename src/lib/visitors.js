// The visitor's side of the guestbook. The only thing kept in the browser is a random id and
// the name they chose, so nothing here identifies a person.
import { player } from '../game/player/playerState'
import { useGameStore } from '../store/useGameStore'

const URL = '/api/visitors'
const ID_KEY = 'island-visitor-id'
const NAME_KEY = 'island-visitor-name'
const SKIP_KEY = 'island-visitor-skipped'

const read = (key) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const write = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* private window: forgotten on leaving */ }
}

let id = read(ID_KEY)
if (!id) {
  id = crypto.randomUUID()
  write(ID_KEY, id)
}

const post = (body) => fetch(URL, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }),
})
const here = () => ({ x: player.position.x, z: player.position.z })

async function refresh() {
  const res = await fetch(URL)
  if (res.ok) useGameStore.setState({ guestbook: await res.json() })
  return res.ok
}

// Counts the visit and loads the board. If the server isn't set up, the feature stays hidden.
export async function startVisit() {
  try {
    const visit = await post({ type: 'visit' })
    if (!visit.ok) return
    const { tag } = await visit.json()
    const saved = read(NAME_KEY)
    // A returning visitor gets their bot back without being asked again.
    if (saved) {
      useGameStore.setState({ signer: { name: saved, tag } })
      await post({ type: 'sign', name: saved, ...here() })
    }
    if (await refresh() && !saved && !read(SKIP_KEY)) useGameStore.setState({ signPrompt: true })
  } catch {
    // Offline or unavailable: the island works fine without it.
  }
}

// Returns an error message to show, or null when it worked.
export async function signName(name) {
  try {
    const res = await post({ type: 'sign', name, ...here() })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return body.error ?? "That didn't work. Try again in a minute."
    write(NAME_KEY, body.name)
    useGameStore.setState({ signer: body, signPrompt: false })
    useGameStore.getState().showToast('Your bot is on the island', 'It stays here for 24 hours after you leave.')
    await refresh()
    return null
  } catch {
    return "That didn't work. Try again in a minute."
  }
}

export function skipSigning() {
  write(SKIP_KEY, '1')
  useGameStore.setState({ signPrompt: false })
}

// Leaves the bot where the visitor last stood. Phones often skip pagehide, so both are used.
export function keepBotInPlace() {
  const leave = () => {
    if (document.visibilityState !== 'hidden' || !useGameStore.getState().signer) return
    navigator.sendBeacon(URL, JSON.stringify({ id, type: 'move', ...here() }))
  }
  document.addEventListener('visibilitychange', leave)
  window.addEventListener('pagehide', leave)
  return () => {
    document.removeEventListener('visibilitychange', leave)
    window.removeEventListener('pagehide', leave)
  }
}
