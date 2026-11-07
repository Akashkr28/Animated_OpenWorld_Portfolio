import { Suspense, useEffect, useRef, useState } from 'react'
import { advance, Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Player from './player/Player'
import FollowCamera from './player/FollowCamera'
import Terrain from './world/Terrain'
import Water from './world/Water'
import Sky from './world/Sky'
import Lighting from './world/Lighting'
import Arrival, { arrival, endArrival, prepareArrival } from './Arrival'
import Grass from './world/Grass'
import Scatter from './world/Scatter'
import SkyLife from './world/SkyLife'
import River from './world/River'
import Weather from './world/Weather'
import Guestbook from './zones/Guestbook'
import VisitorBots from './zones/VisitorBots'
import { env, setWeather, skipToTime } from './world/environment'
import Landmarks from './zones/Landmarks'
import SpawnPlaza from './zones/SpawnPlaza'
import AboutHouse from './zones/AboutHouse'
import ProjectsGallery from './zones/ProjectsGallery'
import JourneyPath from './zones/JourneyPath'
import ContactTower from './zones/ContactTower'
import Systems from './Systems'
import Hud from '../ui/Hud'
import { camera as cameraRig, player } from './player/playerState'
import { input } from './player/input'
import { isTouchDevice } from '../lib/device'
import { useGameStore } from '../store/useGameStore'

const FONT_WAIT_MS = 2500
await Promise.race([
  Promise.all([
    document.fonts.load('700 64px "Bricolage Grotesque Variable"'),
    document.fonts.load('500 32px "Figtree Variable"'),
  ]),
  new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
])

useGameStore.setState({ loadProgress: 45 })

if (import.meta.env.DEV) window.__island = { player, cameraRig, input, store: useGameStore, advance, env, setWeather, skipToTime, arrival }

// Waits for real rendered frames so the loading screen lifts onto a finished scene.
function ReadySignal() {
  const frames = useRef(0)
  useFrame((state) => {
    if (import.meta.env.DEV) window.__island.three = state
    if (++frames.current === 3) useGameStore.getState().setReady()
  })
  return null
}

function LoadProgress() {
  const { progress } = useProgress()
  useEffect(() => {
    useGameStore.setState({ loadProgress: 45 + progress * 0.45 })
  }, [progress])
  return null
}

export default function GameCanvas() {
  const quality = useGameStore((s) => s.quality)
  const [touch] = useState(isTouchDevice)
  const [dpr, setDpr] = useState(touch ? 1.25 : 1.5)
  const high = quality === 'high' && !touch

  useEffect(() => {
    prepareArrival()
    return endArrival
  }, [])

  return (
    <>
    <div className="fixed inset-0 touch-none" aria-hidden="true">
      <Canvas
        flat
        shadows={high ? 'percentage' : false}
        dpr={dpr}
        camera={{ fov: 52, near: 0.1, far: 3200, position: [0, 8, 30] }}
        gl={{ antialias: !touch, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => {
            useGameStore.setState({ mode: 'classic', autoClassic: true })
          })
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(0.8, d - 0.25))}
          onFallback={() => useGameStore.getState().setQuality('low')}
        />
        <LoadProgress />
        <Suspense fallback={null}>
          <Physics timeStep="vary" gravity={[0, -20, 0]}>
            <Lighting shadows={high} />
            <Sky />
            <Water detail={!touch} />
            <River />
            <Terrain textureSize={touch ? 1024 : 2048} />
            <Scatter dense={!touch} />
            <Grass dense={high} />
            <SkyLife />
            <Weather detail={!touch} />
            <Landmarks />
            <SpawnPlaza />
            <Guestbook />
            <VisitorBots />
            <AboutHouse />
            <ProjectsGallery />
            <JourneyPath />
            <ContactTower />
            <Arrival />
            <Player />
            <FollowCamera />
            <Systems />
          </Physics>
          <ReadySignal />
        </Suspense>
      </Canvas>
    </div>
    <Hud touch={touch} />
    </>
  )
}
