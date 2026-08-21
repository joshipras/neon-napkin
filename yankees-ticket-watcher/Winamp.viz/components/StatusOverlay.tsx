import type { AudioFrame, ExperienceMode } from "@/audio/types";
import { visualizerNames } from "@/visualizers";

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
  mode
}: {
  frame: AudioFrame | null;
  presetIndex: number;
  fps: number;
  elapsed: number;
  source: string;
  mode: ExperienceMode;
}) {
  const f = frame;
  return (
    <div className="panel-text pointer-events-none fixed left-3 top-3 z-30 min-w-52 border border-[#39ff14]/40 bg-black/55 p-3 font-mono text-[11px] uppercase leading-5 text-[#39ff14] backdrop-blur-sm sm:left-5 sm:top-5">
      <div className="flex justify-between gap-5 text-white">
        <span>VISUALIZE.FM</span>
        <span>
          [{String(presetIndex + 1).padStart(2, "0")}/{visualizerNames.length}]
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-5">
        <span>{source === "demo" ? "DEMO INPUT" : source === "tv" ? "REMOTE INPUT" : "LIVE INPUT"}</span>
        <span>44.1 KHZ</span>
      </div>
      <div>{visualizerNames[presetIndex]}</div>
      <div>MODE {mode.toUpperCase()}</div>
      <div>VOL {meter(f?.volume ?? 0)}</div>
      <div>BASS {meter(f?.bass ?? 0)}</div>
      <div>MID {meter(f?.mid ?? 0)}</div>
      <div>HIGH {meter(f?.treble ?? 0)}</div>
      <div className="mt-1 text-cyan-200">
        FPS {Math.round(fps)} TIME {formatElapsed(elapsed)}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
