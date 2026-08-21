export interface AudioFrame {
  volume: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  spectrum: Float32Array;
  waveform: Float32Array;
  beat: boolean;
  strongBeat: boolean;
  beatIntensity: number;
  timestamp: number;
}

export interface AudioSourceDiagnostics {
  audioState: "idle" | "simulated" | "running" | "suspended" | "interrupted" | "closed" | "error";
  framesRead: number;
  maxFftBin: number;
  dataChanged: boolean;
  rms: number;
}

export interface SerializedAudioFrame {
  volume: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  spectrum: number[];
  beat: boolean;
  strongBeat: boolean;
  beatIntensity: number;
  timestamp: number;
}

export interface AudioSource {
  start(): Promise<void>;
  getFrame(time?: number): AudioFrame;
  getDiagnostics?(): AudioSourceDiagnostics;
  stop(): void;
}

export type ExperienceMode = "chill" | "party" | "karaoke" | "chaos";
