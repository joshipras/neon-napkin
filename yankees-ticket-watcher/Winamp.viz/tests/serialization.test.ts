import { describe, expect, it } from "vitest";
import { deserializeAudioFrame, serializeAudioFrame } from "@/audio/AudioFeatureExtractor";
import type { AudioFrame } from "@/audio/types";

describe("feature serialization", () => {
  it("compresses visualization features without waveform or raw audio", () => {
    const spectrum = new Float32Array(64).fill(0).map((_, index) => index / 63);
    const frame: AudioFrame = {
      volume: 0.5,
      bass: 0.8,
      lowMid: 0.4,
      mid: 0.3,
      highMid: 0.2,
      treble: 0.1,
      spectrum,
      waveform: new Float32Array(256).fill(0.5),
      beat: true,
      strongBeat: false,
      beatIntensity: 0.6,
      timestamp: 123
    };

    const payload = serializeAudioFrame(frame, 8);
    expect(payload.spectrum).toHaveLength(8);
    expect(JSON.stringify(payload)).not.toContain("waveform");

    const restored = deserializeAudioFrame(payload);
    expect(restored.bass).toBe(0.8);
    expect(restored.beat).toBe(true);
    expect(restored.waveform).toHaveLength(256);
  });
});
