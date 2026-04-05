# Virtual Guitar MVP Spec

## Goal

Ship a comedic, low-friction guitar toy that runs in mobile Safari first and can later graduate into a native iOS app if the interaction lands.

## Product Decisions

- Platform: web-first prototype
- Orientation: portrait only
- Camera: front camera only
- Handedness: right-handed only for V1
- Sound packs: acoustic and electric
- Chords: real chord names
- Recording: out of scope for V1

## Suggested Folder Structure

```text
virtual-guitar-web/
├── docs/
│   └── mvp-spec.md
├── public/
├── src/
│   ├── components/
│   │   ├── CameraStage.tsx
│   │   ├── ControlBar.tsx
│   │   └── StatusPanel.tsx
│   ├── data/
│   │   └── chords.ts
│   ├── hooks/
│   │   ├── useCameraFeed.ts
│   │   └── useStrumSynth.ts
│   ├── lib/
│   │   └── guitarGeometry.ts
│   ├── types/
│   │   └── music.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
└── package.json
```

## Screen Flow

1. User opens the page and taps `Start Camera`.
2. Front camera activates and the mirrored preview fills the stage.
3. Guitar overlay appears over the torso.
4. Fret hand enters the neck zone and selects a preset chord.
5. Strumming hand crosses the string zone and triggers an audio variation.
6. User swaps `Acoustic` / `Electric` any time.

## Landmark Math Approach

### 1. Torso-based guitar placement

Use pose landmarks from MediaPipe `PoseLandmarker`:

- `leftShoulder`
- `rightShoulder`
- `leftHip`
- `rightHip`

Derived values:

- `shoulderMid = average(leftShoulder, rightShoulder)`
- `hipMid = average(leftHip, rightHip)`
- `torsoCenter = lerp(shoulderMid, hipMid, 0.38)`
- `torsoWidth = distance(leftShoulder, rightShoulder)`
- `torsoTilt = atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x)`

Placement formulas:

- `guitarBodyWidth = torsoWidth * 1.42`
- `guitarBodyHeight = guitarBodyWidth * 0.82`
- `guitarBodyCenter = torsoCenter + { x: torsoWidth * 0.07, y: torsoWidth * 0.2 }`
- `guitarBodyRotation = torsoTilt - 12deg`
- `neckLength = torsoWidth * 1.2`
- `neckAngle = torsoTilt - 33deg`

Smoothing:

- exponential moving average with `alpha = 0.22` for center and rotation
- freeze updates for 120 ms if body confidence drops sharply to avoid wobble

### 2. Hand role assignment

Use `HandLandmarker` for up to two hands.

- Mirror the camera preview so the experience feels natural.
- Define a `neck zone` and `strum zone` from the live guitar placement.
- Any hand spending `> 60%` of the last 12 frames inside the neck zone becomes the fretting hand.
- The other visible hand becomes the strumming hand.
- If only one hand is visible, preserve its previous role for up to 500 ms before resetting.

### 3. Strum detection

The strum zone is a rotated rectangle aligned to the guitar body.

Per frame:

- project strumming hand wrist and index-knuckle points into guitar-local coordinates
- detect an entry event when the wrist crosses the zone boundary
- compute velocity from the last 3 frames

Trigger rules:

- minimum speed threshold: `0.08` normalized screen units per second
- cooldown: `120 ms`
- direction:
  - positive local `y` movement = downstroke
  - negative local `y` movement = upstroke
- intensity:
  - `soft` below the hard threshold
  - `hard` at or above `0.16`

### 4. Chord classification

Keep this forgiving. We are not building real fretboard fingering.

Features:

- fretting-hand vertical lane on the neck
- visible fingertip count
- average finger curl
- palm openness
- wrist pitch

Initial rule table:

| Chord | Neck lane | Finger count | Wrist | Shape cue |
| --- | --- | --- | --- | --- |
| G | low | 3-4 | neutral | open power stance |
| C | mid-low | 2-3 | slightly forward | compact pinch |
| D | mid-high | 2-3 | slightly lifted | triangle cluster |
| Em | mid | 1-2 | neutral | loose minimal grip |
| Am | mid | 2-3 | slightly forward | curled cluster |
| E | high | 2-3 | slightly back | wide knuckle spread |

Classifier behavior:

- choose the best matching preset only if confidence is at least `0.62`
- below that threshold, keep the previous chord for up to `350 ms`
- if confidence remains low, fall back to `G`

## Audio Plan

### Prototype

Use the current synth hook so interaction tuning can happen without an audio asset pipeline.

### Production V1

Replace synth playback with recorded chord samples:

```text
audio/
├── acoustic/
│   ├── G_down_soft.wav
│   ├── G_down_hard.wav
│   ├── G_up_soft.wav
│   └── G_up_hard.wav
└── electric/
    └── ...
```

Recommended first set:

- chords: `G`, `C`, `D`, `Em`, `Am`, `E`
- variants: `down_soft`, `down_hard`, `up_soft`, `up_hard`
- total files: `48`

## Build Order

1. Keep the existing scaffold and verify camera/audio behavior on iPhone.
2. Add MediaPipe pose landmarks and replace fixed placement.
3. Add two-hand tracking and role assignment.
4. Implement live strum detection with debug overlays.
5. Implement preset chord classification with confidence smoothing.
6. Replace synth with real audio samples.
7. Polish mobile Safari performance and onboarding copy.
