import type { AudioFrame, AudioSource, AudioSourceDiagnostics } from "./types";

export class SilentAudioSource implements AudioSource {
  private readonly spectrum = new Float32Array(128);
  private readonly waveform = new Float32Array(256);
  private readonly frame: AudioFrame = {
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
  private framesRead = 0;

  async start() {}

  getFrame(time = performance.now()) {
    this.framesRead += 1;
    this.frame.timestamp = time;
    return this.frame;
  }

  getDiagnostics(): AudioSourceDiagnostics {
    return {
      audioState: "idle",
      framesRead: this.framesRead,
      maxFftBin: 0,
      dataChanged: false,
      rms: 0
    };
  }

  stop() {}
}
