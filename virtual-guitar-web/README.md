# Virtual Guitar Web

Browser-first prototype for a comedic front-camera guitar app.

## Product Shape

- Portrait-only, right-handed, selfie-camera experience
- Auto-placed guitar overlay on the torso
- Preset chord detection with real chord names
- Acoustic and electric sound modes
- Live-only fun, no recording flow in V1

The current scaffold already includes:

- iPhone-friendly camera startup using `getUserMedia`
- A synth-backed strum engine for fast iteration before real samples land
- Typed chord metadata and classifier placeholders
- A documented plan for MediaPipe integration and landmark math

## Run It

```bash
npm install
npm run dev:host
```

Open the dev server URL on your phone if you want to test camera behavior on-device.

## Files That Matter

- `src/App.tsx`: top-level orchestration and state
- `src/components/CameraStage.tsx`: camera preview and guitar overlay shell
- `src/components/ControlBar.tsx`: mode, chord, and manual strum controls
- `src/hooks/useCameraFeed.ts`: front-camera lifecycle
- `src/hooks/useStrumSynth.ts`: temporary Web Audio strum engine
- `src/data/chords.ts`: preset chord metadata and heuristic rules
- `docs/mvp-spec.md`: implementation plan for tracking, placement, and audio samples

## Next Build Step

Replace the prototype placement with MediaPipe pose + hand landmarks, then swap the synth with recorded chord samples.
