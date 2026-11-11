// A small line-icon set for the interface, drawn on a 24-unit grid.
const Icon = ({ children, className = 'size-5', ...rest }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
    {children}
  </svg>
)

export const SoundOn = (p) => <Icon {...p}><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Icon>
export const SoundOff = (p) => <Icon {...p}><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></Icon>
export const Layout = (p) => <Icon {...p}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M9 9v11" /></Icon>
export const MapIcon = (p) => <Icon {...p}><path d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z" /><path d="M9 4.5v12.7M15 6.8v12.7" /></Icon>
export const Download = (p) => <Icon {...p}><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 19.5h14" /></Icon>
export const Sun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></Icon>
export const Moon = (p) => <Icon {...p}><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></Icon>
export const Sunset = (p) => <Icon {...p}><path d="M7 15a5 5 0 0 1 10 0M3 15h18M6 19h12M12 4v4m-4-1 1.5 1.5M16 7l-1.5 1.5" /></Icon>
export const Cloud = (p) => <Icon {...p}><path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 11a3.75 3.75 0 0 0 0 7.5z" /></Icon>
export const Rain = (p) => <Icon {...p}><path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 7a3.75 3.75 0 0 0 0 7.5z" /><path d="m8.5 17.5-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" /></Icon>
export const Storm = (p) => <Icon {...p}><path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 7a3.75 3.75 0 0 0 0 7.5z" /><path d="m12.5 13-2.5 4h3.5l-2 4" /></Icon>
export const Wind = (p) => <Icon {...p}><path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 14h15a2.5 2.5 0 1 1-2.5 2.5M3 11.5h7" /></Icon>
export const Fog = (p) => <Icon {...p}><path d="M4 8h16M3 12h14M6 16h15M4 20h12" /></Icon>
export const Close = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const Arrow = (p) => <Icon {...p}><path d="M7 17 17 7M9 7h8v8" /></Icon>
export const Check = (p) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
export const Compass = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Icon>
export const Gem = (p) => <Icon {...p}><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" /></Icon>
export const Github = (p) => <Icon {...p}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></Icon>
export const Mail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></Icon>
export const Linkedin = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7.5 10.5v6M7.5 7.5v.01M11.5 16.5v-6m0 2.5a2.5 2.5 0 0 1 5 0v3.5" /></Icon>

export const WEATHER_ICONS = { clear: Sun, cloudy: Cloud, windy: Wind, rain: Rain, storm: Storm, fog: Fog }
export const phaseIcon = (phase) => (phase === 'Night' ? Moon : phase === 'Dawn' || phase === 'Dusk' ? Sunset : Sun)
