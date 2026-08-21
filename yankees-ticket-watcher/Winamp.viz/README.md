# Visualize.fm

Visualize.fm is a browser-based retro audio visualizer built for the specific feeling of a late-90s desktop music player blown up onto a TV. Open it, allow the microphone, play music in the room, and the screen turns into a dense Winamp-era spectrum analyzer with segmented green/yellow/orange bars, falling peak markers, metallic controls, tiny LED displays, and an unapologetically mechanical interface.

Live app: https://visualize-fm-winamp.vercel.app

Unofficial nostalgia project. Not affiliated with or endorsed by Winamp.

## Why It Exists

The goal is not a modern equalizer with a retro color palette. The goal is instant recognition: black analyzer field, bright LED bars, gray floating peaks, seven-segment timer, tiny `128 kbps` / `44 kHz` readouts, mono/stereo lamps, beveled silver transport buttons, and the kind of dense UI that made old media players feel like hardware.

It is meant for:

- karaoke nights
- house parties
- bars
- living rooms
- HDMI-connected TVs and projectors
- anyone who misses visualizers that felt a little excessive in the best way

## Screenshot

A screenshot can be added here once the deployed app is captured at desktop/TV aspect ratio:

```md
![Visualize.fm Winamp-style spectrum analyzer](docs/screenshot.png)
```

Until then, the generated Open Graph preview and live app show the intended black-background, segmented-spectrum, late-90s player aesthetic.

## Core Experience

1. Visit the site.
2. Click `START VISUALIZER`.
3. Allow microphone access.
4. Play music, sing, clap, or talk near the mic.
5. Go fullscreen for TV/projector use.

The app does not require an account, database, or paid service for the normal microphone visualizer.

## Audio Privacy

Microphone audio stays on the device. The local microphone flow connects:

```text
Microphone MediaStream -> high-pass filter -> AnalyserNode
```

The microphone signal is not connected to speakers, recorded, uploaded, or sent to analytics. The app reads numerical audio features from the Web Audio API so the canvas can draw reactive bars.

The current audio engine includes:

- disabled automatic gain control where supported
- echo cancellation and noise suppression requests where supported
- high-pass filtering to reduce HVAC/room rumble
- adaptive per-band noise-floor subtraction
- soft gating so quiet rooms settle near idle
- fast attack and musical decay for singing/music

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Microphone access works on `localhost`. Public deployments need HTTPS, which Vercel provides automatically.

## Production Checks

```bash
npm run lint
npm test
npm run build
```

Run the production server locally:

```bash
npm start
```

If port `3000` is busy:

```bash
PORT=3040 npm start
```

## Deployment

The project is deployed on Vercel:

```bash
npx --yes vercel@latest deploy --prod
```

Core microphone visualization requires no environment variables.

Optional:

```bash
NEXT_PUBLIC_SITE_URL=https://visualize-fm-winamp.vercel.app
NEXT_PUBLIC_ENABLE_ANALYTICS=0
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SITE_URL` is only needed when overriding the detected production URL or attaching a custom domain.

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
  WinampPlayer.tsx
  MainSpectrum.tsx
  MiniSpectrum.tsx
lib/
  roomCode.ts
  siteUrl.ts
  tvRealtime.ts
visualizers/
tests/
```

React manages route/session/UI state. Canvas drawing runs through `requestAnimationFrame` and refs so React is not re-rendering every audio frame.

## Useful URLs

- `/` - public landing screen
- `/visualizer` - microphone visualizer
- `/visualizer?audioTest=1` - simulated audio test mode
- `/visualizer?debug=1` - diagnostics overlay
- `/about` - privacy/project notes

## Browser Notes

Best supported:

1. Chrome desktop
2. Chrome Android
3. Safari iPhone/iPad
4. Safari desktop
5. Edge

iOS Safari may not support the same fullscreen API behavior as desktop browsers. The visualizer still fills the viewport.
