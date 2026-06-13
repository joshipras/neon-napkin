"use client";

import { ExternalLink } from "lucide-react";
import Script from "next/script";

export function KnicksSocial() {
  return (
    <section className="relative z-10 mx-auto max-w-4xl px-4 pb-8 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-knicks-orange">
            From the team
          </p>
          <h2 className="display-type text-3xl uppercase sm:text-4xl">
            Latest from @NYKnicks
          </h2>
        </div>
        <a
          href="https://x.com/nyknicks"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/45 hover:text-white"
        >
          Open on X
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="min-h-40 overflow-hidden rounded-2xl border border-white/10 bg-white p-3 text-black">
        <a
          className="twitter-timeline"
          data-theme="light"
          data-chrome="noheader nofooter noborders transparent"
          data-tweet-limit="1"
          href="https://twitter.com/nyknicks"
        >
          Loading the latest official Knicks post…
        </a>
        <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-white/30">
        X controls the embedded feed. Browser privacy settings or login requirements may
        replace the post with a link to the official account.
      </p>
    </section>
  );
}
