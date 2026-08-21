import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class LaserGridVisualizer extends CanvasVisualizer {
  readonly name = "Laser Grid";
  private offset = 0;

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.offset += deltaTime * (0.35 + frame.bass * 1.4);
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#05000d");
    sky.addColorStop(0.48, "#140026");
    sky.addColorStop(1, "#000");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    const horizon = this.height * (0.48 + Math.sin(this.time * 0.9) * frame.mid * 0.06 + this.beatPulse * 0.03);
    ctx.globalCompositeOperation = "lighter";
    const sunRadius = this.height * (0.12 + frame.volume * 0.05);
    const sun = ctx.createRadialGradient(this.width * 0.5, horizon - sunRadius * 0.6, 0, this.width * 0.5, horizon - sunRadius * 0.6, sunRadius);
    sun.addColorStop(0, "rgba(255,176,0,0.8)");
    sun.addColorStop(0.6, "rgba(255,48,194,0.35)");
    sun.addColorStop(1, "rgba(255,48,194,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, this.width, horizon);

    ctx.lineWidth = 2;
    ctx.shadowBlur = 24;
    for (let i = -18; i <= 18; i += 1) {
      const x = this.width / 2 + i * this.width * 0.045;
      const color = hsl(175 + frame.treble * 80, 100, 58, 0.6);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, horizon);
      ctx.lineTo(x + i * this.width * (0.012 + frame.bass * 0.004), this.height);
      ctx.stroke();
    }

    for (let i = 0; i < 34; i += 1) {
      const p = ((i / 34 + this.offset * 0.16) % 1) || 1;
      const y = horizon + Math.pow(p, 2.2) * (this.height - horizon);
      const alpha = Math.min(1, p * 1.3);
      ctx.strokeStyle = `rgba(255,48,194,${alpha})`;
      ctx.shadowColor = "#ff30c2";
      ctx.lineWidth = 1 + p * 4 + this.beatPulse * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }
}
