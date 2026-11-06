// Names appear publicly on a professional portfolio, so anything doubtful is refused.
// This stops the obvious cases only. Use the delete route for whatever gets past it.
// Refused anywhere in a name, however it's spaced or spelled.
const ANYWHERE = [
  'fuck', 'fuk', 'nigg', 'asshole', 'bitch', 'porn', 'whore', 'pussy', 'retard', 'hitler', 'nazi',
  'chutiya', 'chutia', 'madarchod', 'behenchod', 'bhenchod', 'bhosdi',
  ...(process.env.BLOCKED_NAMES?.toLowerCase().split(',').filter(Boolean) ?? []),
]
// Only refused as a whole word, or real names like Shital, Dickson and Hancock would be caught.
const WHOLE_WORD = ['shit', 'cunt', 'dick', 'cock', 'slut', 'rape', 'fag', 'wank', 'bastard', 'gandu', 'gaand', 'lund', 'randi', 'harami', 'kamina', 'saala']
const SWAPS = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' }

// Letters from any language, digits, spaces, hyphens and apostrophes. No dots, so no web links.
const ALLOWED = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '-]*$/u
const MIN = 2, MAX = 16

const squash = (name) => name
  .normalize('NFKC').toLowerCase()
  .replace(/[013457@$!]/g, (c) => SWAPS[c])
  .replace(/[^\p{L}]/gu, '')
  .replace(/(.)\1+/gu, '$1')

// Returns the tidied name, or null if it can't be shown.
export function cleanName(raw) {
  if (typeof raw !== 'string') return null
  const name = raw.normalize('NFKC').trim().replace(/\s+/g, ' ')
  if ([...name].length < MIN || [...name].length > MAX || !ALLOWED.test(name)) return null
  const letters = squash(name)
  if (ANYWHERE.some((word) => letters.includes(squash(word)))) return null
  const words = [...name.split(/[\s'-]+/).map(squash), letters]
  return WHOLE_WORD.some((word) => words.includes(squash(word))) ? null : name
}
