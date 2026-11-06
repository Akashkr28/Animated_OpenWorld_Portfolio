import SignForm from '../SignForm'
import { useGameStore } from '../../store/useGameStore'

const day = (at) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function GuestbookPage() {
  const book = useGameStore((s) => s.guestbook)
  const signer = useGameStore((s) => s.signer)
  return (
    <>
      <p className="text-sm text-cream/85">
        <b className="text-apricot">{book.total}</b> {book.total === 1 ? 'visitor' : 'visitors'} so far, and <b className="text-apricot">{book.signed}</b> signed.
      </p>
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
