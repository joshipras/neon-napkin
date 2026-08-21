import { describe, expect, it } from "vitest";
import { BeatDetector } from "@/audio/BeatDetector";

describe("BeatDetector", () => {
  it("detects spikes against a rolling low-frequency average", () => {
    const detector = new BeatDetector(8, 200);
    for (let i = 0; i < 10; i += 1) {
      detector.update(0.12, 0.1, i * 100);
    }
    const beat = detector.update(0.85, 0.5, 1200);
    expect(beat.beat).toBe(true);
    expect(beat.beatIntensity).toBeGreaterThan(0);
  });

  it("uses cooldown to avoid repeated beats from a sustained bass note", () => {
    const detector = new BeatDetector(8, 300);
    for (let i = 0; i < 10; i += 1) detector.update(0.1, 0.1, i * 100);
    expect(detector.update(0.95, 0.4, 1200).beat).toBe(true);
    expect(detector.update(0.96, 0.4, 1250).beat).toBe(false);
  });
});
