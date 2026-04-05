import type { ChordProfile, ChordRule } from '../types/music'

export const CHORD_LIBRARY: Record<ChordProfile['name'], ChordProfile> = {
  G: {
    name: 'G',
    notes: ['G3', 'B3', 'D4', 'G4'],
    frequencies: [196.0, 246.94, 293.66, 392.0],
    accent: '#ffcf6e',
    summary: 'Big campfire opener with plenty of swagger.',
  },
  C: {
    name: 'C',
    notes: ['C3', 'E3', 'G3', 'C4'],
    frequencies: [130.81, 164.81, 196.0, 261.63],
    accent: '#ff9570',
    summary: 'Clean, familiar, and easy to sell visually.',
  },
  D: {
    name: 'D',
    notes: ['D3', 'A3', 'D4', 'F#4'],
    frequencies: [146.83, 220.0, 293.66, 369.99],
    accent: '#9deab0',
    summary: 'Bright and punchy for triumphant fake solos.',
  },
  Em: {
    name: 'Em',
    notes: ['E3', 'G3', 'B3', 'E4'],
    frequencies: [164.81, 196.0, 246.94, 329.63],
    accent: '#7ce2d6',
    summary: 'Instantly moody without asking for precision.',
  },
  Am: {
    name: 'Am',
    notes: ['A2', 'E3', 'A3', 'C4'],
    frequencies: [110.0, 164.81, 220.0, 261.63],
    accent: '#8cb2ff',
    summary: 'Good for melodrama and fake heartbreak.',
  },
  E: {
    name: 'E',
    notes: ['E3', 'G#3', 'B3', 'E4'],
    frequencies: [164.81, 207.65, 246.94, 329.63],
    accent: '#d9a2ff',
    summary: 'Simple power pose with a rock-friendly bite.',
  },
}

export const CHORD_RULES: ChordRule[] = [
  {
    chord: 'G',
    neckLane: 'low',
    fingerCount: '3 to 4 visible fingertips',
    wristPitch: 'neutral',
    palmShape: 'moderately open',
    summary: 'Default power stance near the lower neck.',
  },
  {
    chord: 'C',
    neckLane: 'mid-low',
    fingerCount: '2 to 3 visible fingertips',
    wristPitch: 'slightly forward',
    palmShape: 'compact pinch',
    summary: 'Tighter hand cluster a little above the G lane.',
  },
  {
    chord: 'D',
    neckLane: 'mid-high',
    fingerCount: '2 to 3 visible fingertips',
    wristPitch: 'slightly lifted',
    palmShape: 'small triangle cluster',
    summary: 'Higher on the neck with a visibly compact shape.',
  },
  {
    chord: 'Em',
    neckLane: 'mid',
    fingerCount: '1 to 2 visible fingertips',
    wristPitch: 'neutral',
    palmShape: 'loosest grip in the set',
    summary: 'The easiest moody hand pose to detect reliably.',
  },
  {
    chord: 'Am',
    neckLane: 'mid',
    fingerCount: '2 to 3 visible fingertips',
    wristPitch: 'slightly forward',
    palmShape: 'curled index-middle cluster',
    summary: 'A compact sad-boy shape in the same zone as Em.',
  },
  {
    chord: 'E',
    neckLane: 'high',
    fingerCount: '2 to 3 visible fingertips',
    wristPitch: 'slightly back',
    palmShape: 'wide knuckle spread',
    summary: 'Rock chord that sits closest to the headstock.',
  },
]

export const CHORD_SEQUENCE = Object.keys(CHORD_LIBRARY) as Array<
  keyof typeof CHORD_LIBRARY
>
