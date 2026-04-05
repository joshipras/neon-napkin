import type { RefObject } from 'react'
import type {
  CameraState,
  ChordProfile,
  GuitarPlacement,
  InstrumentMode,
} from '../types/music'

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraState: CameraState
  activeChord: ChordProfile
  mode: InstrumentMode
  placement: GuitarPlacement
}

export function CameraStage({
  videoRef,
  cameraState,
  activeChord,
  mode,
  placement,
}: CameraStageProps) {
  return (
    <section className="camera-panel">
      <div className="camera-stage">
        <video
          ref={videoRef}
          className="camera-feed"
          autoPlay
          muted
          playsInline
        />

        <div className="camera-fallback">
          <p>Selfie camera preview appears here after start.</p>
        </div>

        <div className="camera-overlay">
          {placement.zones.map((zone) => (
            <div
              key={zone.id}
              className={`detection-zone ${zone.id}`}
              style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.width * 100}%`,
                height: `${zone.height * 100}%`,
              }}
            >
              <span>{zone.label}</span>
            </div>
          ))}

          <div
            className="guitar-neck"
            style={{
              left: `${placement.neck.x * 100}%`,
              top: `${placement.neck.y * 100}%`,
              width: `${placement.neck.width * 100}%`,
              height: `${placement.neck.height * 100}%`,
              transform: `translate(-50%, -50%) rotate(${placement.neck.rotationDeg}deg)`,
            }}
          >
            <div className="guitar-frets" />
          </div>

          <div
            className="guitar-body"
            style={{
              left: `${placement.body.x * 100}%`,
              top: `${placement.body.y * 100}%`,
              width: `${placement.body.width * 100}%`,
              height: `${placement.body.height * 100}%`,
              transform: `translate(-50%, -50%) rotate(${placement.body.rotationDeg}deg)`,
            }}
          >
            <div className="sound-hole" />
            <div className="pickups" />
          </div>

          <div className="overlay-badges">
            <span className="badge accent">{activeChord.name}</span>
            <span className="badge">{mode}</span>
            <span className={`badge ${cameraState.status}`}>
              {cameraState.status}
            </span>
          </div>
        </div>
      </div>

      <p className="stage-caption">
        Current scaffold uses fixed overlay geometry. The next pass will replace
        this with torso and hand landmarks so the guitar truly sticks to the
        body and reacts to motion.
      </p>
    </section>
  )
}
