"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import type { AudioFrame, AudioSource } from "@/audio/types";
import ErrorState from "@/components/ErrorState";
import { getTvRealtimeAdapter } from "@/lib/tvRealtime";

function meter(value: number) {
  const count = Math.round(value * 16);
  return `${"█".repeat(count)}${"░".repeat(16 - count)}`;
}

export default function PhoneMicJoin({ roomCode }: { roomCode: string }) {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<AudioFrame | null>(null);
  const sourceRef = useRef<AudioSource | null>(null);
  const timerRef = useRef(0);
  const adapter = getTvRealtimeAdapter();

  const start = async () => {
    const source = new AudioEngine(() => 1.15, () => "party");
    sourceRef.current = source;
    try {
      await source.start();
      setStarted(true);
      timerRef.current = window.setInterval(() => {
        const next = source.getFrame(performance.now());
        setFrame(next);
        if (adapter.enabled) void adapter.publish(roomCode, next);
      }, 42);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      sourceRef.current?.stop();
    };
  }, []);

  if (error) return <ErrorState code={error} />;

  return (
    <main className="crt-shell flex min-h-svh items-center justify-center px-5 py-8 text-center">
      <section className="max-w-xl">
        <p className="text-xs uppercase text-cyan-200">ROOM {roomCode}</p>
        <h1 className="pixel-title mt-4 text-5xl font-black text-[#39ff14]">USE THIS PHONE AS MICROPHONE</h1>
        <p className="mt-5 text-sm leading-6 text-white/70">
          Your phone analyzes audio locally. It sends volume, bass, mids, treble, beats, and compressed spectrum numbers only.
          It does not send raw microphone audio.
        </p>
        {!started ? (
          <button className="bevel mt-8 w-full px-6 py-5 text-lg font-black uppercase text-[#39ff14]" onClick={() => void start()}>
            START PHONE MIC
          </button>
        ) : (
          <div className="panel-text mt-8 border border-[#39ff14]/40 bg-black/50 p-4 text-left text-xs uppercase leading-6 text-[#39ff14]">
            <div>{adapter.enabled ? "TRANSMITTING FEATURES" : "LOCAL ANALYSIS ACTIVE"}</div>
            <div>VOL {meter(frame?.volume ?? 0)}</div>
            <div>BASS {meter(frame?.bass ?? 0)}</div>
            <div>MID {meter(frame?.mid ?? 0)}</div>
            <div>HIGH {meter(frame?.treble ?? 0)}</div>
            {!adapter.enabled && <div className="mt-2 text-amber-100">Realtime adapter not configured</div>}
          </div>
        )}
        <Link className="mt-8 inline-flex text-xs uppercase text-white/50" href="/">
          Exit
        </Link>
      </section>
    </main>
  );
}
