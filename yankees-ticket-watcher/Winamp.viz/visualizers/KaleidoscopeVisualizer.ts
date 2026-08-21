import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class KaleidoscopeVisualizer extends CanvasVisualizer {
  readonly name = "Kaleidoscope";
  private rotation = 0;
  private invert = false;

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    if (frame.strongBeat) this.invert = !this.invert;
    this.rotation += deltaTime * (0.16 + frame.mid * 1.5 + this.beatPulse);
    this.fade(this.invert ? 0.2 : 0.14, this.invert ? "8,0,12" : "0,2,8");
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const slices = 10 + Math.floor(frame.treble * 10);
    const radius = Math.max(this.width, this.height) * 0.58;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = "lighter";
    for (let s = 0; s < slices; s += 1) {
      ctx.save();
      ctx.rotate(this.rotation + (s / slices) * Math.PI * 2);
      if (s % 2) ctx.scale(1, -1);
      for (let i = 0; i < 42; i += 1) {
        const audio = frame.spectrum[(i * 3 + s * 5) % frame.spectrum.length];
        const r = (i / 42) * radius * (0.36 + audio);
        const angle = i * 0.17 + this.time * (0.4 + frame.bass);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle * 1.7) * r * 0.34;
        ctx.fillStyle = hsl(80 + s * 28 + i * 8 + frame.highMid * 120, 100, this.invert ? 68 : 54, 0.42 + audio * 0.38);
        ctx.shadowColor = ctx.fillStyle.toString();
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.lineTo(x * 0.74 + audio * 40, y + 18 + audio * 60);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
