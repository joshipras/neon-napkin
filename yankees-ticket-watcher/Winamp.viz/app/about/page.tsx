import Link from "next/link";

export const metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <main className="crt-shell min-h-svh px-5 py-10">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm uppercase text-[#39ff14]" href="/">
          VISUALIZE.FM
        </Link>
        <h1 className="pixel-title mt-8 text-6xl font-black text-[#39ff14]">
          ABOUT
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-white/80">
          <p>
            Visualize.fm is a fullscreen retro music visualizer for parties,
            karaoke, bars, living rooms, and TVs. It listens through your browser
            microphone and turns volume, frequency bands, waveforms, and beats
            into reactive visuals.
          </p>
          <p>
            Local microphone mode analyzes audio with the Web Audio API in your
            browser. The microphone signal is never played through speakers,
            recorded, uploaded, or sent to analytics.
          </p>
          <p>
            TV Mode is designed so a phone can analyze audio locally and send
            only lightweight numerical features to the display. It never sends
            raw microphone audio.
          </p>
          <p className="text-sm uppercase leading-6 text-white/50">
            Unofficial nostalgia project. Not affiliated with or endorsed by Winamp.
          </p>
        </div>
        <Link
          className="bevel mt-10 inline-flex px-5 py-3 text-sm font-black uppercase text-[#39ff14]"
          href="/visualizer?source=mic"
        >
          Start Visualizer
        </Link>
      </section>
    </main>
  );
}
