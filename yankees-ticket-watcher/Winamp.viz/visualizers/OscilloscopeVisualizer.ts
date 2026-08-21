import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class OscilloscopeVisualizer extends CanvasVisualizer {
  readonly name = "Neon Oscilloscope";
  private traces: number[][] = [];

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.fade(0.12 - Math.min(0.06, frame.volume * 0.04));
    const ctx = this.ctx;
    const centerY = this.height * 0.5;
    const amplitude = this.height * (0.16 + frame.volume * 0.22 + this.beatPulse * 0.08);

    const points: number[] = [];
    for (let i = 0; i < frame.waveform.length; i += 1) {
      const x = (i / (frame.waveform.length - 1)) * this.width;
      const bend = Math.sin(i * 0.055 + this.time * 1.4) * frame.mid * 0.34;
      points.push(centerY + (frame.waveform[i] + bend) * amplitude);
      if (i === 0) ctx.moveTo(x, points[i]);
    }
    this.traces.unshift(points);
    if (this.traces.length > 9) this.traces.pop();

    ctx.globalCompositeOperation = "lighter";
    for (let t = this.traces.length - 1; t >= 0; t -= 1) {
      const trace = this.traces[t];
      const alpha = 1 - t / this.traces.length;
      ctx.beginPath();
      for (let i = 0; i < trace.length; i += 1) {
        const drift = (t * 14 + Math.sin(this.time + i * 0.02) * t * 1.5) * (1 + frame.bass);
        const x = (i / (trace.length - 1)) * this.width;
        const y = trace[i] + (t - 3) * 18 + Math.sin(i * 0.03 + this.time * 2) * t * frame.treble * 3;
        if (i === 0) ctx.moveTo(x, y - drift * 0.08);
        else ctx.lineTo(x, y - drift * 0.08);
      }
      ctx.lineWidth = 1.5 + alpha * 5 + this.beatPulse * 5;
      ctx.shadowBlur = 18 + alpha * 24;
      const color = hsl(170 + t * 22 + frame.treble * 90 + this.time * 24, 100, 56, 0.25 + alpha * 0.72);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(255,48,194,${0.08 + this.beatPulse * 0.16})`;
    ctx.fillRect(0, centerY - 1, this.width, 2);
  }
}
