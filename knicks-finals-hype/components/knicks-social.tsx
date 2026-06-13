"use client";

import { ExternalLink, MessageCircle, Radio } from "lucide-react";

export function KnicksSocial() {
  return (
    <section className="relative z-10 mx-auto max-w-4xl px-4 pb-8 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-knicks-orange">
            From the team
          </p>
          <h2 className="display-type text-3xl uppercase sm:text-4xl">
            Knicks Social Wire
          </h2>
        </div>
      </div>

      <a
        href="https://x.com/nyknicks"
        target="_blank"
        rel="noreferrer"
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-[#081d34] shadow-xl transition hover:border-knicks-orange/50"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
            <Radio size={14} className="text-knicks-orange" />
            Official account
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-knicks-orange">
            View latest posts
            <ExternalLink size={12} />
          </span>
        </div>

        <div className="flex items-center gap-4 p-5 sm:p-7">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-knicks-orange bg-knicks-blue text-lg font-black text-white shadow-glow sm:h-16 sm:w-16">
            NYK
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <h3 className="text-lg font-black sm:text-xl">NEW YORK KNICKS</h3>
              <span className="rounded-full bg-knicks-blue px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                Official
              </span>
            </div>
            <p className="text-sm font-semibold text-white/45">@nyknicks</p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Game updates, highlights, lineup news, and the latest posts straight
              from the team.
            </p>
          </div>
          <MessageCircle
            size={22}
            className="hidden shrink-0 text-white/20 transition group-hover:text-knicks-orange sm:block"
          />
        </div>
      </a>

      <p className="mt-2 text-[9px] leading-relaxed text-white/30">
        X currently limits public timeline embeds in some browsers. This card always
        opens the official Knicks feed to its newest post.
      </p>
    </section>
  );
}
