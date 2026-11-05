import { greetings } from '../data/portfolio'

// Uses the visitor's own clock, so they're greeted for their time of day, not the island's.
export function timeGreeting(hour = new Date().getHours()) {
  const part = hour >= 5 && hour < 12 ? 'morning'
    : hour >= 12 && hour < 17 ? 'afternoon'
      : hour >= 17 && hour < 22 ? 'evening'
        : 'night'
  return { title: greetings[part], line: greetings.intro }
}
