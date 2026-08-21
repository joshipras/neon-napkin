export interface BeatState {
  beat: boolean;
  strongBeat: boolean;
  beatIntensity: number;
}

export class BeatDetector {
  private readonly history: number[];
  private pointer = 0;
  private filled = 0;
  private lastBeat = -Infinity;
  private dynamicThreshold = 1.28;

  constructor(
    private readonly historySize = 48,
    private readonly cooldownMs = 235
  ) {
    this.history = new Array(historySize).fill(0);
  }

  reset() {
    this.pointer = 0;
    this.filled = 0;
    this.lastBeat = -Infinity;
    this.dynamicThreshold = 1.28;
    this.history.fill(0);
  }

  update(bassEnergy: number, lowMidEnergy: number, now: number): BeatState {
    const energy = bassEnergy * 0.78 + lowMidEnergy * 0.22;
    const average = this.average();
    const variance = this.variance(average);
    const adaptive = Math.max(0.08, average + Math.sqrt(variance) * 0.45);
    const ratio = average > 0.01 ? energy / Math.max(adaptive, 0.01) : 0;
    const elapsed = now - this.lastBeat;
    const intensity = Math.max(0, Math.min(1, (ratio - 1.02) / 0.92));

    this.dynamicThreshold += (1.18 + Math.min(0.38, variance * 3) - this.dynamicThreshold) * 0.025;

    const beat =
      this.filled > this.historySize * 0.45 &&
      elapsed > this.cooldownMs &&
      energy > 0.12 &&
      ratio > this.dynamicThreshold;

    const strongBeat = beat && (intensity > 0.58 || energy > 0.78);

    if (beat) {
      this.lastBeat = now;
      this.dynamicThreshold = Math.min(1.72, this.dynamicThreshold + 0.08);
    }

    this.history[this.pointer] = energy;
    this.pointer = (this.pointer + 1) % this.historySize;
    this.filled = Math.min(this.historySize, this.filled + 1);

    return {
      beat,
      strongBeat,
      beatIntensity: beat ? Math.max(0.18, intensity) : 0
    };
  }

  private average() {
    if (this.filled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.filled; i += 1) sum += this.history[i];
    return sum / this.filled;
  }

  private variance(average: number) {
    if (this.filled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.filled; i += 1) {
      const diff = this.history[i] - average;
      sum += diff * diff;
    }
    return sum / this.filled;
  }
}
