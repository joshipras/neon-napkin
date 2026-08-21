import { CanvasVisualizer } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class SpectrumVisualizer extends CanvasVisualizer {
  readonly name = "Spectrum Classic";
  private peaks = new Float32Array(96);

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.clear("#020304");

    const ctx = this.ctx;
    const bars = this.peaks.length;
    const gap = Math.max(2, this.width / 360);
    const barWidth = this.width / bars - gap;
    const base = this.height - Math.max(42, this.height * 0.06);
    const maxHeight = this.height * 0.72;

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(22,80,70,0.42)";
    for (let x = 0; x < this.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 12 + frame.treble * 18 + this.beatPulse * 18;
    for (let i = 0; i < bars; i += 1) {
      const source = frame.spectrum[Math.floor((i / bars) * frame.spectrum.length)] ?? 0;
      const value = Math.min(1, source * 1.12 + frame.volume * 0.12);
      this.peaks[i] = Math.max(value, this.peaks[i] - deltaTime * (0.22 + i / bars * 0.3));
      const x = i * (barWidth + gap) + gap * 0.5;
      const h = Math.max(4, value * maxHeight);
      const blocks = Math.max(2, Math.floor(h / 16));

      for (let b = 0; b < blocks; b += 1) {
        const y = base - b * 16;
        const pct = b / Math.max(1, blocks - 1);
        ctx.fillStyle = pct > 0.82 ? "#ffffff" : pct > 0.62 ? "#ffb000" : pct > 0.35 ? "#fff000" : "#39ff14";
        ctx.shadowColor = ctx.fillStyle.toString();
        ctx.fillRect(x, y - 12, barWidth, 11);
      }

      const peakY = base - this.peaks[i] * maxHeight - 24;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.shadowColor = "#ffffff";
      ctx.fillRect(x, peakY, barWidth, 7);
    }

    const meterWidth = this.width * 0.42;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#0078ff";
    for (let i = 0; i < 32; i += 1) {
      const x = this.width * 0.5 - meterWidth * 0.5 + i * (meterWidth / 32);
      ctx.globalAlpha = i / 32 < frame.volume ? 1 : 0.18;
      ctx.fillRect(x, this.height - 24, meterWidth / 42, 10);
    }
    ctx.globalAlpha = 1;
  }
}
