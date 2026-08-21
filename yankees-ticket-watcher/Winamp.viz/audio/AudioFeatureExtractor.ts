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

const NOISE_CONFIG: Record<
  ExperienceMode,
  {
    margin: number;
    subBassExtraMargin: number;
    rmsMargin: number;
    knee: number;
    outputGain: number;
    quietRms: number;
  }
> = {
  chill: {
    margin: 0.018,
    subBassExtraMargin: 0.014,
    rmsMargin: 0.006,
    knee: 0.05,
    outputGain: 1.55,
    quietRms: 0.022
  },
  party: {
    margin: 0.026,
    subBassExtraMargin: 0.024,
    rmsMargin: 0.008,
    knee: 0.055,
    outputGain: 1.78,
    quietRms: 0.028
  },
  karaoke: {
    margin: 0.034,
    subBassExtraMargin: 0.03,
    rmsMargin: 0.009,
    knee: 0.052,
    outputGain: 1.95,
    quietRms: 0.032
  },
  chaos: {
    margin: 0.022,
    subBassExtraMargin: 0.018,
    rmsMargin: 0.007,
    knee: 0.048,
    outputGain: 1.75,
    quietRms: 0.026
  }
};

export function clamp01(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function smoothValue(previous: number, next: number, attack = 0.38, release = 0.11) {
  const amount = next > previous ? attack : release;
  return previous + (next - previous) * amount;
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.000001, edge1 - edge0));
  return t * t * (3 - 2 * t);
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

function rawBandEnergy(
  frequencyData: Uint8Array,
  sampleRate: number,
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
  return clamp01(normalized);
}

function shapeBandEnergy(normalized: number, fftSize: number) {
  const fftBoost = Math.min(1.12, 2048 / fftSize + 0.12);
  return clamp01(Math.pow(normalized * fftBoost, 0.74));
}

export function bandEnergy(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number
) {
  return shapeBandEnergy(rawBandEnergy(frequencyData, sampleRate, minHz, maxHz), fftSize);
}

export function applySoftNoiseGate(value: number, floor: number, margin: number, knee: number, outputGain = 1) {
  const excess = Math.max(0, value - floor - margin);
  const gate = smoothstep(0, knee, excess);
  return clamp01(excess * gate * outputGain);
}

export class AudioFeatureExtractor {
  private readonly beatDetector = new BeatDetector();
  private readonly spectrum: Float32Array;
  private readonly waveform: Float32Array;
  private readonly spectrumNoiseFloor: Float32Array;
  private readonly bandNoiseFloor = {
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    rms: 0
  };
  private frame: AudioFrame;
  private floorFrames = 0;
  private diagnostics = {
    rawRms: 0,
    gatedRms: 0,
    estimatedNoiseFloor: 0,
    rawBass: 0,
    gatedBass: 0
  };

  constructor(
    private readonly sampleRate: number,
    private readonly fftSize: number,
    private readonly spectrumBins = 128,
    private readonly waveformBins = 256
  ) {
    this.spectrum = new Float32Array(spectrumBins);
    this.waveform = new Float32Array(waveformBins);
    this.spectrumNoiseFloor = new Float32Array(spectrumBins);
    this.frame = this.createEmptyFrame();
  }

  reset() {
    this.beatDetector.reset();
    this.spectrum.fill(0);
    this.spectrumNoiseFloor.fill(0);
    this.waveform.fill(0);
    this.bandNoiseFloor.bass = 0;
    this.bandNoiseFloor.lowMid = 0;
    this.bandNoiseFloor.mid = 0;
    this.bandNoiseFloor.highMid = 0;
    this.bandNoiseFloor.treble = 0;
    this.bandNoiseFloor.rms = 0;
    this.floorFrames = 0;
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
    const config = NOISE_CONFIG[mode];
    const rawRms = rmsFromTimeDomain(timeData);
    this.floorFrames += 1;

    this.bandNoiseFloor.rms = this.updateNoiseFloor(this.bandNoiseFloor.rms, rawRms, rawRms, config);
    const rmsExcess = Math.max(0, rawRms - this.bandNoiseFloor.rms);
    const globalActivity = smoothstep(0, config.rmsMargin * 3.5, rmsExcess);
    const gatedRmsLinear = applySoftNoiseGate(rawRms, this.bandNoiseFloor.rms, config.rmsMargin, config.knee * 0.62, 7.8);
    const rawVolume = clamp01(Math.pow(gatedRmsLinear * gain, 0.74));

    const bassLinear = rawBandEnergy(frequencyData, this.sampleRate, ...BAND_RANGES.bass);
    const lowMidLinear = rawBandEnergy(frequencyData, this.sampleRate, ...BAND_RANGES.lowMid);
    const midLinear = rawBandEnergy(frequencyData, this.sampleRate, ...BAND_RANGES.mid);
    const highMidLinear = rawBandEnergy(frequencyData, this.sampleRate, ...BAND_RANGES.highMid);
    const trebleLinear = rawBandEnergy(frequencyData, this.sampleRate, ...BAND_RANGES.treble);

    this.bandNoiseFloor.bass = this.updateNoiseFloor(this.bandNoiseFloor.bass, bassLinear, rawRms, config);
    this.bandNoiseFloor.lowMid = this.updateNoiseFloor(this.bandNoiseFloor.lowMid, lowMidLinear, rawRms, config);
    this.bandNoiseFloor.mid = this.updateNoiseFloor(this.bandNoiseFloor.mid, midLinear, rawRms, config);
    this.bandNoiseFloor.highMid = this.updateNoiseFloor(this.bandNoiseFloor.highMid, highMidLinear, rawRms, config);
    this.bandNoiseFloor.treble = this.updateNoiseFloor(this.bandNoiseFloor.treble, trebleLinear, rawRms, config);

    const bassGated =
      applySoftNoiseGate(
        bassLinear,
        this.bandNoiseFloor.bass,
        config.margin + config.subBassExtraMargin,
        config.knee,
        config.outputGain * 1.06
      ) * globalActivity;
    const lowMidGated =
      applySoftNoiseGate(lowMidLinear, this.bandNoiseFloor.lowMid, config.margin, config.knee, config.outputGain) * globalActivity;
    const midGated =
      applySoftNoiseGate(midLinear, this.bandNoiseFloor.mid, config.margin * 0.82, config.knee, config.outputGain * 1.08) *
      globalActivity;
    const highMidGated =
      applySoftNoiseGate(highMidLinear, this.bandNoiseFloor.highMid, config.margin * 0.76, config.knee, config.outputGain) *
      globalActivity;
    const trebleGated =
      applySoftNoiseGate(trebleLinear, this.bandNoiseFloor.treble, config.margin * 0.72, config.knee, config.outputGain * 0.94) *
      globalActivity;

    const bassRaw = clamp01(shapeBandEnergy(bassGated, this.fftSize) * gain);
    const lowMidRaw = clamp01(shapeBandEnergy(lowMidGated, this.fftSize) * gain);
    const midRaw = clamp01(shapeBandEnergy(midGated, this.fftSize) * gain);
    const highMidRaw = clamp01(shapeBandEnergy(highMidGated, this.fftSize) * gain);
    const trebleRaw = clamp01(shapeBandEnergy(trebleGated, this.fftSize) * gain);

    for (let i = 0; i < this.spectrumBins; i += 1) {
      const sourceIndex = Math.min(
        frequencyData.length - 1,
        Math.floor(Math.pow(i / this.spectrumBins, 1.82) * frequencyData.length)
      );
      const sourceLinear = frequencyData[sourceIndex] / 255;
      const frequencyRatio = sourceIndex / Math.max(1, frequencyData.length - 1);
      const lowFrequencyPenalty = frequencyRatio < 0.055 ? config.subBassExtraMargin * (1 - frequencyRatio / 0.055) : 0;
      this.spectrumNoiseFloor[i] = this.updateNoiseFloor(this.spectrumNoiseFloor[i], sourceLinear, rawRms, config);
      const gated = applySoftNoiseGate(
        sourceLinear,
        this.spectrumNoiseFloor[i],
        config.margin + lowFrequencyPenalty,
        config.knee,
        config.outputGain
      );
      const next = clamp01(Math.pow(gated * globalActivity * gain, 0.7));
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

    this.diagnostics.rawRms = rawRms;
    this.diagnostics.gatedRms = this.frame.volume;
    this.diagnostics.estimatedNoiseFloor = this.estimateNoiseFloor();
    this.diagnostics.rawBass = clamp01(shapeBandEnergy(bassLinear, this.fftSize) * gain);
    this.diagnostics.gatedBass = this.frame.bass;

    return this.frame;
  }

  getDiagnostics() {
    return this.diagnostics;
  }

  private updateNoiseFloor(
    previous: number,
    next: number,
    rawRms: number,
    config: (typeof NOISE_CONFIG)[ExperienceMode]
  ) {
    const learningQuietRoom = this.floorFrames < 120 && rawRms < config.quietRms;
    const closeToFloor = next < previous + config.margin * 2.3;
    const rise = learningQuietRoom ? 0.08 : closeToFloor ? 0.008 : 0.0008;
    const fall = 0.0025;
    const amount = next > previous ? rise : fall;
    return clamp01(previous + (next - previous) * amount);
  }

  private estimateNoiseFloor() {
    let spectrumSum = 0;
    const sampleBins = Math.min(32, this.spectrumNoiseFloor.length);
    for (let i = 0; i < sampleBins; i += 1) spectrumSum += this.spectrumNoiseFloor[i];
    const spectrumFloor = sampleBins > 0 ? spectrumSum / sampleBins : 0;
    return clamp01(
      spectrumFloor * 0.45 +
        this.bandNoiseFloor.rms * 0.2 +
        this.bandNoiseFloor.bass * 0.2 +
        this.bandNoiseFloor.mid * 0.15
    );
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
