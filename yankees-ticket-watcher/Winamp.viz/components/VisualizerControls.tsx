import type { ExperienceMode } from "@/audio/types";

export default function VisualizerControls({
  visible,
  presetName,
  autoCycle,
  sensitivity,
  mode,
  overlay,
  crt,
  curved,
  onPrev,
  onNext,
  onRandom,
  onAutoCycle,
  onSensitivity,
  onMode,
  onFullscreen,
  onOverlay,
  onCrt,
  onCurved,
  onExit
}: {
  visible: boolean;
  presetName: string;
  autoCycle: string;
  sensitivity: number;
  mode: ExperienceMode;
  overlay: boolean;
  crt: boolean;
  curved: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRandom: () => void;
  onAutoCycle: (value: string) => void;
  onSensitivity: (value: number) => void;
  onMode: (value: ExperienceMode) => void;
  onFullscreen: () => void;
  onOverlay: () => void;
  onCrt: () => void;
  onCurved: () => void;
  onExit: () => void;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 px-3 pb-3 transition duration-500 sm:px-5 sm:pb-5 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 border border-white/20 bg-black/60 p-3 text-xs uppercase text-white shadow-hot backdrop-blur-md sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[#39ff14]">PRESET</div>
          <div className="truncate text-base font-black text-white">{presetName}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:flex">
          <button className="bevel h-11 px-4 text-[#39ff14]" onClick={onPrev} title="Previous preset">
            {"<"}
          </button>
          <button className="bevel h-11 px-4 text-[#39ff14]" onClick={onNext} title="Next preset">
            {">"}
          </button>
          <button className="bevel h-11 px-4 text-cyan-100" onClick={onRandom} title="Random preset">
            ?
          </button>
          <button className="bevel h-11 px-4 text-fuchsia-100" onClick={onFullscreen} title="Fullscreen">
            [ ]
          </button>
        </div>
        <label className="flex items-center gap-2">
          <span>SENS</span>
          <input
            aria-label="Sensitivity"
            className="accent-[#39ff14]"
            max="1.8"
            min="0.45"
            onChange={(event) => onSensitivity(Number(event.target.value))}
            step="0.05"
            type="range"
            value={sensitivity}
          />
        </label>
        <select
          aria-label="Mode"
          className="bevel h-11 bg-black px-3 text-white"
          onChange={(event) => onMode(event.target.value as ExperienceMode)}
          value={mode}
        >
          <option value="chill">CHILL</option>
          <option value="party">PARTY</option>
          <option value="karaoke">KARAOKE</option>
          <option value="chaos">CHAOS</option>
        </select>
        <select
          aria-label="Auto cycle"
          className="bevel h-11 bg-black px-3 text-white"
          onChange={(event) => onAutoCycle(event.target.value)}
          value={autoCycle}
        >
          <option value="off">AUTO OFF</option>
          <option value="15">15 SEC</option>
          <option value="30">30 SEC</option>
          <option value="60">60 SEC</option>
          <option value="smart">SMART</option>
        </select>
        <div className="grid grid-cols-4 gap-2 sm:flex">
          <button className={`bevel h-11 px-3 ${overlay ? "text-[#39ff14]" : "text-white/55"}`} onClick={onOverlay} title="Overlay">
            OSD
          </button>
          <button className={`bevel h-11 px-3 ${crt ? "text-[#39ff14]" : "text-white/55"}`} onClick={onCrt} title="Scanlines">
            CRT
          </button>
          <button className={`bevel h-11 px-3 ${curved ? "text-[#39ff14]" : "text-white/55"}`} onClick={onCurved} title="Screen curve">
            CURV
          </button>
          <button className="bevel h-11 px-3 text-white" onClick={onExit} title="Exit">
            X
          </button>
        </div>
      </div>
    </div>
  );
}
