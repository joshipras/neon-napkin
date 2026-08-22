export const siteTitle = "Retro Audio Visualizer — Turn Any Room Into 1999";

export const siteDescription =
  "A retro microphone-reactive music visualizer for karaoke, parties and TVs. Play music nearby, turn on your mic and bring the Winamp nostalgia to any screen.";

export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");

  return "http://localhost:3000";
}
