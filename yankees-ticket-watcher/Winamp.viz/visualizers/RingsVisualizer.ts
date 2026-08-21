import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

interface Ring {
  age: number;
  hue: number;
  power: number;
}

export class RingsVisualizer extends CanvasVisualizer {
  readonly name = "Retro Rings";
  private rings: Ring[] = [];

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.fade(0.16, "2,0,8");
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (frame.beat || this.rings.length < 6) {
      this.rings.push({ age: 0, hue: 110 + frame.mid * 180 + Math.random() * 60, power: 0.45 + frame.beatIntensity });
    }
    this.rings = this.rings.filter((ring) => ring.age < 2.8);

    ctx.globalCompositeOperation = "lighter";
    for (const ring of this.rings) {
      ring.age += deltaTime * (0.72 + frame.bass * 0.5);
      const pct = ring.age / 2.8;
      const radius = pct * Math.max(this.width, this.height) * 0.72;
      const wobble = Math.sin(this.time * 4 + ring.age * 8) * frame.treble * 18;
      ctx.lineWidth = 2 + ring.power * 10 * (1 - pct);
      const color = hsl(ring.hue + this.time * 22, 100, 58, (1 - pct) * 0.82);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius + wobble, radius * (0.62 + frame.lowMid * 0.35) - wobble, this.time * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i += 1) {
      ctx.strokeStyle = hsl(210 + i * 35 + frame.treble * 80, 100, 56, 0.35);
      ctx.lineWidth = 1 + frame.spectrum[i * 12] * 9;
      ctx.beginPath();
      ctx.arc(cx, cy, 28 + i * 32 + frame.bass * 38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
