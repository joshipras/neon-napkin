"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioFrame } from "@/audio/types";
import StatusOverlay from "@/components/StatusOverlay";
import { track } from "@/lib/analytics";
import { createRoomCode, type RoomInfo } from "@/lib/roomCode";
import { getTvRealtimeAdapter } from "@/lib/tvRealtime";
import type { Visualizer } from "@/visualizers/Visualizer";
import { visualizerFactories, visualizerNames } from "@/visualizers";

export default function TVMode() {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [qr, setQr] = useState("");
  const [paired, setPaired] = useState(false);
  const [lost, setLost] = useState(false);
  const [presetIndex, setPresetIndex] = useState(0);
  const [stats, setStats] = useState({ fps: 0, elapsed: 0, frame: null as AudioFrame | null });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<AudioFrame | null>(null);
  const visualizerRef = useRef<Visualizer | null>(null);
  const rafRef = useRef(0);
  const adapter = useMemo(() => getTvRealtimeAdapter(), []);
  const joinUrl = room && typeof window !== "undefined" ? `${window.location.origin}/join/${room.code}` : "";

  useEffect(() => {
    setRoom(createRoomCode());
    track("tv_mode_started");
  }, []);

  useEffect(() => {
    if (!joinUrl) return;
    void QRCode.toDataURL(joinUrl, {
      margin: 1,
      color: {
        dark: "#030406",
        light: "#39ff14"
      },
      width: 320
    }).then(setQr);
  }, [joinUrl]);

  useEffect(() => {
    if (!adapter.enabled || !room) return;
    let cleanup = () => {};
    void adapter.subscribe(
      room.code,
      (frame) => {
        frameRef.current = frame;
        setPaired(true);
        track("phone_paired");
      },
      () => setLost(true)
    ).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup();
  }, [adapter, room]);

  useEffect(() => {
    if (!paired) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const createVisualizer = (index: number) => {
      visualizerRef.current?.destroy();
      const visualizer = visualizerFactories[index]();
      visualizer.init(canvas, ctx);
      visualizerRef.current = visualizer;
      setPresetIndex(index);
      resize();
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth > 2200 ? 1.5 : 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      visualizerRef.current?.resize(window.innerWidth, window.innerHeight, dpr);
    };

    let last = performance.now();
    let switchedAt = last;
    let frames = 0;
    let fpsTime = last;
    const start = last;
    createVisualizer(0);

    const render = (time: number) => {
      const frame = frameRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (time - last) / 1000));
      last = time;
      if (frame) {
        visualizerRef.current?.render(frame, dt);
        if (frame.strongBeat && time - switchedAt > 18000) {
          const next = Math.floor(Math.random() * visualizerFactories.length);
          createVisualizer(next);
          switchedAt = time;
        }
      }
      frames += 1;
      if (time - fpsTime > 300) {
        const fps = frames / ((time - fpsTime) / 1000);
        frames = 0;
        fpsTime = time;
        setStats({ fps, elapsed: (time - start) / 1000, frame });
      }
      rafRef.current = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      visualizerRef.current?.destroy();
    };
  }, [paired]);

  if (paired) {
    return (
      <main className="visualizer-stage">
        <canvas ref={canvasRef} />
        <StatusOverlay
          elapsed={stats.elapsed}
          fps={stats.fps}
          frame={stats.frame}
          mode="party"
          presetCount={visualizerFactories.length}
          presetIndex={presetIndex}
          presetName={visualizerNames[presetIndex]}
          source="tv"
        />
        {lost && (
          <div className="fixed bottom-5 left-5 z-30 border border-red-400/70 bg-black/70 px-4 py-3 text-sm uppercase text-red-100">
            Realtime TV connection lost
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="crt-shell flex min-h-svh items-center justify-center px-5 py-8 text-center">
      <section className="relative z-10 max-w-3xl">
        <p className="text-xs uppercase text-cyan-200">TV MODE</p>
        <h1 className="pixel-title mt-4 text-6xl font-black text-[#39ff14]">SCAN WITH YOUR PHONE</h1>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <div className="bevel bg-[#39ff14] p-3">{qr ? <img alt={`Join room ${room?.code ?? ""}`} className="h-64 w-64" src={qr} /> : null}</div>
          <div className="text-left">
            <div className="text-xs uppercase text-white/50">Room Code</div>
            <div className="font-mono text-7xl font-black text-white">{room?.code ?? "----"}</div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Phone audio is analyzed locally. Only numerical visualization data is transmitted, not raw audio.
            </p>
            {!adapter.enabled && (
              <p className="mt-4 border border-amber-300/40 bg-black/45 p-3 text-xs uppercase leading-5 text-amber-100">
                Supabase Realtime is not configured yet. Local microphone and demo mode are production-ready; TV pairing activates after env vars are set.
              </p>
            )}
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="bevel px-5 py-3 text-sm font-black uppercase text-[#39ff14]" href="/visualizer?source=mic">
            Use This Screen Mic
          </Link>
          <Link className="bevel px-5 py-3 text-sm font-black uppercase text-white" href="/">
            Exit
          </Link>
        </div>
      </section>
    </main>
  );
}
