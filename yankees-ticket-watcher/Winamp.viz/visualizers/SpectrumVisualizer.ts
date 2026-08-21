import { CanvasVisualizer } from "./Visualizer";
import type { AudioFrame } from "@/audio/types";

const MAX_BARS = 72;
const PEAK_HOLD_SECONDS = 0.22;
const BAND_GAMMA = 1.58;

export class SpectrumVisualizer extends CanvasVisualizer {
  readonly name = "Spectrum Classic";
  private readonly bars = new Float32Array(MAX_BARS);
  private readonly peaks = new Float32Array(MAX_BARS);
  private readonly peakHold = new Float32Array(MAX_BARS);
  private activeBars = 56;
  private activeSegments = 28;
  private background: HTMLCanvasElement | null = null;

  resize(width: number, height: number, dpr: number) {
    super.resize(width, height, dpr);
    this.activeBars = Math.max(45, Math.min(70, Math.round(width / 29)));
    this.activeSegments = Math.max(22, Math.min(34, Math.round(height / 14)));
    this.background = this.createBackground(width, height);
  }

  render(frame: AudioFrame, deltaTime: number) {
    this.tick(frame, deltaTime);

    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const floor = height - Math.max(18, height * 0.045);
    const top = Math.max(10, height * 0.035);
    const spectrumHeight = floor - top;
    const sidePad = Math.max(16, width * 0.025);
    const usable = width - sidePad * 2;
    const gap = Math.max(3, Math.min(6, Math.floor((usable / this.activeBars) * 0.18)));
    const barWidth = Math.max(8, Math.floor((usable - gap * (this.activeBars - 1)) / this.activeBars));
    const segmentGap = Math.max(1, Math.min(3, Math.floor(spectrumHeight / 170)));
    const segmentHeight = Math.max(3, Math.floor((spectrumHeight - segmentGap * (this.activeSegments - 1)) / this.activeSegments));

    if (this.background) ctx.drawImage(this.background, 0, 0, width, height);
    else this.clear("#020304");
    this.updateBars(frame, deltaTime);

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    for (let i = 0; i < this.activeBars; i += 1) {
      const x = Math.round(sidePad + i * (barWidth + gap));
      const litSegments = Math.round(this.bars[i] * this.activeSegments);

      for (let s = 0; s < this.activeSegments; s += 1) {
        const y = Math.round(floor - (s + 1) * segmentHeight - s * segmentGap);
        ctx.fillStyle = s < litSegments ? this.segmentColor(s) : "rgba(1, 6, 3, 0.72)";
        ctx.fillRect(x, y, barWidth, segmentHeight);
        if (s < litSegments) {
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(x, y, barWidth, 1);
        }
      }

      const peakY = Math.round(floor - this.peaks[i] * spectrumHeight - segmentHeight * 0.9);
      ctx.fillStyle = "rgba(224, 224, 224, 0.92)";
      ctx.fillRect(x, Math.max(top - 12, peakY), barWidth, Math.max(5, Math.floor(segmentHeight * 0.52)));
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fillRect(x, Math.max(top - 12, peakY), barWidth, 1);
    }

    this.drawBottomLeds(ctx, sidePad, usable, floor, frame.volume);
  }

  private updateBars(frame: AudioFrame, deltaTime: number) {
    for (let i = 0; i < this.activeBars; i += 1) {
      const target = this.bandValue(frame, i);
      const rise = 1 - Math.pow(0.0008, deltaTime);
      const fall = 1 - Math.pow(0.045, deltaTime);
      const amount = target > this.bars[i] ? rise : fall;
      this.bars[i] += (target - this.bars[i]) * amount;

      if (this.bars[i] >= this.peaks[i]) {
        this.peaks[i] = this.bars[i];
        this.peakHold[i] = PEAK_HOLD_SECONDS;
      } else if (this.peakHold[i] > 0) {
        this.peakHold[i] = Math.max(0, this.peakHold[i] - deltaTime);
      } else {
        this.peaks[i] = Math.max(0, this.peaks[i] - deltaTime * (0.13 + (i / this.activeBars) * 0.035));
      }
    }
  }

  private bandValue(frame: AudioFrame, barIndex: number) {
    const startNorm = Math.pow(barIndex / this.activeBars, BAND_GAMMA);
    const endNorm = Math.pow((barIndex + 1) / this.activeBars, BAND_GAMMA);
    const start = Math.max(0, Math.floor(startNorm * frame.spectrum.length));
    const end = Math.min(frame.spectrum.length, Math.max(start + 1, Math.ceil(endNorm * frame.spectrum.length)));
    let sum = 0;
    let max = 0;

    for (let i = start; i < end; i += 1) {
      const value = frame.spectrum[i];
      sum += value;
      if (value > max) max = value;
    }

    const average = sum / (end - start);
    const bandEnergy = average * 0.72 + max * 0.28;
    const lowBoost = barIndex < this.activeBars * 0.2 ? frame.bass * 0.12 : 0;
    const vocalBoost = barIndex >= this.activeBars * 0.28 && barIndex <= this.activeBars * 0.66 ? frame.mid * 0.08 : 0;
    const highSnap = barIndex > this.activeBars * 0.68 ? frame.treble * 0.055 : 0;
    return Math.max(0, Math.min(1, Math.pow(bandEnergy + lowBoost + vocalBoost + highSnap, 0.82)));
  }

  private segmentColor(segment: number) {
    const pct = segment / Math.max(1, this.activeSegments - 1);
    if (pct >= 0.92) return "#ff3d00";
    if (pct >= 0.8) return "#ff7a00";
    if (pct >= 0.66) return "#ffe600";
    if (pct >= 0.46) return "#b8ff00";
    return "#26ef12";
  }

  private createBackground(width: number, height: number) {
    const background = document.createElement("canvas");
    background.width = Math.max(1, Math.floor(width));
    background.height = Math.max(1, Math.floor(height));
    const ctx = background.getContext("2d");
    if (!ctx) return null;

    const floor = height - Math.max(18, height * 0.045);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.009)";
    for (let y = 2; y < floor; y += 6) ctx.fillRect(0, y, width, 1);
    return background;
  }

  private drawBottomLeds(ctx: CanvasRenderingContext2D, sidePad: number, usable: number, floor: number, volume: number) {
    const ledCount = 40;
    const ledGap = 5;
    const ledWidth = Math.max(8, Math.floor((usable - ledGap * (ledCount - 1)) / ledCount));
    const y = Math.min(this.height - 22, floor + 28);

    for (let i = 0; i < ledCount; i += 1) {
      const x = Math.round(sidePad + i * (ledWidth + ledGap));
      const active = i / ledCount < 0.2 + volume * 0.8;
      ctx.fillStyle = active ? "#0b82db" : "rgba(6, 28, 52, 0.9)";
      ctx.fillRect(x, y, ledWidth, 10);
      ctx.fillStyle = active ? "rgba(86,185,255,0.42)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(x, y, ledWidth, 2);
    }
  }
}
