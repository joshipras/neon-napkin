"use client";

import { forwardRef } from "react";
import type { AudioFrame, AudioSourceDiagnostics } from "@/audio/types";
import MiniSpectrum, { type MiniSpectrumHandle } from "./MiniSpectrum";
import SevenSegmentTimer from "./SevenSegmentTimer";
import WinampButton from "./WinampButton";

export interface WinampPlayerProps {
  elapsed: number;
  frame: AudioFrame | null;
  fps: number;
  diagnostics: AudioSourceDiagnostics | null;
  debug: boolean;
  source: "mic" | "demo" | "test";
  onFullscreen: () => void;
}

const WinampPlayer = forwardRef<MiniSpectrumHandle, WinampPlayerProps>(function WinampPlayer(
  { elapsed, frame, fps, diagnostics, debug, source, onFullscreen },
  miniRef
) {
  const volume = frame?.volume ?? 0;

  return (
    <section className="wa-player" aria-label="Winamp-style player">
      <div className="wa-title-strip">
        <div className="wa-strip-icon">
          <span />
          <span />
          <span />
        </div>
        <div className="wa-gold-line" />
        <div className="wa-wordmark">WINAMP</div>
        <div className="wa-gold-line" />
        <div className="wa-strip-controls">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="wa-main-panel">
        <div className="wa-left-deck">
          <div className="wa-indicator-stack">
            <span className="wa-tiny-label">O</span>
            <span className="wa-led green" />
            <span className="wa-tiny-label">A</span>
            <span className="wa-led amber" />
            <span className="wa-tiny-label">I</span>
            <span className="wa-tiny-label">D</span>
          </div>
          <div className="wa-play-triangle" />
          <SevenSegmentTimer seconds={elapsed} />
          <div className="wa-mini-wrap">
            <MiniSpectrum ref={miniRef} />
          </div>
          <TransportCluster className="wa-left-transport" />
        </div>

        <div className="wa-right-deck">
          <div className="wa-track-row">
            <div className="wa-track-display">
              <span>001. LIVE KARAOKE - MICROPHONE INPUT - VISUALIZE.FM</span>
            </div>
            <div className="wa-meta-box wa-kbps">
              <strong>128</strong>
              <span>kbps</span>
            </div>
            <div className="wa-meta-box wa-khz">
              <strong>44</strong>
              <span>kHz</span>
            </div>
            <div className="wa-stereo">
              <span className="muted">mono</span>
              <span className="active">stereo</span>
            </div>
          </div>

          <div className="wa-slider-row">
            <WinampSlider color="red" value={0.68} label="vol" />
            <WinampSlider color="green" value={0.52} label="bal" />
            <WinampButton className="wa-eqpl">
              <span className="wa-small-led" />
              EQ
            </WinampButton>
            <WinampButton className="wa-eqpl">
              <span className="wa-small-led" />
              PL
            </WinampButton>
          </div>

          <div className="wa-bottom-row">
            <div className="wa-decor-panel">
              <div className="wa-decor-lamps" aria-hidden>
                {Array.from({ length: 34 }).map((_, index) => (
                  <i className={index / 34 < 0.18 + volume * 0.7 ? "on" : ""} key={index} />
                ))}
              </div>
              <span className="wa-decor-label">LIVE INPUT · MIC · FFT</span>
            </div>
            <div className="wa-toggle-cluster">
              <WinampButton className="wa-wide">
                <span className="wa-small-led" />
                SHUFFLE
              </WinampButton>
              <WinampButton className="wa-repeat">
                <span className="wa-small-led" />
                ↻
              </WinampButton>
              <WinampButton className="wa-repeat" onClick={onFullscreen} title="Fullscreen">
                □
              </WinampButton>
            </div>
          </div>
        </div>
      </div>

      {debug && (
        <div className="wa-debug">
          FPS {Math.round(fps)} · AUDIO {(diagnostics?.audioState ?? "idle").toUpperCase()} · RMS{" "}
          {(diagnostics?.rawRms ?? diagnostics?.rms ?? 0).toFixed(3)}→
          {(diagnostics?.gatedRms ?? diagnostics?.rms ?? 0).toFixed(3)} · FLOOR{" "}
          {(diagnostics?.estimatedNoiseFloor ?? 0).toFixed(3)} · BASS{" "}
          {(diagnostics?.rawBass ?? 0).toFixed(3)}→{(diagnostics?.gatedBass ?? 0).toFixed(3)} · AGC{" "}
          {diagnostics?.microphoneSettings?.autoGainControl === undefined
            ? "?"
            : diagnostics.microphoneSettings.autoGainControl
              ? "ON"
              : "OFF"}{" "}
          · FFT {(diagnostics?.maxFftBin ?? 0).toFixed(3)} · {diagnostics?.dataChanged ? "DATA CHANGING" : "DATA STATIC"} ·{" "}
          {source.toUpperCase()}
        </div>
      )}
    </section>
  );
});

function TransportCluster({ className = "" }: { className?: string }) {
  return (
    <div className={`wa-transport ${className}`}>
      <WinampButton>|◀</WinampButton>
      <WinampButton className="is-play">▶</WinampButton>
      <WinampButton>Ⅱ</WinampButton>
      <WinampButton>■</WinampButton>
      <WinampButton>▶|</WinampButton>
      <WinampButton>▲</WinampButton>
    </div>
  );
}

function WinampSlider({ color, value, label }: { color: "red" | "green"; value: number; label: string }) {
  return (
    <div className={`wa-slider ${color}`} aria-label={label}>
      <div className="wa-slider-track">
        <span style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <div className="wa-slider-thumb" style={{ left: `${Math.round(value * 100)}%` }}>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default WinampPlayer;
