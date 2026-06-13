"use client";

import {
  Bell,
  Beer,
  Check,
  ChevronRight,
  CircleDot,
  Eye,
  Flame,
  Hand,
  Info,
  Map,
  MessageCircle,
  Radio,
  RotateCcw,
  ShieldCheck,
  Star,
  Ticket,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommercialTrivia } from "@/components/commercial-trivia";
import { KnicksSocial } from "@/components/knicks-social";
import { SpotifyPlayer } from "@/components/spotify-player";

type GameState = {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  gameClock: string;
  gameTimeUTC: string;
  gameLabel: string;
  seriesText: string;
  period: number;
  homeTeam: ScoreTeam;
  awayTeam: ScoreTeam;
};

type ScoreTeam = {
  teamCity: string;
  teamName: string;
  teamTricode: string;
  score: number;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string;
  team: {
    location: string;
    name: string;
    abbreviation: string;
    displayName: string;
  };
};

type EspnEvent = {
  id: string;
  date: string;
  status: {
    displayClock: string;
    period: number;
    type: {
      state: "pre" | "in" | "post";
      description: string;
    };
  };
  competitions: Array<{
    competitors: EspnCompetitor[];
    notes?: Array<{ headline?: string }>;
  }>;
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
  {
    id: "celebrity-row",
    title: "Celebrity shown courtside",
    detail: "Toast to New York’s finest people-watching",
    points: 2,
    icon: Star,
    tone: "orange",
  },
  {
    id: "air-ball",
    title: "Opponent shoots an air ball",
    detail: "One sip and the mandatory chant",
    points: 3,
    icon: Hand,
    tone: "blue",
  },
  {
    id: "coach-challenge",
    title: "Coach challenges the call",
    detail: "Predict the result before the replay",
    points: 2,
    icon: Eye,
    tone: "light",
  },
  {
    id: "broadcast-1994",
    title: "Broadcast mentions 1994",
    detail: "Take a nostalgia sip",
    points: 2,
    icon: Ticket,
    tone: "orange",
  },
  {
    id: "timeout-toast",
    title: "Knicks force a timeout",
    detail: "Raise your drink to the defense",
    points: 4,
    icon: Beer,
    tone: "blue",
  },
  {
    id: "group-chat",
    title: "Group chat gets reckless",
    detail: "Read the best message out loud",
    points: 1,
    icon: MessageCircle,
    tone: "light",
  },
];

function mapScoreTeam(team: EspnCompetitor): ScoreTeam {
  return {
    teamCity: team.team.location,
    teamName: team.team.name,
    teamTricode:
      team.team.displayName === "New York Knicks"
        ? "NYK"
        : team.team.displayName === "San Antonio Spurs"
          ? "SAS"
          : team.team.abbreviation,
    score: Number(team.score || 0),
  };
}

function mapScoreboard(data: { events?: EspnEvent[] }): GameState | null {
  const event = data.events?.find((candidate) =>
    candidate.competitions[0]?.competitors.some(
      (competitor) => competitor.team.displayName === "New York Knicks",
    ),
  );
  if (!event) return null;

  const competition = event.competitions[0];
  const home = competition.competitors.find((team) => team.homeAway === "home");
  const away = competition.competitors.find((team) => team.homeAway === "away");
  if (!home || !away) return null;

  const statusMap = { pre: 1, in: 2, post: 3 } as const;
  const headline = competition.notes?.[0]?.headline ?? "";
  return {
    gameId: event.id,
    gameStatus: statusMap[event.status.type.state],
    gameStatusText: event.status.type.description,
    gameClock: event.status.displayClock,
    gameTimeUTC: event.date,
    gameLabel: headline || "NBA game",
    seriesText: headline,
    period: event.status.period,
    homeTeam: mapScoreTeam(home),
    awayTeam: mapScoreTeam(away),
  };
}

export function GameNight() {
  const [game, setGame] = useState<GameState | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [scoreError, setScoreError] = useState(false);
  const [scoreUpdatedAt, setScoreUpdatedAt] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [zeroProof, setZeroProof] = useState(false);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [lastHit, setLastHit] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<"vibe" | "trivia">("vibe");
  const [gardenWinner, setGardenWinner] = useState(false);

  useEffect(() => {
    async function refreshScore() {
      try {
        const response = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Score unavailable");
        const data = (await response.json()) as { events?: EspnEvent[] };
        setGame(mapScoreboard(data));
        setScoreUpdatedAt(new Date().toISOString());
        setScoreError(false);
      } catch {
        setScoreError(true);
      } finally {
        setScoreLoading(false);
      }
    }

    refreshScore();
    const timer = window.setInterval(refreshScore, 15000);
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
  const knicksTeam = game
    ? game.homeTeam.teamTricode === "NYK"
      ? game.homeTeam
      : game.awayTeam
    : null;
  const opponentTeam = game
    ? game.homeTeam.teamTricode === "NYK"
      ? game.awayTeam
      : game.homeTeam
    : null;

  useEffect(() => {
    if (vibePercent >= 100) setGardenWinner(true);
  }, [vibePercent]);

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
    setGardenWinner(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-16">
      <div className="stadium-lights pointer-events-none absolute inset-0" />
      <div className="court-lines pointer-events-none absolute inset-0" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:px-6">
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

          <div className="order-3 flex w-full min-w-0 items-center justify-end gap-2 sm:order-none sm:w-auto">
            <SpotifyPlayer />
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
              {game?.gameStatus === 2 ? "NBA Live" : "NBA Score Feed"}
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-9 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/45 sm:hidden">
          <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-emerald-300" />
          {game?.gameStatus === 2 ? "NBA Live" : "NBA Score Feed"}
        </div>

        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#061528]/80 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 sm:px-7">
            <span className="flex items-center gap-2">
              <CircleDot size={13} className="text-knicks-orange" />
              {game?.gameLabel || "Live NBA scoreboard"}
            </span>
            <span>{game?.seriesText || "Updates every 15 seconds"}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-7 sm:gap-10 sm:px-12 sm:py-10">
            <Team
              abbreviation="NYK"
              city="New York"
              score={knicksTeam?.score}
              accent
            />

            <div className="flex min-w-20 flex-col items-center sm:min-w-28">
              <span className="rounded bg-knicks-orange px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-knicks-navy">
                {scoreLoading
                  ? "Connecting"
                  : scoreError
                    ? "Offline"
                    : game?.gameStatusText || "No game today"}
              </span>
              <span className="score-text mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                {game?.gameStatus === 2
                  ? game.gameClock || `Q${game.period}`
                  : game
                    ? game.gameStatus === 1
                      ? new Date(game.gameTimeUTC).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "FINAL"
                    : "—"}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                {scoreUpdatedAt
                  ? `Checked ${new Date(scoreUpdatedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Live scoreboard data"}
              </span>
            </div>

            <Team
              abbreviation={opponentTeam?.teamTricode || "OPP"}
              city={opponentTeam?.teamCity || "Opponent"}
              score={opponentTeam?.score}
            />
          </div>

        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <div className="mb-6 overflow-hidden rounded-xl border-2 border-white/15 bg-black shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Map size={14} className="text-white/50" />
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/50">
                  Garden Games Subway
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                Select a line
              </span>
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveGame("vibe")}
                className={`flex items-center gap-3 border-b border-white/10 px-4 py-4 text-left transition min-[380px]:border-b-0 min-[380px]:border-r sm:px-6 ${
                  activeGame === "vibe" ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="route-bullet bg-[#B933AD] text-white">7</span>
                <span>
                  <span className="block text-sm font-black">Vibe Local</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">
                    Live game cues
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGame("trivia")}
                className={`flex items-center gap-3 px-4 py-4 text-left transition sm:px-6 ${
                  activeGame === "trivia" ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="route-bullet bg-[#fccc0a] text-black">Q</span>
                <span>
                  <span className="block text-sm font-black">Trivia Express</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">
                    Commercial breaks
                  </span>
                </span>
              </button>
            </div>
            <div className="h-1 bg-gradient-to-r from-knicks-orange from-50% to-[#fccc0a] to-50%" />
          </div>

          {activeGame === "trivia" ? (
            <CommercialTrivia />
          ) : (
          <>
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

          <div className="mb-5 rounded-xl border border-knicks-orange/20 bg-gradient-to-r from-knicks-orange/10 to-knicks-blue/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                  Current status
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-black">
                  <Flame size={17} className="text-knicks-orange" fill="currentColor" />
                  {vibePercent >= 100
                    ? "Garden shaking"
                    : vibePercent >= 65
                      ? "Unhinged"
                      : vibePercent >= 40
                        ? "Electric"
                        : "Heating up"}
                </p>
              </div>
            <button
              type="button"
              onClick={() => setZeroProof((value) => !value)}
              className={`flex items-center gap-3 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
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
            <div className="mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-knicks-blue to-knicks-orange transition-all duration-500"
                  style={{ width: `${vibePercent}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
                <span>{totalHits} calls logged</span>
                <span>Garden shaking</span>
              </div>
            </div>
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

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-white/5 bg-black/20 p-3 text-[10px] leading-relaxed text-white/35">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-white/45" />
            <p>
              Pace yourself, mix in water, and never drink and drive. This is a fan-made,
              simulated experience and is not affiliated with the NBA, Knicks, Spurs, or MSG.
            </p>
          </div>
          </>
          )}
        </div>
      </section>

      {gardenWinner && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-knicks-navy/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-knicks-orange bg-[#081d34] text-center shadow-glow">
            <div className="bg-knicks-orange px-5 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-knicks-navy">
              First train has arrived
            </div>
            <div className="p-7 sm:p-9">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-knicks-orange text-knicks-navy">
                <Trophy size={30} />
              </span>
              <h2 className="display-type mt-5 text-5xl uppercase">
                Garden Shaking
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                First person to show this screen gets a drink bought by the group.
                Honor system, New York rules.
              </p>
              <button
                type="button"
                onClick={resetGame}
                className="mt-6 w-full rounded-full bg-white px-5 py-3.5 text-xs font-black uppercase tracking-wider text-knicks-navy transition hover:bg-knicks-orange"
              >
                Drink secured · reset bar
              </button>
            </div>
          </div>
        </div>
      )}

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

      <KnicksSocial />

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-7 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Built for the city that never sits down</span>
        <span className="flex items-center gap-1.5">
          <Info size={11} />
          Scores update from a live NBA scoreboard feed
        </span>
      </footer>
      <p className="relative z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[9px] font-medium tracking-wide text-white/20">
        All rights reserved © Prasanna Joshi 2026
      </p>
    </main>
  );
}

function Team({
  abbreviation,
  city,
  score,
  accent = false,
}: {
  abbreviation: string;
  city: string;
  score?: number;
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
          {score ?? "—"}
        </span>
      </div>
    </div>
  );
}
