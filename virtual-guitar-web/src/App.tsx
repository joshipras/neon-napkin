import { useMemo, useState } from 'react'
import './App.css'
import { CameraStage } from './components/CameraStage'
import { ControlBar } from './components/ControlBar'
import { StatusPanel } from './components/StatusPanel'
import { CHORD_LIBRARY } from './data/chords'
import { useCameraFeed } from './hooks/useCameraFeed'
import { useStrumSynth } from './hooks/useStrumSynth'
import { createPrototypePlacement } from './lib/guitarGeometry'
import type {
  ChordName,
  InstrumentMode,
  StrumDirection,
  StrumIntensity,
} from './types/music'

function App() {
  const [mode, setMode] = useState<InstrumentMode>('acoustic')
  const [chord, setChord] = useState<ChordName>('G')
  const [lastDirection, setLastDirection] = useState<StrumDirection>('down')
  const [lastIntensity, setLastIntensity] = useState<StrumIntensity>('soft')
  const [lastPlayedAt, setLastPlayedAt] = useState<string>(
    'Waiting for the first dramatic strum',
  )

  const { cameraState, startCamera, videoRef } = useCameraFeed()
  const { audioReady, playStrum } = useStrumSynth()

  const activeChord = CHORD_LIBRARY[chord]
  const placement = useMemo(() => createPrototypePlacement(), [])

  const handleStrum = async (
    direction: StrumDirection,
    intensity: StrumIntensity,
  ) => {
    setLastDirection(direction)
    setLastIntensity(intensity)
    setLastPlayedAt(new Date().toLocaleTimeString([], { timeStyle: 'short' }))
    await playStrum({
      chord,
      direction,
      intensity,
      mode,
    })
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Virtual Guitar Prototype</p>
          <h1>Air guitar that actually shouts back.</h1>
          <p className="hero-text">
            This scaffold is tuned for a comedic, front-camera guitar toy on
            iPhone. The camera and synth are live now, while pose tracking is
            structured for the next implementation pass.
          </p>
        </div>

        <StatusPanel
          activeChord={activeChord}
          cameraState={cameraState}
          audioReady={audioReady}
          lastDirection={lastDirection}
          lastIntensity={lastIntensity}
          lastPlayedAt={lastPlayedAt}
        />
      </section>

      <CameraStage
        videoRef={videoRef}
        cameraState={cameraState}
        activeChord={activeChord}
        mode={mode}
        placement={placement}
      />

      <ControlBar
        cameraState={cameraState}
        chord={chord}
        mode={mode}
        onChordChange={setChord}
        onModeChange={setMode}
        onStart={startCamera}
        onStrum={handleStrum}
      />
    </main>
  )
}

export default App
