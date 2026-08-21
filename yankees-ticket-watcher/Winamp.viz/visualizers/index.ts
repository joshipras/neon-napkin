import type { VisualizerFactory } from "./Visualizer";
import { SpectrumVisualizer } from "./SpectrumVisualizer";
import { OscilloscopeVisualizer } from "./OscilloscopeVisualizer";
import { StarfieldVisualizer } from "./StarfieldVisualizer";
import { PlasmaVisualizer } from "./PlasmaVisualizer";
import { TunnelVisualizer } from "./TunnelVisualizer";
import { RingsVisualizer } from "./RingsVisualizer";
import { LaserGridVisualizer } from "./LaserGridVisualizer";
import { ParticleVisualizer } from "./ParticleVisualizer";
import { KaleidoscopeVisualizer } from "./KaleidoscopeVisualizer";
import { MountainsVisualizer } from "./MountainsVisualizer";
import { DigitalRainVisualizer } from "./DigitalRainVisualizer";
import { ChaosVisualizer } from "./ChaosVisualizer";

export const visualizerFactories: VisualizerFactory[] = [
  () => new SpectrumVisualizer(),
  () => new OscilloscopeVisualizer(),
  () => new StarfieldVisualizer(),
  () => new PlasmaVisualizer(),
  () => new TunnelVisualizer(),
  () => new RingsVisualizer(),
  () => new LaserGridVisualizer(),
  () => new ParticleVisualizer(),
  () => new KaleidoscopeVisualizer(),
  () => new MountainsVisualizer(),
  () => new DigitalRainVisualizer(),
  () => new ChaosVisualizer()
];

export const visualizerNames = [
  "Spectrum Classic",
  "Neon Oscilloscope",
  "Starfield",
  "Plasma",
  "Infinite Tunnel",
  "Retro Rings",
  "Laser Grid",
  "Particle Explosion",
  "Kaleidoscope",
  "Frequency Mountains",
  "Matrix Audio",
  "Chaos Mode"
];
