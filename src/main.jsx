import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { detectCapability } from './lib/device'
import { useGameStore } from './store/useGameStore'
import './index.css'

const { canRun3D, lowEnd } = detectCapability()
const hash = window.location.hash
const forceIsland = hash === '#island' && canRun3D
const classic = hash === '#classic' || (!forceIsland && (!canRun3D || lowEnd))
useGameStore.setState({
  mode: classic ? 'classic' : 'game',
  canRun3D,
  autoClassic: classic && hash !== '#classic',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
