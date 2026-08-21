import { describe, expect, it } from "vitest";
import {
  AudioFeatureExtractor,
  applySoftNoiseGate,
  bandEnergy,
  clamp01,
  rmsFromTimeDomain,
  serializeAudioFrame
} from "@/audio/AudioFeatureExtractor";

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
    const time = new Uint8Array(2048);
    for (let i = 0; i < time.length; i += 1) {
      time[i] = Math.max(0, Math.min(255, Math.round(128 + Math.sin(i * 0.06) * 24)));
    }
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

  it("soft-gates energy near the learned noise floor", () => {
    expect(applySoftNoiseGate(0.05, 0.04, 0.02, 0.05, 2)).toBe(0);
    expect(applySoftNoiseGate(0.24, 0.04, 0.02, 0.05, 2)).toBeGreaterThan(0.25);
  });

  it("learns steady room rumble but still responds to strong bass", () => {
    const extractor = new AudioFeatureExtractor(44100, 1024);
    const room = new Uint8Array(512).fill(14);
    const time = new Uint8Array(1024).fill(128);
    const bassTime = new Uint8Array(1024);
    for (let i = 0; i < bassTime.length; i += 1) {
      bassTime[i] = Math.max(0, Math.min(255, Math.round(128 + Math.sin(i * 0.08) * 34)));
    }
    let frame = extractor.extract(room, time, 0, 1, "party");

    for (let i = 1; i < 180; i += 1) {
      frame = extractor.extract(room, time, i * 16.7, 1, "party");
    }

    expect(frame.bass).toBeLessThan(0.08);
    expect(frame.volume).toBeLessThan(0.05);

    const music = new Uint8Array(512).fill(14);
    for (let i = 2; i < 16; i += 1) music[i] = 230;

    for (let i = 180; i < 198; i += 1) {
      frame = extractor.extract(music, bassTime, i * 16.7, 1, "party");
    }

    expect(frame.bass).toBeGreaterThan(0.35);

    for (let i = 198; i < 318; i += 1) {
      frame = extractor.extract(room, time, i * 16.7, 1, "party");
    }

    expect(frame.bass).toBeLessThan(0.1);
  });
});
