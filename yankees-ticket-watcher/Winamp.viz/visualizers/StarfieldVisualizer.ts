import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

interface Star {
  x: number;
  y: number;
  z: number;
  hue: number;
}

export class StarfieldVisualizer extends CanvasVisualizer {
  readonly name = "Starfield";
  private stars: Star[] = [];

  init(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    super.init(canvas, context);
    this.stars = new Array(720).fill(0).map(() => this.createStar(Math.random()));
  }

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.fade(0.26, "0,0,10");
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const speed = (0.18 + frame.volume * 1.35 + frame.bass * 1.9 + this.beatPulse * 2.2) * deltaTime;

    ctx.globalCompositeOperation = "lighter";
    for (const star of this.stars) {
      const lastZ = star.z;
      star.z -= speed;
      if (star.z <= 0.02) Object.assign(star, this.createStar(1));

      const scale = 1 / star.z;
      const lastScale = 1 / Math.max(0.03, lastZ);
      const x = cx + star.x * scale * cx;
      const y = cy + star.y * scale * cy;
      const lx = cx + star.x * lastScale * cx;
      const ly = cy + star.y * lastScale * cy;
      if (x < -80 || x > this.width + 80 || y < -80 || y > this.height + 80) {
        Object.assign(star, this.createStar(1));
        continue;
      }
      const size = Math.max(1, (1 - star.z) * 4 + frame.treble * 3);
      const color = hsl(star.hue + frame.mid * 100 + this.time * 20, 100, 62, 0.85);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + this.beatPulse * 28;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (frame.strongBeat) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(this.width, this.height) * (0.08 + frame.beatIntensity * 0.3), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 40;
      ctx.stroke();
    }
  }

  private createStar(z = Math.random() * 0.95 + 0.05): Star {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 1.5;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z,
      hue: Math.random() * 360
    };
  }
}
