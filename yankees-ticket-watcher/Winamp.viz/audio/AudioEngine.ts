import { AudioFeatureExtractor } from "./AudioFeatureExtractor";
import type { AudioFrame, AudioSource, AudioSourceDiagnostics, ExperienceMode } from "./types";

export class AudioEngine implements AudioSource {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;
  private extractor: AudioFeatureExtractor | null = null;
  private frame: AudioFrame | null = null;
  private framesRead = 0;
  private maxFftBin = 0;
  private lastChecksum = 0;
  private dataChanged = false;

  constructor(
    private readonly sensitivityRef: () => number,
    private readonly modeRef: () => ExperienceMode
  ) {}

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("unsupported-browser");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (error) {
      const err = error as DOMException;
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        throw new Error("microphone-denied");
      }
      if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        throw new Error("no-microphone");
      }
      throw new Error("microphone-unavailable");
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("audio-context-failure");
    }

    this.audioContext = new AudioContextCtor({ latencyHint: "interactive" });
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    this.analyser.minDecibels = -92;
    this.analyser.maxDecibels = -18;

    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);
    this.extractor = new AudioFeatureExtractor(this.audioContext.sampleRate, this.analyser.fftSize, 96, 128);
    this.frame = this.extractor.extract(this.frequencyData, this.timeData, performance.now());
  }

  getFrame(time = performance.now()) {
    if (!this.analyser || !this.frequencyData || !this.timeData || !this.extractor || !this.frame) {
      throw new Error("audio-engine-not-started");
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);
    this.framesRead += 1;
    this.maxFftBin = 0;
    let checksum = 0;
    for (let i = 0; i < this.frequencyData.length; i += 16) {
      if (this.frequencyData[i] > this.maxFftBin) this.maxFftBin = this.frequencyData[i];
      checksum = (checksum + this.frequencyData[i] * (i + 1)) % 1000003;
    }
    this.dataChanged = checksum !== this.lastChecksum;
    this.lastChecksum = checksum;
    this.frame = this.extractor.extract(this.frequencyData, this.timeData, time, this.sensitivityRef(), this.modeRef());
    return this.frame;
  }

  getDiagnostics(): AudioSourceDiagnostics {
    return {
      audioState: this.audioContext?.state ?? "idle",
      framesRead: this.framesRead,
      maxFftBin: this.maxFftBin / 255,
      dataChanged: this.dataChanged,
      rms: this.frame?.volume ?? 0
    };
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.frequencyData = null;
    this.timeData = null;
    this.extractor = null;
    this.frame = null;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
