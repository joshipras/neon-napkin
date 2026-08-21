import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  size: number;
}

export class ParticleVisualizer extends CanvasVisualizer {
  readonly name = "Particle Explosion";
  private particles: Particle[] = [];

  init(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    super.init(canvas, context);
    this.particles = new Array(560).fill(0).map(() => this.makeParticle());
  }

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.fade(0.11, "0,0,5");
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    if (frame.beat) {
      for (const p of this.particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = (0.8 + frame.beatIntensity * 2.6) / dist;
        p.vx += dx * force;
        p.vy += dy * force;
      }
    }

    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const pull = 0.18 * deltaTime;
      p.vx += (cx - p.x) * pull * 0.12;
      p.vy += (cy - p.y) * pull * 0.12;
      p.vx += Math.sin(this.time * 2 + p.y * 0.01) * frame.treble * deltaTime * 24;
      p.vy += Math.cos(this.time * 2 + p.x * 0.01) * frame.mid * deltaTime * 20;
      p.x += p.vx * deltaTime * (14 + frame.volume * 40);
      p.y += p.vy * deltaTime * (14 + frame.volume * 40);
      p.vx *= Math.pow(0.18, deltaTime);
      p.vy *= Math.pow(0.18, deltaTime);

      if (p.x < -50 || p.x > this.width + 50 || p.y < -50 || p.y > this.height + 50) {
        Object.assign(p, this.makeParticle());
      }

      const color = hsl(p.hue + this.time * 38 + frame.bass * 80, 100, 58, 0.55 + frame.volume * 0.35);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + frame.treble * 1.8 + this.beatPulse), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private makeParticle(): Particle {
    return {
      x: Math.random() * Math.max(1, this.width),
      y: Math.random() * Math.max(1, this.height),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      hue: Math.random() * 360,
      size: 1 + Math.random() * 3
    };
  }
}
