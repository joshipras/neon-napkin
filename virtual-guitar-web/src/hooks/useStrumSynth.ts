import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { CHORD_LIBRARY } from '../data/chords'
import type {
  ChordName,
  InstrumentMode,
  StrumDirection,
  StrumIntensity,
} from '../types/music'

interface PlayStrumOptions {
  chord: ChordName
  direction: StrumDirection
  intensity: StrumIntensity
  mode: InstrumentMode
}

interface LegacyWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

export function useStrumSynth() {
  const contextRef = useRef<AudioContext | null>(null)
  const [audioReady, setAudioReady] = useState(false)

  const ensureContext = useEffectEvent(async () => {
    const audioWindow = window as LegacyWindow
    const AudioContextCtor =
      window.AudioContext ?? audioWindow.webkitAudioContext

    if (!AudioContextCtor) {
      return null
    }

    if (!contextRef.current) {
      contextRef.current = new AudioContextCtor()
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume()
    }

    setAudioReady(true)
    return contextRef.current
  })

  const playStrum = useEffectEvent(async (options: PlayStrumOptions) => {
    const context = await ensureContext()

    if (!context) {
      return
    }

    const profile = CHORD_LIBRARY[options.chord]
    const notes =
      options.direction === 'down'
        ? profile.frequencies
        : [...profile.frequencies].reverse()

    const noteSpacing = options.intensity === 'hard' ? 0.026 : 0.042
    const gainScale = options.intensity === 'hard' ? 0.12 : 0.07
    const waveform = options.mode === 'electric' ? 'sawtooth' : 'triangle'
    const filter = context.createBiquadFilter()

    filter.type = options.mode === 'electric' ? 'lowpass' : 'highshelf'
    filter.frequency.value = options.mode === 'electric' ? 2100 : 1800
    filter.gain.value = options.mode === 'electric' ? 0 : 3.5
    filter.connect(context.destination)

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const startTime = context.currentTime + index * noteSpacing
      const duration = options.mode === 'electric' ? 0.55 : 0.9

      oscillator.type = waveform
      oscillator.frequency.setValueAtTime(frequency, startTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(50, frequency * 0.996),
        startTime + duration,
      )

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(
        gainScale / (index + 1),
        startTime + 0.02,
      )
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      oscillator.connect(gain)
      gain.connect(filter)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    })
  })

  useEffect(() => {
    return () => {
      void contextRef.current?.close()
    }
  }, [])

  return {
    audioReady,
    playStrum,
  }
}
