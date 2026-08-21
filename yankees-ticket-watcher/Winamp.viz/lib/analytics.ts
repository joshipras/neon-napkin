type ProductEvent =
  | "visualizer_started"
  | "demo_started"
  | "fullscreen_started"
  | "preset_changed"
  | "tv_mode_started"
  | "phone_paired";

export function track(event: ProductEvent, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "1") return;

  const payload = { event, properties, timestamp: Date.now() };
  window.dispatchEvent(new CustomEvent("visualize:analytics", { detail: payload }));

  const va = window.va;
  if (typeof va === "function") {
    va("event", event, properties);
  }
}

declare global {
  interface Window {
    va?: (command: "event", name: string, properties?: Record<string, string | number | boolean>) => void;
  }
}
