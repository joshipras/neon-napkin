import { CHORD_RULES } from '../data/chords'
import type {
  CameraState,
  ChordProfile,
  StrumDirection,
  StrumIntensity,
} from '../types/music'

interface StatusPanelProps {
  activeChord: ChordProfile
  cameraState: CameraState
  audioReady: boolean
  lastDirection: StrumDirection
  lastIntensity: StrumIntensity
  lastPlayedAt: string
}

export function StatusPanel({
  activeChord,
  cameraState,
  audioReady,
  lastDirection,
  lastIntensity,
  lastPlayedAt,
}: StatusPanelProps) {
  const activeRule = CHORD_RULES.find((rule) => rule.chord === activeChord.name)

  return (
    <aside className="status-card">
      <div className="status-topline">
        <span className="mini-label">Current chord</span>
        <strong style={{ color: activeChord.accent }}>{activeChord.name}</strong>
      </div>

      <p className="status-summary">{activeChord.summary}</p>

      <dl className="status-grid">
        <div>
          <dt>Camera</dt>
          <dd>{cameraState.status}</dd>
        </div>
        <div>
          <dt>Audio</dt>
          <dd>{audioReady ? 'armed' : 'locked'}</dd>
        </div>
        <div>
          <dt>Last strum</dt>
          <dd>
            {lastDirection} / {lastIntensity}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{lastPlayedAt}</dd>
        </div>
      </dl>

      {activeRule ? (
        <div className="rule-card">
          <h2>Preset detection rule</h2>
          <p>{activeRule.summary}</p>
          <ul>
            <li>Neck lane: {activeRule.neckLane}</li>
            <li>Finger count: {activeRule.fingerCount}</li>
            <li>Wrist pitch: {activeRule.wristPitch}</li>
            <li>Palm shape: {activeRule.palmShape}</li>
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
