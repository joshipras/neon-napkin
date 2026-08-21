import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class TunnelVisualizer extends CanvasVisualizer {
  readonly name = "Infinite Tunnel";
  private depth = 0;

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.depth += deltaTime * (0.6 + frame.bass * 3 + this.beatPulse * 2);
    this.fade(0.18);
    const ctx = this.ctx;
    const cx = this.width * (0.5 + Math.sin(this.time * 0.7) * frame.mid * 0.08);
    const cy = this.height * (0.5 + Math.cos(this.time * 0.6) * frame.treble * 0.08);
    const rings = 26;
    const sides = 6 + Math.floor(frame.highMid * 6);

    ctx.globalCompositeOperation = "lighter";
    for (let r = rings; r >= 1; r -= 1) {
      const z = ((r / rings + this.depth * 0.18) % 1) || 1;
      const radius = (1 / z) * Math.min(this.width, this.height) * 0.08;
      const rotation = this.time * (0.25 + frame.mid) + r * 0.2;
      const alpha = Math.max(0, 1 - z) * 0.65;
      ctx.beginPath();
      for (let i = 0; i <= sides; i += 1) {
        const angle = rotation + (i / sides) * Math.PI * 2;
        const pulse = 1 + Math.sin(i * 1.7 + this.time * 5) * frame.treble * 0.16 + this.beatPulse * 0.14;
        const x = cx + Math.cos(angle) * radius * pulse;
        const y = cy + Math.sin(angle) * radius * pulse;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const color = hsl(190 + r * 9 + this.depth * 80 + frame.bass * 90, 100, 56, alpha);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 1 + (1 - z) * 5;
      ctx.stroke();
    }
  }
}
