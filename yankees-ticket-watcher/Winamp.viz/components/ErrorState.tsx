import Link from "next/link";

const MESSAGES: Record<string, { title: string; body: string }> = {
  "microphone-denied": {
    title: "Microphone blocked",
    body: "Allow microphone access in your browser settings, then try again. Demo mode still works."
  },
  "no-microphone": {
    title: "No microphone found",
    body: "Plug in a microphone or use demo mode to explore the visualizers."
  },
  "unsupported-browser": {
    title: "Browser unsupported",
    body: "This browser cannot access a microphone through the Web Audio API. Chrome, Edge, and Safari work best."
  },
  "audio-context-failure": {
    title: "Audio engine failed",
    body: "The browser could not start its audio engine. Refreshing usually fixes it."
  },
  "microphone-unavailable": {
    title: "Microphone unavailable",
    body: "Another app may be using the microphone, or the browser could not open it."
  }
};

export default function ErrorState({ code }: { code: string }) {
  const message = MESSAGES[code] || {
    title: "Something went sideways",
    body: "The visualizer could not start. Demo mode should still work."
  };

  return (
    <div className="crt-shell flex min-h-svh items-center justify-center px-5 text-center">
      <section className="max-w-xl">
        <p className="text-xs uppercase text-[#25f7ff]">VISUALIZE.FM ERROR</p>
        <h1 className="pixel-title mt-4 text-5xl font-black text-[#39ff14]">{message.title}</h1>
        <p className="mt-6 text-white/75">{message.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="bevel px-5 py-3 text-sm font-black uppercase text-[#39ff14]" href="/visualizer?source=demo">
            Demo Mode
          </Link>
          <Link className="bevel px-5 py-3 text-sm font-black uppercase text-white" href="/">
            Back Home
          </Link>
        </div>
      </section>
    </div>
  );
}
