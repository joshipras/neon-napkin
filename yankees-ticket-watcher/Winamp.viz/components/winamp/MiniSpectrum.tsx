"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { AudioFrame } from "@/audio/types";

export interface MiniSpectrumHandle {
  resize(): void;
  render(frame: AudioFrame): void;
}

const MINI_BARS = 18;
const MINI_SEGMENTS = 10;

const MiniSpectrum = forwardRef<MiniSpectrumHandle>(function MiniSpectrum(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef(new Float32Array(MINI_BARS));
  const peaksRef = useRef(new Float32Array(MINI_BARS));

  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (frame: AudioFrame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width === 0 || canvas.height === 0) resize();

    ctx.fillStyle = "#020403";
    ctx.fillRect(0, 0, width, height);

    const pad = 4;
    const ledHeight = 5;
    const graphHeight = height - ledHeight - 7;
    const gap = Math.max(1, Math.floor(width / 110));
    const barWidth = Math.max(3, Math.floor((width - pad * 2 - gap * (MINI_BARS - 1)) / MINI_BARS));
    const segmentGap = 1;
    const segmentHeight = Math.max(2, Math.floor((graphHeight - segmentGap * (MINI_SEGMENTS - 1)) / MINI_SEGMENTS));

    for (let i = 0; i < MINI_BARS; i += 1) {
      const value = miniBand(frame, i);
      const bars = barsRef.current;
      const peaks = peaksRef.current;
      bars[i] += (value - bars[i]) * (value > bars[i] ? 0.55 : 0.16);
      peaks[i] = Math.max(bars[i], peaks[i] - 0.01);
      const lit = Math.round(bars[i] * MINI_SEGMENTS);
      const x = pad + i * (barWidth + gap);

      for (let s = 0; s < MINI_SEGMENTS; s += 1) {
        const y = graphHeight - (s + 1) * segmentHeight - s * segmentGap;
        ctx.fillStyle = s < lit ? miniColor(s) : "#020703";
        ctx.fillRect(x, y, barWidth, segmentHeight);
      }

      ctx.fillStyle = "#dadada";
      ctx.fillRect(x, Math.max(0, graphHeight - peaks[i] * graphHeight - 3), barWidth, 2);
    }

    for (let i = 0; i < 22; i += 1) {
      ctx.fillStyle = i / 22 < frame.volume ? "#1c8fea" : "#05264a";
      ctx.fillRect(pad + i * 7, height - ledHeight, 5, 4);
    }
  };

  useImperativeHandle(ref, () => ({ resize, render }));

  return <canvas ref={canvasRef} className="wa-mini-spectrum" aria-hidden />;
});

function miniBand(frame: AudioFrame, index: number) {
  const start = Math.floor(Math.pow(index / MINI_BARS, 1.65) * frame.spectrum.length);
  const end = Math.max(start + 1, Math.floor(Math.pow((index + 1) / MINI_BARS, 1.65) * frame.spectrum.length));
  let sum = 0;
  let max = 0;
  for (let i = start; i < Math.min(end, frame.spectrum.length); i += 1) {
    sum += frame.spectrum[i];
    max = Math.max(max, frame.spectrum[i]);
  }
  return Math.min(1, Math.pow(sum / (end - start) * 0.75 + max * 0.25, 0.82));
}

function miniColor(segment: number) {
  if (segment >= 8) return "#ff7600";
  if (segment >= 6) return "#ffe600";
  if (segment >= 4) return "#b8ff00";
  return "#28f20f";
}

export default MiniSpectrum;
