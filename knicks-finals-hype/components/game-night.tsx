"use client";

import {
  Bell,
  Check,
  ChevronRight,
  CircleDot,
  Flame,
  GlassWater,
  Info,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GameState = {
  knicks: number;
  spurs: number;
  quarter: number;
  seconds: number;
  possession: "NYK" | "SAS";
};

type VibeRule = {
  id: string;
  title: string;
  detail: string;
  points: number;
  icon: typeof Flame;
  tone: "orange" | "blue" | "light";
};

const rules: VibeRule[] = [
  {
    id: "brunson-three",
    title: "Brunson hits a 3",
    detail: "Take one celebratory sip",
    points: 3,
    icon: Flame,
    tone: "orange",
  },
  {
    id: "bad-call",
    title: "The ref blows a call",
    detail: "Two sips. Boo responsibly.",
    points: 2,
    icon: Volume2,
    tone: "light",
  },
  {
    id: "garden-erupts",
    title: "The Garden erupts",
    detail: "Everybody hydrates",
    points: 4,
    icon: Radio,
    tone: "blue",
  },
  {
    id: "hart-board",
    title: "Hart grabs a wild board",
    detail: "Point at the nearest ceiling",
    points: 2,
    icon: Zap,
    tone: "orange",
  },
  {
    id: "bing-bong",
    title: "Someone says “Bing Bong”",
    detail: "New York rules: group sip",
    points: 1,
    icon: Bell,
    tone: "blue",
  },
  {
    id: "clutch-time",
    title: "Clutch-time bucket",
    detail: "Stand up. No exceptions.",
    points: 5,
    icon: Trophy,
    tone: "light",
  },
];

const defaultGame: GameState = {
  knicks: 88,
  spurs: 84,
  quarter: 4,
  seconds: 432,
  possession: "NYK",
};

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function getCommentary(game: GameState) {
  const margin = game.knicks - game.spurs;

  if (game.seconds < 60 && Math.abs(margin) <= 3) {
    return "One possession. Eight million people holding the same breath.";
  }
  if (margin <= -12) {
    return `Trailing by ${Math.abs(margin)}, but hey, it’s nothing a little MSG magic can’t fix. Remember ’94?`;
  }
  if (margin < 0) {
    return `Down ${Math.abs(margin)}. In New York, that’s not a deficit. That’s dramatic structure.`;
  }
  if (margin >= 12) {
    return `Up ${margin}. The subway ride home just got significantly louder.`;
  }
  if (margin >= 5) {
    return `Knicks by ${margin}. Somewhere on Seventh Avenue, a car horn is already celebrating.`;
  }
  return "Tighter than a rush-hour 6 train. Protect the ball and trust the Garden.";
}

export function GameNight() {
  const [game, setGame] = useState(defaultGame);
  const [muted, setMuted] = useState(false);
  const [zeroProof, setZeroProof] = useState(false);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [lastHit, setLastHit] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGame((current) => {
        if (current.seconds === 0) return current;

        const nextSeconds = current.seconds - 1;
        if (nextSeconds % 7 !== 0) {
          return { ...current, seconds: nextSeconds };
        }

        const scoringTeam = Math.random() > 0.48 ? "NYK" : "SAS";
        const points = Math.random() > 0.68 ? 3 : 2;

        return {
          ...current,
          seconds: nextSeconds,
          knicks: current.knicks + (scoringTeam === "NYK" ? points : 0),
          spurs: current.spurs + (scoringTeam === "SAS" ? points : 0),
          possession: scoringTeam === "NYK" ? "SAS" : "NYK",
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const totalHits = Object.values(hits).reduce((sum, count) => sum + count, 0);
  const vibePoints = useMemo(
    () =>
      rules.reduce(
        (sum, rule) => sum + (hits[rule.id] ?? 0) * rule.points,
        0,
      ),
    [hits],
  );
  const vibePercent = Math.min(100, 12 + vibePoints * 3);
  const commentary = getCommentary(game);

  function triggerRule(rule: VibeRule) {
    setHits((current) => ({
      ...current,
      [rule.id]: (current[rule.id] ?? 0) + 1,
    }));
    setLastHit(rule.id);
    window.setTimeout(() => setLastHit(null), 500);
  }

  function resetGame() {
    setHits({});
    setLastHit(null);
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-16">
      <div className="stadium-lights pointer-events-none absolute inset-0" />
      <div className="court-lines pointer-events-none absolute inset-0" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a className="flex items-center gap-3" href="#" aria-label="NYK After Dark home">
            <span className="grid h-9 w-9 rotate-3 place-items-center rounded-sm bg-knicks-orange text-knicks-navy shadow-glow">
              <span className="display-type -rotate-3 text-lg">NY</span>
            </span>
            <span>
              <span className="display-type block text-lg uppercase leading-none tracking-wide">
                NYK After Dark
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-white/45">
                Finals Edition
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/65 transition hover:border-white/25 hover:text-white"
              aria-label={muted ? "Turn sound on" : "Mute sound"}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-emerald-300" />
              Simulated Live
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-9 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/45 sm:hidden">
          <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-emerald-300" />
          Simulated Live
        </div>

        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#061528]/80 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 sm:px-7">
            <span className="flex items-center gap-2">
              <CircleDot size={13} className="text-knicks-orange" />
              Finals · Game 6
            </span>
            <span>Madison Square Garden</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-7 sm:gap-10 sm:px-12 sm:py-10">
            <Team
              abbreviation="NYK"
              city="New York"
              score={game.knicks}
              possession={game.possession === "NYK"}
              accent
            />

            <div className="flex min-w-20 flex-col items-center sm:min-w-28">
              <span className="rounded bg-knicks-orange px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-knicks-navy">
                4th Qtr
              </span>
              <span className="score-text mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                {formatClock(game.seconds)}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                Shot clock 18
              </span>
            </div>

            <Team
              abbreviation="SAS"
              city="San Antonio"
              score={game.spurs}
              possession={game.possession === "SAS"}
            />
          </div>

          <div className="border-t border-white/10 bg-white/[0.035] px-4 py-5 sm:px-7">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-knicks-orange/15 text-knicks-orange">
                <Sparkles size={15} />
              </span>
              <div key={commentary} className="animate-rise">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-knicks-orange">
                  Garden Intel
                </p>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-white/75 sm:text-base">
                  {commentary}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.26em] text-knicks-orange">
                Game Night Companion
              </p>
              <h1 className="display-type text-4xl uppercase leading-none sm:text-6xl">
                Play the <span className="text-knicks-orange">Vibe Game</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/45 transition hover:border-white/25 hover:text-white"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-knicks-blue text-white">
                <GlassWater size={19} />
              </div>
              <div>
                <p className="text-sm font-black">Choose your game mode</p>
                <p className="text-xs text-white/45">
                  Every cue works with water, soda, or your drink of choice.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setZeroProof((value) => !value)}
              className={`mt-4 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-black transition sm:mt-0 sm:w-auto sm:min-w-44 ${
                zeroProof
                  ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                  : "border-white/10 bg-black/20 text-white/65"
              }`}
            >
              <span>{zeroProof ? "Zero-proof mode" : "Classic mode"}</span>
              <span
                className={`relative h-5 w-9 rounded-full transition ${
                  zeroProof ? "bg-emerald-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                    zeroProof ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => {
              const Icon = rule.icon;
              const count = hits[rule.id] ?? 0;
              const isActive = lastHit === rule.id;

              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => triggerRule(rule)}
                  className={`group relative min-h-36 overflow-hidden rounded-xl border p-4 text-left transition duration-200 active:scale-[0.98] ${
                    isActive
                      ? "border-knicks-orange bg-knicks-orange/15"
                      : "border-white/10 bg-[#0b213a]/80 hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#0e2948]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${
                        rule.tone === "orange"
                          ? "bg-knicks-orange text-knicks-navy"
                          : rule.tone === "blue"
                            ? "bg-knicks-blue text-white"
                            : "bg-white text-knicks-navy"
                      }`}
                    >
                      {isActive ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                      {count > 0 ? `Hit ×${count}` : `+${rule.points} vibe`}
                    </span>
                  </div>
                  <p className="mt-5 pr-7 text-base font-black leading-tight">
                    {rule.title}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {zeroProof
                      ? rule.detail.replace(/sips?|drink/gi, "water break")
                      : rule.detail}
                  </p>
                  <ChevronRight
                    size={17}
                    className="absolute bottom-4 right-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-knicks-orange"
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-knicks-orange/20 bg-gradient-to-r from-knicks-orange/10 to-knicks-blue/10 p-4 sm:flex sm:items-center sm:gap-6 sm:p-5">
            <div className="flex items-center justify-between sm:w-44 sm:shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                  Current status
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-black">
                  <Flame size={17} className="text-knicks-orange" fill="currentColor" />
                  {vibePercent >= 75 ? "Unhinged" : vibePercent >= 45 ? "Electric" : "Heating up"}
                </p>
              </div>
              <span className="display-type text-3xl text-knicks-orange sm:hidden">
                {totalHits}
              </span>
            </div>
            <div className="mt-3 flex-1 sm:mt-0">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-knicks-blue to-knicks-orange transition-all duration-500"
                  style={{ width: `${vibePercent}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
                <span>Pre-game</span>
                <span>Garden shaking</span>
              </div>
            </div>
            <div className="hidden text-center sm:block">
              <span className="display-type block text-4xl leading-none text-knicks-orange">
                {totalHits}
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/35">
                Calls logged
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-white/5 bg-black/20 p-3 text-[10px] leading-relaxed text-white/35">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-white/45" />
            <p>
              Pace yourself, mix in water, and never drink and drive. This is a fan-made,
              simulated experience and is not affiliated with the NBA, Knicks, Spurs, or MSG.
            </p>
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-knicks-orange py-2 text-knicks-navy">
        <div className="flex w-max animate-ticker whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]">
          {[0, 1].map((copy) => (
            <span key={copy}>
              Defense wins championships&nbsp;&nbsp;◆&nbsp;&nbsp;New York forever&nbsp;&nbsp;◆&nbsp;&nbsp;
              Protect the Garden&nbsp;&nbsp;◆&nbsp;&nbsp;Hydrate between quarters&nbsp;&nbsp;◆&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      <footer className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-7 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25 sm:px-6">
        <span>Built for the city that never sits down</span>
        <span className="flex items-center gap-1.5">
          <Info size={11} />
          Scores are simulated
        </span>
      </footer>
    </main>
  );
}

function Team({
  abbreviation,
  city,
  score,
  possession,
  accent = false,
}: {
  abbreviation: string;
  city: string;
  score: number;
  possession: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-5 ${accent ? "" : "flex-row-reverse text-right"}`}>
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-xs font-black sm:h-16 sm:w-16 sm:text-base ${
          accent
            ? "border-knicks-orange bg-knicks-blue text-white shadow-glow"
            : "border-white/20 bg-black/30 text-white/75"
        }`}
      >
        {abbreviation}
      </div>
      <div className="min-w-0">
        <span className="block truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:text-xs">
          {city}
        </span>
        <span
          className={`score-text display-type block text-5xl leading-none sm:text-7xl ${
            accent ? "text-white" : "text-white/65"
          }`}
        >
          {score}
        </span>
        <span
          className={`mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-knicks-orange ${
            accent ? "" : "justify-end"
          } ${possession ? "opacity-100" : "opacity-0"}`}
        >
          <span className="h-1 w-1 rounded-full bg-current" />
          Ball
        </span>
      </div>
    </div>
  );
}
