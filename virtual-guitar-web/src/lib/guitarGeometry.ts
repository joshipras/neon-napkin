import type { GuitarPlacement } from '../types/music'

export function createPrototypePlacement(): GuitarPlacement {
  return {
    body: {
      x: 0.54,
      y: 0.7,
      width: 0.34,
      height: 0.28,
      rotationDeg: -13,
    },
    neck: {
      x: 0.69,
      y: 0.5,
      width: 0.31,
      height: 0.06,
      rotationDeg: -36,
    },
    zones: [
      {
        id: 'neck-zone',
        label: 'Fret hand zone',
        x: 0.67,
        y: 0.36,
        width: 0.23,
        height: 0.21,
      },
      {
        id: 'strum-zone',
        label: 'Strum zone',
        x: 0.4,
        y: 0.57,
        width: 0.28,
        height: 0.21,
      },
    ],
  }
}
