import { BeatDetector } from "./BeatDetector";
import type { AudioFrame, ExperienceMode, SerializedAudioFrame } from "./types";

const BAND_RANGES = {
  bass: [20, 160],
  lowMid: [160, 500],
  mid: [500, 2200],
  highMid: [2200, 6200],
  treble: [6200, 16000]
} as const;

const MODE_GAIN: Record<ExperienceMode, number> = {
  chill: 0.86,
  party: 1.14,
  karaoke: 1.28,
  chaos: 1.45
};

export function clamp01(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function smoothValue(previous: number, next: number, attack = 0.38, release = 0.11) {
  const amount = next > previous ? attack : release;
  return previous + (next - previous) * amount;
}

export function rmsFromTimeDomain(timeData: Uint8Array) {
  if (!timeData.length) return 0;
  let sum = 0;
  for (let i = 0; i < timeData.length; i += 1) {
    const centered = (timeData[i] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / timeData.length);
}

export function bandEnergy(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number
) {
  if (!frequencyData.length) return 0;
  const nyquist = sampleRate / 2;
  const binHz = nyquist / frequencyData.length;
  const start = Math.max(0, Math.floor(minHz / binHz));
  const end = Math.min(frequencyData.length - 1, Math.ceil(maxHz / binHz));
  let sum = 0;
  let weight = 0;

  for (let i = start; i <= end; i += 1) {
    const hz = (i / Math.max(1, frequencyData.length - 1)) * nyquist;
    const loudnessTilt = 1 + Math.log2(Math.max(32, hz) / 32) * 0.055;
    sum += (frequencyData[i] / 255) * loudnessTilt;
    weight += loudnessTilt;
  }

  const normalized = weight > 0 ? sum / weight : 0;
  const fftBoost = Math.min(1.12, 2048 / fftSize + 0.12);
  return clamp01(Math.pow(normalized * fftBoost, 0.74));
}

export class AudioFeatureExtractor {
  private readonly beatDetector = new BeatDetector();
  private readonly spectrum: Float32Array;
  private readonly waveform: Float32Array;
  private frame: AudioFrame;

  constructor(
    private readonly sampleRate: number,
    private readonly fftSize: number,
    private readonly spectrumBins = 128,
    private readonly waveformBins = 256
  ) {
    this.spectrum = new Float32Array(spectrumBins);
    this.waveform = new Float32Array(waveformBins);
    this.frame = this.createEmptyFrame();
  }

  reset() {
    this.beatDetector.reset();
    this.spectrum.fill(0);
    this.waveform.fill(0);
    this.frame = this.createEmptyFrame();
  }

  extract(
    frequencyData: Uint8Array,
    timeData: Uint8Array,
    timestamp: number,
    sensitivity = 1,
    mode: ExperienceMode = "party"
  ): AudioFrame {
    const gain = sensitivity * MODE_GAIN[mode];
    const rawVolume = clamp01(Math.pow(rmsFromTimeDomain(timeData) * 3.2 * gain, 0.74));
    const bassRaw = clamp01(bandEnergy(frequencyData, this.sampleRate, this.fftSize, ...BAND_RANGES.bass) * gain);
    const lowMidRaw = clamp01(bandEnergy(frequencyData, this.sampleRate, this.fftSize, ...BAND_RANGES.lowMid) * gain);
    const midRaw = clamp01(bandEnergy(frequencyData, this.sampleRate, this.fftSize, ...BAND_RANGES.mid) * gain);
    const highMidRaw = clamp01(bandEnergy(frequencyData, this.sampleRate, this.fftSize, ...BAND_RANGES.highMid) * gain);
    const trebleRaw = clamp01(bandEnergy(frequencyData, this.sampleRate, this.fftSize, ...BAND_RANGES.treble) * gain);

    for (let i = 0; i < this.spectrumBins; i += 1) {
      const sourceIndex = Math.min(
        frequencyData.length - 1,
        Math.floor(Math.pow(i / this.spectrumBins, 1.82) * frequencyData.length)
      );
      const next = clamp01(Math.pow((frequencyData[sourceIndex] / 255) * gain, 0.7));
      this.spectrum[i] = smoothValue(this.spectrum[i], next, 0.48, 0.12);
    }

    for (let i = 0; i < this.waveformBins; i += 1) {
      const sourceIndex = Math.min(timeData.length - 1, Math.floor((i / this.waveformBins) * timeData.length));
      this.waveform[i] = ((timeData[sourceIndex] - 128) / 128) * Math.min(1.6, gain);
    }

    this.frame.volume = smoothValue(this.frame.volume, rawVolume, 0.32, mode === "karaoke" ? 0.2 : 0.09);
    this.frame.bass = smoothValue(this.frame.bass, bassRaw, 0.44, 0.1);
    this.frame.lowMid = smoothValue(this.frame.lowMid, lowMidRaw, 0.36, 0.1);
    this.frame.mid = smoothValue(this.frame.mid, midRaw, 0.34, mode === "karaoke" ? 0.18 : 0.09);
    this.frame.highMid = smoothValue(this.frame.highMid, highMidRaw, 0.32, 0.1);
    this.frame.treble = smoothValue(this.frame.treble, trebleRaw, 0.48, 0.13);

    const beat = this.beatDetector.update(this.frame.bass, this.frame.lowMid, timestamp);
    this.frame.beat = beat.beat;
    this.frame.strongBeat = beat.strongBeat;
    this.frame.beatIntensity = beat.beatIntensity;
    this.frame.timestamp = timestamp;

    return this.frame;
  }

  private createEmptyFrame(): AudioFrame {
    return {
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
  }
}

export function serializeAudioFrame(frame: AudioFrame, bins = 32): SerializedAudioFrame {
  const spectrum: number[] = [];
  for (let i = 0; i < bins; i += 1) {
    const start = Math.floor((i / bins) * frame.spectrum.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / bins) * frame.spectrum.length));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += frame.spectrum[j];
    spectrum.push(Number(clamp01(sum / (end - start)).toFixed(3)));
  }

  return {
    volume: Number(clamp01(frame.volume).toFixed(3)),
    bass: Number(clamp01(frame.bass).toFixed(3)),
    lowMid: Number(clamp01(frame.lowMid).toFixed(3)),
    mid: Number(clamp01(frame.mid).toFixed(3)),
    highMid: Number(clamp01(frame.highMid).toFixed(3)),
    treble: Number(clamp01(frame.treble).toFixed(3)),
    spectrum,
    beat: frame.beat,
    strongBeat: frame.strongBeat,
    beatIntensity: Number(clamp01(frame.beatIntensity).toFixed(3)),
    timestamp: frame.timestamp
  };
}

export function deserializeAudioFrame(payload: SerializedAudioFrame): AudioFrame {
  const spectrum = new Float32Array(Math.max(1, payload.spectrum.length));
  payload.spectrum.forEach((value, index) => {
    spectrum[index] = clamp01(value);
  });

  return {
    volume: clamp01(payload.volume),
    bass: clamp01(payload.bass),
    lowMid: clamp01(payload.lowMid),
    mid: clamp01(payload.mid),
    highMid: clamp01(payload.highMid),
    treble: clamp01(payload.treble),
    spectrum,
    waveform: new Float32Array(256),
    beat: Boolean(payload.beat),
    strongBeat: Boolean(payload.strongBeat),
    beatIntensity: clamp01(payload.beatIntensity),
    timestamp: payload.timestamp || performance.now()
  };
}
