import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class ChaosVisualizer extends CanvasVisualizer {
  readonly name = "Chaos Mode";
  private spin = 0;

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.spin += deltaTime * (0.3 + frame.bass * 2 + this.beatPulse * 3);
    this.fade(0.08, frame.strongBeat ? "30,0,25" : "0,0,0");
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.spin);
    ctx.scale(1 + frame.volume * 0.18 + this.beatPulse * 0.22, 1 + frame.volume * 0.18 + this.beatPulse * 0.22);
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < 76; i += 1) {
      const audio = frame.spectrum[(i * 7) % frame.spectrum.length];
      const angle = (i / 76) * Math.PI * 2 + this.time * (0.7 + frame.mid);
      const radius = Math.min(this.width, this.height) * (0.08 + audio * 0.58 + (i % 5) * 0.018);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle * (1 + frame.treble * 0.6)) * radius;
      const size = 8 + audio * 46 + this.beatPulse * 24;
      ctx.strokeStyle = hsl(i * 13 + this.time * 90 + frame.treble * 170, 100, 58, 0.72);
      ctx.fillStyle = hsl(i * 13 + 120 + this.time * 80, 100, 54, 0.28);
      ctx.shadowColor = ctx.strokeStyle.toString();
      ctx.shadowBlur = 24;
      ctx.lineWidth = 1.5 + audio * 8;
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size, size);
      ctx.stroke();
      ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < frame.waveform.length; i += 1) {
      const angle = (i / frame.waveform.length) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) * (0.22 + frame.waveform[i] * 0.16 + frame.bass * 0.16);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 36;
    ctx.lineWidth = 2 + frame.volume * 10;
    ctx.stroke();
    ctx.restore();

    if (frame.strongBeat) {
      ctx.fillStyle = `rgba(255,255,255,${0.18 + frame.beatIntensity * 0.18})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
