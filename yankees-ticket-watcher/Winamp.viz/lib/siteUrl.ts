export const siteTitle = "Retro Audio Visualizer — Turn Any Room Into 1999";

export const siteDescription =
  "A free browser-based retro music visualizer. Turn on your microphone, play some music and enjoy a classic late-90s spectrum analyzer.";

export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");

  return "http://localhost:3000";
}
