import Link from "next/link";
import LandingPreview from "@/components/LandingPreview";

export default function Home() {
  return (
    <main className="crt-shell relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-8">
      <LandingPreview />
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-50" />
      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        <div className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-normal text-cyan-200">
          <span className="led h-2.5 w-2.5 rounded-full bg-[#39ff14] text-[#39ff14]" />
          LIVE INPUT READY
          <span className="text-white/40">44.1 KHZ</span>
          <span className="text-white/40">STEREO</span>
        </div>

        <h1 className="pixel-title text-[clamp(4.2rem,15vw,13rem)] font-black leading-[0.82] text-[#39ff14]">
          VISUALIZE.FM
        </h1>
        <p className="mt-6 text-xl font-bold uppercase text-white sm:text-3xl">
          Turn any room into 1999.
        </p>

        <div className="mt-9 flex w-full max-w-3xl flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            className="bevel w-full px-7 py-5 text-center text-lg font-black uppercase text-[#39ff14] shadow-glow transition hover:scale-[1.02] hover:text-white sm:w-auto"
            href="/visualizer?source=mic"
          >
            START VISUALIZER
          </Link>
          <Link
            className="bevel w-full px-6 py-4 text-center text-sm font-bold uppercase text-cyan-100 transition hover:text-white sm:w-auto"
            href="/visualizer?source=demo"
          >
            Demo Mode
          </Link>
          <Link
            className="bevel w-full px-6 py-4 text-center text-sm font-bold uppercase text-fuchsia-100 transition hover:text-white sm:w-auto"
            href="/tv"
          >
            TV Mode
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs uppercase text-white/70">
          <span className="bevel px-3 py-2">Use microphone</span>
          <span className="bevel px-3 py-2">Demo mode</span>
          <span className="bevel px-3 py-2">TV Mode</span>
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-6 text-white/72">
          No audio is recorded or uploaded. Your microphone audio stays on your
          device. Nothing is recorded.
        </p>
        <p className="mt-4 max-w-2xl text-[11px] uppercase leading-5 text-white/42">
          Unofficial nostalgia project. Not affiliated with or endorsed by Winamp.
        </p>
      </section>
    </main>
  );
}
