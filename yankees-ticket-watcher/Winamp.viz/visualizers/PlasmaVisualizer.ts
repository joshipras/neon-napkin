import { CanvasVisualizer } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class PlasmaVisualizer extends CanvasVisualizer {
  readonly name = "Plasma";

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    const ctx = this.ctx;
    const cell = Math.max(8, Math.floor(Math.min(this.width, this.height) / 90));
    const distortion = 7 + frame.bass * 18 + this.beatPulse * 22;
    ctx.globalCompositeOperation = "source-over";

    for (let y = 0; y < this.height; y += cell) {
      for (let x = 0; x < this.width; x += cell) {
        const nx = x / this.width - 0.5;
        const ny = y / this.height - 0.5;
        const v =
          Math.sin((nx * distortion + this.time * 1.3) * 3.2) +
          Math.sin((ny * distortion - this.time * 1.8) * 2.8) +
          Math.sin((Math.hypot(nx, ny) * distortion * 3 - this.time * (3 + frame.treble * 4))) +
          Math.sin((nx + ny) * distortion + frame.mid * 5);
        const hue = (v * 54 + this.time * 55 + frame.treble * 160 + this.beatPulse * 120) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, ${42 + v * 8 + frame.volume * 16}%)`;
        ctx.fillRect(x, y, cell + 1, cell + 1);
      }
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,255,255,${this.beatPulse * 0.12})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
