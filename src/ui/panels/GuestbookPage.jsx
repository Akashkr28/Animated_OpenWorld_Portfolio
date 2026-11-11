import SignForm from '../SignForm'
import { useGameStore } from '../../store/useGameStore'

const day = (at) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function GuestbookPage() {
  const book = useGameStore((s) => s.guestbook)
  const signer = useGameStore((s) => s.signer)
  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        {[[book.total, book.total === 1 ? 'Visitor so far' : 'Visitors so far'], [book.signed, 'Names signed']].map(([n, label]) => (
          <div key={label} className="rounded-2xl bg-cream/6 px-4 py-3 ring-1 ring-cream/10">
            <dt className="hud-label">{label}</dt>
            <dd className="text-glow font-display text-3xl font-extrabold text-apricot">{n}</dd>
          </div>
        ))}
      </dl>
      {!signer && <div className="mt-4"><SignForm /></div>}
      {book.names.length > 0 ? (
        <ul className="mt-5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {book.names.map((entry) => (
            <li key={`${entry.name}${entry.at}`} className="flex justify-between gap-3 border-b border-cream/10 pb-1.5 text-sm">
              <span className="font-semibold">{entry.name}</span>
              <span className="text-cream/70">{day(entry.at)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-5 text-sm">Be the first to sign.</p>}
      {book.signed > book.names.length && <p className="mt-3 text-xs text-cream/70">Showing the {book.names.length} most recent.</p>}
    </>
  )
}
