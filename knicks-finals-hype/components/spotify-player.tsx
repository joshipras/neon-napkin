"use client";

import { Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpotifyController = {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  destroy: () => void;
  addListener: (
    event: string,
    callback: (event: { data?: { isPaused?: boolean } }) => void,
  ) => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: number; height: number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

const tracks = [
  {
    title: "Empire State of Mind",
    artist: "JAY-Z, Alicia Keys",
    uri: "spotify:track:2igwFfvr1OAGX9SKDCPBwO",
  },
  {
    title: "N.Y. State of Mind",
    artist: "Nas",
    uri: "spotify:track:0trHOzAhNpGCsGBEu7dOJo",
  },
  {
    title: "Shook Ones, Pt. II",
    artist: "Mobb Deep",
    uri: "spotify:track:33ZXjLCpiINn8eQIDYEPTD",
  },
  {
    title: "Ante Up Remix",
    artist: "M.O.P. and friends",
    uri: "spotify:track:5osSw3tL07Tuid7AWsvYcc",
  },
];

export function SpotifyPlayer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyController | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const currentTrack = tracks[trackIndex];

  useEffect(() => {
    window.onSpotifyIframeApiReady = (api) => {
      if (!mountRef.current || controllerRef.current) return;
      api.createController(
        mountRef.current,
        { uri: tracks[0].uri, width: 1, height: 1 },
        (controller) => {
          controllerRef.current = controller;
          controller.addListener("playback_update", (event) => {
            if (typeof event.data?.isPaused === "boolean") {
              setIsPlaying(!event.data.isPaused);
            }
          });
        },
      );
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  function togglePlay() {
    if (!controllerRef.current) return;
    if (isMuted) setIsMuted(false);
    controllerRef.current.togglePlay();
  }

  function nextTrack() {
    const nextIndex = (trackIndex + 1) % tracks.length;
    setTrackIndex(nextIndex);
    controllerRef.current?.loadUri(tracks[nextIndex].uri);
    if (!isMuted) {
      window.setTimeout(() => controllerRef.current?.play(), 150);
    }
  }

  function toggleMute() {
    if (!controllerRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      controllerRef.current.resume();
    } else {
      setIsMuted(true);
      controllerRef.current.pause();
    }
  }

  return (
    <div className="relative flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 py-1.5 pl-3 pr-1.5">
      <div
        ref={mountRef}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />
      <div className="min-w-0 w-24 sm:w-40">
        <p className="truncate text-[10px] font-black leading-tight text-white">
          {currentTrack.title}
        </p>
        <p className="truncate text-[8px] font-bold uppercase tracking-wider text-white/35">
          {currentTrack.artist}
        </p>
      </div>
      <button
        type="button"
        onClick={togglePlay}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1ed760] text-black transition hover:scale-105"
        aria-label={isPlaying ? "Pause Spotify track" : "Play Spotify track"}
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <button
        type="button"
        onClick={nextTrack}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
        aria-label="Next Spotify track"
      >
        <SkipForward size={14} />
      </button>
      <button
        type="button"
        onClick={toggleMute}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
        aria-label={isMuted ? "Unmute Spotify player" : "Mute Spotify player"}
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}
