# Visualize.fm

Visualize.fm is a fullscreen retro music visualizer for parties, karaoke, bars, living rooms, TVs, and projectors. The core V1 is intentionally simple:

1. Visit the site.
2. Click `START VISUALIZER`.
3. Allow microphone access.
4. Go fullscreen.
5. Enjoy reactive 1999-style visual chaos.

The app does not require an account.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Microphone access works on `localhost`. In production it requires HTTPS.

## Production Checks

```bash
npm lint
npm test
npm run build
```

## Deployment

This project is ready for Vercel:

```bash
npm install
npm run build
npx vercel --prod
```

Set `NEXT_PUBLIC_SITE_URL` to the production origin, for example `https://your-domain.com`.

## Environment Variables

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_ANALYTICS=0

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_ENABLE_ANALYTICS=1` enables optional anonymous product events through `window.va` when Vercel Analytics is present. It never sends microphone-derived audio features.

## Audio Privacy

Local microphone mode uses `navigator.mediaDevices.getUserMedia({ audio: true })`, connects the microphone stream to a Web Audio `AnalyserNode`, and never connects that stream to speakers. No raw microphone audio is recorded, uploaded, stored, or sent to analytics.

TV Mode is designed so the phone performs audio analysis locally and transmits only lightweight numbers:

- volume
- bass
- lowMid
- mid
- highMid
- treble
- beat
- strongBeat
- beatIntensity
- compressed spectrum bins

The phone does not transmit raw audio or waveform samples.

## TV Mode Setup

The app ships with a Supabase Realtime Broadcast adapter. Local mic and demo mode work without Supabase.

To enable phone-as-microphone TV Mode:

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. Add these variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Redeploy.
5. Open `/tv` on the TV or laptop.
6. Scan the QR code from the phone.
7. Tap `START PHONE MIC`.

The implementation uses Supabase Realtime Broadcast channels named by room code. Room codes are generated client-side and are meant for short-lived sessions. For a higher-security production pairing flow, add a tiny server route that signs room tokens and rejects expired codes before subscribing.

## Visualizers

- Spectrum Classic
- Neon Oscilloscope
- Starfield
- Plasma
- Infinite Tunnel
- Retro Rings
- Laser Grid
- Particle Explosion
- Kaleidoscope
- Frequency Mountains
- Matrix Audio
- Chaos Mode

## Architecture

```text
app/
  page.tsx
  visualizer/
  tv/
  join/[roomCode]/
audio/
  AudioEngine.ts
  AudioFeatureExtractor.ts
  BeatDetector.ts
  DemoAudioSource.ts
components/
  VisualizerExperience.tsx
  VisualizerControls.tsx
  StatusOverlay.tsx
lib/
  tvRealtime.ts
  roomCode.ts
visualizers/
  Visualizer.ts
  SpectrumVisualizer.ts
  ...
tests/
```

React controls session state, route state, and UI. Canvas animation runs through `requestAnimationFrame` and refs so React is not re-rendering every frame.

## Keyboard Controls

- `LEFT`: previous visualization
- `RIGHT`: next visualization
- `SPACE`: random visualization
- `F`: fullscreen
- `A`: toggle Smart Shuffle
- `H`: hide controls
- `ESC`: browser fullscreen exit

Easter eggs:

- Type `1999`
- Type `winamp`
- Konami code: `UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A`

## Browser Notes

Prioritized browsers:

1. Chrome desktop
2. Chrome Android
3. Safari iPhone/iPad
4. Safari desktop
5. Edge

iOS Safari may not support the same fullscreen behavior as desktop browsers. The visualizer still fills the viewport.
