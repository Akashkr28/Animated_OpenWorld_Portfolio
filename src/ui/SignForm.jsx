import { useState } from 'react'
import { signName } from '../lib/visitors'

export default function SignForm({ autoFocus = false, children }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const clean = name.trim()
    if (clean.length < 2) return setError('Enter at least 2 letters.')
    setBusy(true)
    setError((await signName(clean)) ?? '')
    setBusy(false)
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap gap-2">
        <input
          value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={16} autoFocus={autoFocus}
          aria-label="Your name" aria-invalid={!!error} placeholder="First name" autoComplete="off"
          className="min-w-0 flex-1 rounded-full bg-night/50 px-4 py-2 text-base placeholder:text-cream/60 sm:text-sm"
        />
        <button type="submit" disabled={busy} className="rounded-full bg-coral px-4 py-2 text-sm font-bold text-night hover:bg-apricot">Leave my name</button>
        {children}
      </div>
      {error && <p className="mt-2 text-sm text-apricot" role="alert">{error}</p>}
      <p className="mt-2 text-xs text-cream/75">Your name will be public. Your bot stays for 24 hours and your name stays on the board.</p>
    </form>
  )
}
