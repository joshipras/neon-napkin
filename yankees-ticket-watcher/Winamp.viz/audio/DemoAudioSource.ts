import type { AudioFrame, AudioSource, AudioSourceDiagnostics, ExperienceMode } from "./types";

export class DemoAudioSource implements AudioSource {
  private readonly spectrum = new Float32Array(128);
  private readonly waveform = new Float32Array(256);
  private frame: AudioFrame = {
    volume: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    spectrum: this.spectrum,
    waveform: this.waveform,
    beat: false,
    strongBeat: false,
    beatIntensity: 0,
    timestamp: 0
  };
  private startTime = 0;
  private lastBeat = 0;
  private framesRead = 0;

  constructor(
    private readonly sensitivityRef: () => number,
    private readonly modeRef: () => ExperienceMode
  ) {}

  async start() {
    this.startTime = performance.now();
    this.lastBeat = this.startTime;
  }

  getFrame(time = performance.now()) {
    this.framesRead += 1;
    const t = (time - this.startTime) / 1000;
    const bpm = this.modeRef() === "chill" ? 96 : this.modeRef() === "karaoke" ? 82 : 126;
    const beatInterval = 60 / bpm;
    const phase = (t % beatInterval) / beatInterval;
    const kick = Math.exp(-phase * 12);
    const snare = Math.exp(-Math.abs(phase - 0.5) * 18) * 0.55;
    const phrase = 0.55 + 0.45 * Math.sin(t * 0.31) * Math.sin(t * 0.19 + 2);
    const gain = this.sensitivityRef() * (this.modeRef() === "chaos" ? 1.35 : 1);
    const beat = time - this.lastBeat > beatInterval * 1000 * 0.85 && phase < 0.08;

    if (beat) this.lastBeat = time;

    const bass = Math.min(1, (kick * 0.95 + phrase * 0.2) * gain);
    const lowMid = Math.min(1, (snare * 0.55 + 0.28 + Math.sin(t * 2.7) * 0.16) * gain);
    const mid = Math.min(1, (0.36 + Math.sin(t * 1.55 + 1.4) * 0.22 + snare * 0.24) * gain);
    const highMid = Math.min(1, (0.26 + Math.sin(t * 5.1) * 0.18 + snare * 0.33) * gain);
    const treble = Math.min(1, (0.2 + Math.max(0, Math.sin(t * 9.5)) * 0.28 + snare * 0.42) * gain);
    const volume = Math.min(1, (bass * 0.42 + lowMid * 0.18 + mid * 0.2 + treble * 0.2) * 1.15);

    for (let i = 0; i < this.spectrum.length; i += 1) {
      const x = i / this.spectrum.length;
      const harmonic =
        Math.sin(t * (2.2 + x * 13) + i * 0.14) * 0.08 +
        Math.sin(t * (0.9 + x * 3) + i * 0.05) * 0.1;
      const slope = Math.pow(1 - x, 1.4) * bass + Math.exp(-Math.abs(x - 0.25) * 8) * mid;
      const fizz = Math.exp(-Math.abs(x - 0.72) * 7) * treble;
      this.spectrum[i] = Math.max(0, Math.min(1, slope * 0.58 + fizz * 0.44 + harmonic + kick * Math.pow(1 - x, 2)));
    }

    for (let i = 0; i < this.waveform.length; i += 1) {
      const x = i / this.waveform.length;
      this.waveform[i] =
        Math.sin((x * 2 + t * 0.8) * Math.PI * 3) * bass * 0.45 +
        Math.sin((x * 2 + t * 1.4) * Math.PI * 9) * mid * 0.22 +
        Math.sin((x * 2 - t * 2.6) * Math.PI * 19) * treble * 0.08;
    }

    this.frame = {
      volume,
      bass,
      lowMid,
      mid,
      highMid,
      treble,
      spectrum: this.spectrum,
      waveform: this.waveform,
      beat,
      strongBeat: beat && kick > 0.76,
      beatIntensity: beat ? Math.min(1, 0.35 + kick) : 0,
      timestamp: time
    };

    return this.frame;
  }

  stop() {
    this.spectrum.fill(0);
    this.waveform.fill(0);
  }

  getDiagnostics(): AudioSourceDiagnostics {
    let maxFftBin = 0;
    for (let i = 0; i < this.spectrum.length; i += 1) {
      if (this.spectrum[i] > maxFftBin) maxFftBin = this.spectrum[i];
    }
    return {
      audioState: "simulated",
      framesRead: this.framesRead,
      maxFftBin,
      dataChanged: true,
      rms: this.frame.volume
    };
  }
}
