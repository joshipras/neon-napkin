import { CHORD_SEQUENCE } from '../data/chords'
import type {
  CameraState,
  ChordName,
  InstrumentMode,
  StrumDirection,
  StrumIntensity,
} from '../types/music'

interface ControlBarProps {
  cameraState: CameraState
  chord: ChordName
  mode: InstrumentMode
  onChordChange: (chord: ChordName) => void
  onModeChange: (mode: InstrumentMode) => void
  onStart: () => Promise<void>
  onStrum: (direction: StrumDirection, intensity: StrumIntensity) => Promise<void>
}

export function ControlBar({
  cameraState,
  chord,
  mode,
  onChordChange,
  onModeChange,
  onStart,
  onStrum,
}: ControlBarProps) {
  return (
    <section className="control-panel">
      <div className="control-group">
        <button className="primary-button" onClick={() => void onStart()}>
          {cameraState.status === 'live' ? 'Restart Camera' : 'Start Camera'}
        </button>
        <p className="control-help">{cameraState.message}</p>
      </div>

      <div className="control-group">
        <label className="control-label" htmlFor="chord-select">
          Chord
        </label>
        <select
          id="chord-select"
          value={chord}
          onChange={(event) => onChordChange(event.target.value as ChordName)}
        >
          {CHORD_SEQUENCE.map((chordOption) => (
            <option key={chordOption} value={chordOption}>
              {chordOption}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <span className="control-label">Sound Pack</span>
        <div className="segmented">
          <button
            className={mode === 'acoustic' ? 'segment active' : 'segment'}
            onClick={() => onModeChange('acoustic')}
          >
            Acoustic
          </button>
          <button
            className={mode === 'electric' ? 'segment active' : 'segment'}
            onClick={() => onModeChange('electric')}
          >
            Electric
          </button>
        </div>
      </div>

      <div className="control-group strum-buttons">
        <button
          className="strum-button"
          onClick={() => void onStrum('down', 'soft')}
        >
          Down Soft
        </button>
        <button
          className="strum-button"
          onClick={() => void onStrum('down', 'hard')}
        >
          Down Hard
        </button>
        <button
          className="strum-button"
          onClick={() => void onStrum('up', 'soft')}
        >
          Up Soft
        </button>
        <button
          className="strum-button"
          onClick={() => void onStrum('up', 'hard')}
        >
          Up Hard
        </button>
      </div>
    </section>
  )
}
