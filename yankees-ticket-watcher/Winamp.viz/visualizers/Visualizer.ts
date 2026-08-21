import type { AudioFrame } from "@/audio/types";

export interface Visualizer {
  readonly name: string;
  init(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void;
  resize(width: number, height: number, dpr: number): void;
  render(frame: AudioFrame, deltaTime: number): void;
  destroy(): void;
}

export type VisualizerFactory = () => Visualizer;

export abstract class CanvasVisualizer implements Visualizer {
  abstract readonly name: string;
  protected canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  protected width = 1;
  protected height = 1;
  protected dpr = 1;
  protected time = 0;
  protected beatPulse = 0;

  init(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = context;
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
  }

  abstract render(frame: AudioFrame, deltaTime: number): void;

  destroy() {}

  protected tick(frame: AudioFrame, deltaTime: number) {
    this.time += deltaTime;
    if (frame.beat) this.beatPulse = Math.max(this.beatPulse, 0.45 + frame.beatIntensity * 0.9);
    this.beatPulse *= Math.pow(0.0002, deltaTime);
  }

  protected fade(alpha: number, color = "0,0,0") {
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = `rgba(${color},${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  protected clear(color = "#000") {
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

export function neon(ctx: CanvasRenderingContext2D, color: string, blur = 18) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
}

export function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function hsl(h: number, s = 100, l = 55, a = 1) {
  return `hsla(${Math.round(h)},${s}%,${l}%,${a})`;
}
