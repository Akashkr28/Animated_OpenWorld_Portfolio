import { Component, lazy, Suspense, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useGameStore } from './store/useGameStore'
import LoadingScreen from './ui/LoadingScreen'

const GameCanvas = lazy(() => import('./game/GameCanvas'))
const ClassicView = lazy(() => import('./classic/ClassicView'))

// Any crash in the 3D layer drops the visitor onto the classic page.
class GameBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) {
    console.error(error)
    useGameStore.setState({ mode: 'classic', autoClassic: true })
  }
  render() { return this.state.failed ? null : this.props.children }
}

export default function App() {
  const mode = useGameStore((s) => s.mode)

  useEffect(() => {
    document.body.classList.toggle('game-mode', mode === 'game')
    window.scrollTo(0, 0)
  }, [mode])

  return (
    <MotionConfig reducedMotion="user">
      {mode === 'game' ? (
        <>
          <GameBoundary>
            <Suspense fallback={null}>
              <GameCanvas />
            </Suspense>
          </GameBoundary>
          <LoadingScreen />
        </>
      ) : (
        <Suspense fallback={<div className="min-h-full bg-night" />}>
          <ClassicView />
        </Suspense>
      )}
    </MotionConfig>
  )
}
