import { describe, expect, it } from "vitest";
import { AudioFeatureExtractor, bandEnergy, clamp01, rmsFromTimeDomain, serializeAudioFrame } from "@/audio/AudioFeatureExtractor";

describe("audio normalization", () => {
  it("clamps invalid and out-of-range values", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("calculates RMS from centered unsigned waveform bytes", () => {
    expect(rmsFromTimeDomain(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(rmsFromTimeDomain(new Uint8Array([0, 255]))).toBeGreaterThan(0.98);
  });

  it("extracts frequency bands and serializes compact spectrum bins", () => {
    const freq = new Uint8Array(1024);
    const time = new Uint8Array(2048).fill(128);
    for (let i = 2; i < 12; i += 1) freq[i] = 220;
    for (let i = 100; i < 140; i += 1) freq[i] = 90;

    const extractor = new AudioFeatureExtractor(44100, 2048);
    const frame = extractor.extract(freq, time, 1000, 1.2, "party");
    const payload = serializeAudioFrame(frame, 16);

    expect(frame.bass).toBeGreaterThan(frame.treble);
    expect(payload.spectrum).toHaveLength(16);
    expect(payload.volume).toBeGreaterThanOrEqual(0);
    expect(payload.volume).toBeLessThanOrEqual(1);
  });

  it("keeps band energy normalized", () => {
    const freq = new Uint8Array(1024).fill(255);
    expect(bandEnergy(freq, 44100, 2048, 20, 160)).toBeLessThanOrEqual(1);
  });
});
