import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

export class MountainsVisualizer extends CanvasVisualizer {
  readonly name = "Frequency Mountains";
  private offset = 0;

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.offset += deltaTime * (0.2 + frame.bass * 1.1);
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, "#010414");
    bg.addColorStop(0.46, "#160529");
    bg.addColorStop(1, "#000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = "lighter";
    const layers = 18;
    for (let l = layers - 1; l >= 0; l -= 1) {
      const p = l / layers;
      const yBase = this.height * (0.24 + p * 0.76);
      const scale = 1 - p * 0.72;
      const amp = this.height * (0.1 + frame.bass * 0.18) * scale;
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      for (let i = 0; i <= 96; i += 1) {
        const x = (i / 96) * this.width;
        const audio = frame.spectrum[(i * 2 + l * 5) % frame.spectrum.length];
        const ridge = Math.sin(i * 0.22 + this.offset * 5 + l) * 0.18;
        const y = yBase - (audio + ridge + this.beatPulse * 0.18) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      const hue = 185 + l * 7 + frame.treble * 80;
      ctx.fillStyle = hsl(hue, 100, 38 + p * 24, 0.12 + (1 - p) * 0.28);
      ctx.shadowColor = hsl(hue, 100, 55, 1);
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.strokeStyle = hsl(hue + 40, 100, 62, 0.38);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}
