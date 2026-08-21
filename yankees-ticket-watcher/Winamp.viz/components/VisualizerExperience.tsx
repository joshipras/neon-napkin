"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import { DemoAudioSource } from "@/audio/DemoAudioSource";
import { SilentAudioSource } from "@/audio/SilentAudioSource";
import type { AudioFrame, AudioSource, AudioSourceDiagnostics, ExperienceMode } from "@/audio/types";
import ErrorState from "@/components/ErrorState";
import StatusOverlay from "@/components/StatusOverlay";
import VisualizerControls from "@/components/VisualizerControls";
import { track } from "@/lib/analytics";
import type { Visualizer } from "@/visualizers/Visualizer";
import { visualizerFactories, visualizerNames } from "@/visualizers";

type SourceMode = "mic" | "demo" | "test";

export default function VisualizerExperience({ source, initialDebug = false }: { source: SourceMode; initialDebug?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerRef = useRef<Visualizer | null>(null);
  const audioSourceRef = useRef<AudioSource | null>(null);
  const fallbackSourceRef = useRef<AudioSource | null>(null);
  const activeSourceRef = useRef<AudioSource | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const presetChangedAtRef = useRef(0);
  const sensitivityRef = useRef(1);
  const modeRef = useRef<ExperienceMode>("party");
  const autoCycleRef = useRef("off");
  const frameRef = useRef<AudioFrame | null>(null);
  const presetIndexRef = useRef(0);
  const eggBufferRef = useRef("");
  const konamiRef = useRef<string[]>([]);

  const [status, setStatus] = useState<"booting" | "ready" | "error">("booting");
  const [error, setError] = useState("");
  const [presetIndex, setPresetIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hideCursor, setHideCursor] = useState(false);
  const [sensitivity, setSensitivityState] = useState(1);
  const [mode, setModeState] = useState<ExperienceMode>("party");
  const [autoCycle, setAutoCycleState] = useState("off");
  const [overlay, setOverlay] = useState(true);
  const [crt, setCrt] = useState(true);
  const [curved, setCurved] = useState(false);
  const [stats, setStats] = useState({ fps: 0, elapsed: 0, frame: null as AudioFrame | null });
  const [diagnostics, setDiagnostics] = useState<AudioSourceDiagnostics | null>(null);
  const [debugVisible, setDebugVisible] = useState(initialDebug);
  const [maximumNostalgia, setMaximumNostalgia] = useState(false);

  const factories = useMemo(() => [visualizerFactories[0]], []);
  const names = useMemo(() => [visualizerNames[0]], []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const visualizer = visualizerRef.current;
    if (!canvas || !visualizer) return;
    const rawDpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxPixels = 2_000_000;
    const pixelCount = width * height * rawDpr * rawDpr;
    const dpr = pixelCount > maxPixels ? Math.max(0.75, rawDpr * Math.sqrt(maxPixels / pixelCount)) : rawDpr;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    visualizer.resize(width, height, dpr);
  }, []);

  const setPreset = useCallback(
    (next: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: false });
      if (!canvas || !ctx) return;
      visualizerRef.current?.destroy();
      const index = ((next % factories.length) + factories.length) % factories.length;
      const visualizer = factories[index]();
      visualizer.init(canvas, ctx);
      visualizerRef.current = visualizer;
      presetIndexRef.current = index;
      setPresetIndex(index);
      presetChangedAtRef.current = performance.now();
      resize();
      track("preset_changed", { preset: visualizer.name, index });
    },
    [factories, resize]
  );

  const randomPreset = useCallback(() => {
    if (factories.length <= 1) {
      setPreset(0);
      return;
    }
    let next = presetIndexRef.current;
    while (next === presetIndexRef.current) next = Math.floor(Math.random() * factories.length);
    setPreset(next);
  }, [factories.length, setPreset]);

  const setSensitivity = (value: number) => {
    sensitivityRef.current = value;
    setSensitivityState(value);
  };

  const setMode = (value: ExperienceMode) => {
    modeRef.current = value;
    setModeState(value);
    if (value === "chaos") setPreset(factories.length - 1);
  };

  const setAutoCycle = (value: string) => {
    autoCycleRef.current = value;
    setAutoCycleState(value);
  };

  const enterFullscreen = async () => {
    const element = document.documentElement as FullscreenElement;
    try {
      if (!document.fullscreenElement) {
        await (element.requestFullscreen?.() || element.webkitRequestFullscreen?.());
        track("fullscreen_started");
      }
    } catch {
      // Fullscreen can fail on iOS Safari without breaking the visualizer.
    }
  };

  const exitExperience = () => {
    audioSourceRef.current?.stop();
    window.location.href = "/";
  };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    setPreset(0);
    const fallbackSource =
      source === "mic"
        ? new SilentAudioSource()
        : new DemoAudioSource(() => sensitivityRef.current * 0.9, () => modeRef.current);
    fallbackSourceRef.current = fallbackSource;
    activeSourceRef.current = fallbackSource;

    void fallbackSource.start().then(() => {
      if (cancelled) return;
      if (source !== "mic") {
        setStatus("ready");
        track("demo_started");
      }
    });

    if (source === "mic") {
      const micSource = new AudioEngine(() => sensitivityRef.current, () => modeRef.current);
      audioSourceRef.current = micSource;
      void micSource
        .start()
        .then(() => {
          if (cancelled) {
            micSource.stop();
            return;
          }
          activeSourceRef.current = micSource;
          setStatus("ready");
          track("visualizer_started");
        })
        .catch((err: Error) => {
          if (cancelled) return;
          fallbackSource.stop();
          setError(err.message);
          setStatus("error");
        });
    } else {
      audioSourceRef.current = fallbackSource;
    }

    resize();
    lastTimeRef.current = performance.now();
    presetChangedAtRef.current = lastTimeRef.current;
    let frames = 0;
    let totalFrames = 0;
    let fpsTime = lastTimeRef.current;
    let fps = 0;
    const sessionStart = lastTimeRef.current;

    const render = (time: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (time - lastTimeRef.current) / 1000));
      lastTimeRef.current = time;
      const audioSource = activeSourceRef.current;
      if (!audioSource) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const frame = audioSource.getFrame(time);
      frameRef.current = frame;
      visualizerRef.current?.render(frame, dt);
      renderGlobalEffects(frame);
      maybeAutoCycle(frame, time);

      frames += 1;
      totalFrames += 1;
      if (time - fpsTime > 500) {
        fps = frames / ((time - fpsTime) / 1000);
        frames = 0;
        fpsTime = time;
        const nextDiagnostics = audioSource.getDiagnostics?.() ?? null;
        const elapsed = (time - sessionStart) / 1000;
        window.__VISUALIZE_DIAGNOSTICS__ = {
          fps,
          elapsed,
          renderFrames: totalFrames,
          volume: frame.volume,
          bass: frame.bass,
          mid: frame.mid,
          treble: frame.treble,
          audio: nextDiagnostics
        };
        setStats({ fps, elapsed, frame });
        setDiagnostics(nextDiagnostics);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      audioSourceRef.current?.stop();
      fallbackSourceRef.current?.stop();
      activeSourceRef.current = null;
      visualizerRef.current?.destroy();
      window.removeEventListener("resize", resize);
    };
  // The animation loop intentionally reads live refs. Including loop helpers here
  // would restart microphone capture when UI-only state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resize, setPreset, source]);

  const maybeAutoCycle = useCallback(
    (frame: AudioFrame, time: number) => {
      const modeValue = autoCycleRef.current;
      if (modeValue === "off") return;
      const elapsed = time - presetChangedAtRef.current;
      if (modeValue === "smart") {
        if (elapsed > 12000 && (frame.strongBeat || (elapsed > 26000 && frame.beat))) randomPreset();
        return;
      }
      const seconds = Number(modeValue);
      if (seconds > 0 && elapsed > seconds * 1000) randomPreset();
    },
    [randomPreset]
  );

  const renderGlobalEffects = (frame: AudioFrame) => {
    if (!maximumNostalgia) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(57,255,20,${0.04 + frame.beatIntensity * 0.18})`;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(performance.now() / 900);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3 + frame.volume * 8;
    ctx.strokeRect(-width * 0.32, -height * 0.32, width * 0.64, height * 0.64);
    ctx.restore();
  };

  useEffect(() => {
    let hideTimer = 0;
    const reveal = () => {
      setControlsVisible(true);
      setHideCursor(false);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        setControlsVisible(false);
        setHideCursor(true);
      }, 3600);
    };
    const onKey = (event: KeyboardEvent) => {
      reveal();
      const key = event.key.toLowerCase();
      if (key === "arrowleft") setPreset(presetIndex - 1);
      if (key === "arrowright") setPreset(presetIndex + 1);
      if (key === " ") {
        event.preventDefault();
        randomPreset();
      }
      if (key === "f") void enterFullscreen();
      if (key === "a") setAutoCycle(autoCycleRef.current === "off" ? "smart" : "off");
      if (key === "h") setControlsVisible((value) => !value);
      if (key === "d") setDebugVisible((value) => !value);

      eggBufferRef.current = (eggBufferRef.current + key).slice(-12);
      if (eggBufferRef.current.includes("1999")) {
        setMaximumNostalgia(true);
        setMode("chaos");
      }
      if (eggBufferRef.current.includes("winamp")) {
        setPreset(0);
        setMaximumNostalgia(true);
      }

      const codeKey = key === "arrowup" ? "up" : key === "arrowdown" ? "down" : key === "arrowleft" ? "left" : key === "arrowright" ? "right" : key;
      konamiRef.current = [...konamiRef.current, codeKey].slice(-10);
      if (konamiRef.current.join(",") === "up,up,down,down,left,right,left,right,b,a") {
        setMaximumNostalgia(true);
        setMode("chaos");
        setAutoCycle("smart");
      }
    };

    reveal();
    window.addEventListener("mousemove", reveal);
    window.addEventListener("pointerdown", reveal);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("pointerdown", reveal);
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIndex, randomPreset, setPreset]);

  if (status === "error") return <ErrorState code={error} />;

  return (
    <main
      className={`visualizer-stage ${hideCursor ? "hide-cursor" : ""}`}
      aria-label="Visualize.fm music visualizer"
    >
      <canvas ref={canvasRef} />
      {status === "booting" && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-30 w-[min(92vw,34rem)] -translate-x-1/2 border border-[#39ff14]/40 bg-black/70 px-4 py-3 text-center shadow-glow backdrop-blur-md">
          <div>
            <p className="text-xs uppercase text-cyan-200">{source === "mic" ? "Waiting for microphone" : "Starting test signal"}</p>
            <h1 className="pixel-title mt-1 text-3xl font-black text-[#39ff14]">VISUALIZE.FM</h1>
            <p className="mt-2 text-xs leading-5 text-white/70">
              {source !== "mic"
                ? "Generating synthetic bass, beats, waveform, and spectrum."
                : "Warm-up visuals are running. Allow mic access when the browser asks."}
            </p>
          </div>
        </div>
      )}
      {overlay && (
        <StatusOverlay
          debug={debugVisible}
          diagnostics={diagnostics}
          elapsed={stats.elapsed}
          fps={stats.fps}
          frame={stats.frame}
          mode={mode}
          presetCount={factories.length}
          presetIndex={presetIndex}
          presetName={names[presetIndex]}
          source={source}
        />
      )}
      <VisualizerControls
        autoCycle={autoCycle}
        crt={crt}
        curved={curved}
        mode={mode}
        onAutoCycle={setAutoCycle}
        onCrt={() => setCrt((value) => !value)}
        onCurved={() => setCurved((value) => !value)}
        onExit={exitExperience}
        onFullscreen={() => void enterFullscreen()}
        onMode={setMode}
        onNext={() => setPreset(presetIndex + 1)}
        onOverlay={() => setOverlay((value) => !value)}
        onPrev={() => setPreset(presetIndex - 1)}
        onRandom={randomPreset}
        onSensitivity={setSensitivity}
        overlay={overlay}
        presetName={names[presetIndex]}
        sensitivity={sensitivity}
        visible={controlsVisible}
      />
      {crt && <div className="pointer-events-none fixed inset-0 z-20 bg-[linear-gradient(rgba(255,255,255,0.045)_50%,rgba(0,0,0,0.16)_50%)] bg-[length:100%_4px] mix-blend-screen" />}
      {curved && <div className="pointer-events-none fixed inset-0 z-20 rounded-[8vw] shadow-[inset_0_0_90px_rgba(0,0,0,0.92)]" />}
      {maximumNostalgia && (
        <div className="panel-text pointer-events-none fixed right-4 top-4 z-30 border border-fuchsia-400/60 bg-black/60 px-3 py-2 text-xs font-black uppercase text-fuchsia-200">
          MAXIMUM NOSTALGIA
        </div>
      )}
    </main>
  );
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

declare global {
  interface Window {
    __VISUALIZE_DIAGNOSTICS__?: {
      fps: number;
      elapsed: number;
      renderFrames: number;
      volume: number;
      bass: number;
      mid: number;
      treble: number;
      audio: AudioSourceDiagnostics | null;
    };
  }
}
