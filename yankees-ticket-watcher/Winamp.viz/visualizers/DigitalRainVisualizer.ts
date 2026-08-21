import { CanvasVisualizer, hsl } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

interface Drop {
  x: number;
  y: number;
  speed: number;
  char: string;
}

const GLYPHS = "VISUALIZEFM0123456789#$%*+=<>[]{}";

export class DigitalRainVisualizer extends CanvasVisualizer {
  readonly name = "Matrix Audio";
  private drops: Drop[] = [];
  private glyphSize = 18;

  resize(width: number, height: number, dpr: number) {
    super.resize(width, height, dpr);
    this.glyphSize = Math.max(12, Math.min(22, Math.floor(width / 72)));
    const count = Math.ceil(width / this.glyphSize) * 2;
    this.drops = new Array(count).fill(0).map((_, index) => this.makeDrop(index));
  }

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);
    this.fade(0.15, "0,4,0");
    const ctx = this.ctx;
    ctx.font = `${this.glyphSize}px monospace`;
    ctx.textAlign = "center";
    ctx.globalCompositeOperation = "lighter";

    for (const drop of this.drops) {
      drop.y += drop.speed * deltaTime * (38 + frame.volume * 125 + frame.treble * 80);
      if (drop.y > this.height + 80 || Math.random() < 0.012 + frame.highMid * 0.02) {
        Object.assign(drop, this.makeDrop(Math.floor(drop.x / this.glyphSize)));
        drop.y = -Math.random() * this.height * 0.4;
      }
      if (Math.random() < 0.08 + frame.treble * 0.18) {
        drop.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      const energy = frame.spectrum[Math.floor((drop.x / this.width) * frame.spectrum.length)] || 0;
      const color = hsl(106 + energy * 80 + frame.bass * 40, 100, 42 + energy * 30, 0.42 + energy * 0.55);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + energy * 18 + this.beatPulse * 20;
      ctx.fillText(drop.char, drop.x, drop.y);
      ctx.fillStyle = `rgba(255,255,255,${0.18 + energy * 0.34})`;
      ctx.fillText(drop.char, drop.x, drop.y - this.glyphSize);
    }
  }

  private makeDrop(index: number): Drop {
    return {
      x: index * this.glyphSize + Math.random() * this.glyphSize,
      y: -Math.random() * Math.max(1, this.height),
      speed: 0.5 + Math.random() * 1.8,
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    };
  }
}
