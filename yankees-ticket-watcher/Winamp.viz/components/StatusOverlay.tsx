import type { AudioFrame, AudioSourceDiagnostics, ExperienceMode } from "@/audio/types";

function meter(value: number, width = 10) {
  const count = Math.max(0, Math.min(width, Math.round(value * width)));
  return `${"█".repeat(count)}${"░".repeat(width - count)}`;
}

export default function StatusOverlay({
  frame,
  presetIndex,
  fps,
  elapsed,
  source,
  mode,
  diagnostics,
  debug,
  presetName,
  presetCount
}: {
  frame: AudioFrame | null;
  presetIndex: number;
  fps: number;
  elapsed: number;
  source: string;
  mode: ExperienceMode;
  diagnostics?: AudioSourceDiagnostics | null;
  debug?: boolean;
  presetName: string;
  presetCount: number;
}) {
  const f = frame;
  return (
    <div className="panel-text pointer-events-none fixed left-3 top-3 z-30 min-w-52 border border-[#39ff14]/40 bg-black/55 p-3 font-mono text-[11px] uppercase leading-5 text-[#39ff14] backdrop-blur-sm sm:left-5 sm:top-5">
      <div className="flex justify-between gap-5 text-white">
        <span>VISUALIZE.FM</span>
        <span>
          [{String(presetIndex + 1).padStart(2, "0")}/{presetCount}]
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-5">
        <span>{source === "demo" || source === "test" ? "TEST INPUT" : source === "tv" ? "REMOTE INPUT" : "LIVE INPUT"}</span>
        <span>44.1 KHZ</span>
      </div>
      <div>{presetName}</div>
      <div>MODE {mode.toUpperCase()}</div>
      <div>VOL {meter(f?.volume ?? 0)}</div>
      <div>BASS {meter(f?.bass ?? 0)}</div>
      <div>MID {meter(f?.mid ?? 0)}</div>
      <div>HIGH {meter(f?.treble ?? 0)}</div>
      <div className="mt-1 text-cyan-200">
        FPS {Math.round(fps)} TIME {formatElapsed(elapsed)}
      </div>
      {debug && (
        <div className="mt-1 border-t border-[#39ff14]/30 pt-1 text-cyan-100">
          <div>FRAMES {diagnostics?.framesRead ?? 0}</div>
          <div>AUDIO {(diagnostics?.audioState ?? "idle").toUpperCase()}</div>
          <div>RMS {(diagnostics?.rms ?? 0).toFixed(3)}</div>
          <div>FFT MAX {(diagnostics?.maxFftBin ?? 0).toFixed(3)}</div>
          <div>DATA {diagnostics?.dataChanged ? "CHANGING" : "STATIC"}</div>
        </div>
      )}
    </div>
  );
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
