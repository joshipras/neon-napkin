export type ChordName = 'G' | 'C' | 'D' | 'Em' | 'Am' | 'E'

export type InstrumentMode = 'acoustic' | 'electric'

export type StrumDirection = 'down' | 'up'

export type StrumIntensity = 'soft' | 'hard'

export type CameraStatus = 'idle' | 'requesting' | 'live' | 'error'

export interface DetectionZone {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface GuitarPlacement {
  body: {
    x: number
    y: number
    width: number
    height: number
    rotationDeg: number
  }
  neck: {
    x: number
    y: number
    width: number
    height: number
    rotationDeg: number
  }
  zones: DetectionZone[]
}

export interface ChordProfile {
  name: ChordName
  notes: string[]
  frequencies: number[]
  accent: string
  summary: string
}

export interface ChordRule {
  chord: ChordName
  neckLane: 'high' | 'mid-high' | 'mid' | 'mid-low' | 'low'
  fingerCount: string
  wristPitch: string
  palmShape: string
  summary: string
}

export interface CameraState {
  status: CameraStatus
  message: string
}
