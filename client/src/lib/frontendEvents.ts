/** Reference style: privacy-conscious frontend analytics boundary; events stay in browser storage until an approved analytics endpoint is configured. */
export type FrontendEventName = "cta_click" | "carousel_navigate" | "carousel_pause" | "story_open";
export type FrontendEvent = { name: FrontendEventName; properties?: Record<string, string | number | boolean>; occurredAt: string };

const STORAGE_KEY = "sopranova_frontend_events";

export function trackFrontendEvent(name: FrontendEventName, properties?: FrontendEvent["properties"]) {
  const event: FrontendEvent = { name, properties, occurredAt: new Date().toISOString() };
  try {
    const previous = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as FrontendEvent[];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...previous.slice(-49), event]));
  } catch {
    // Storage can be unavailable in private browser contexts; interaction must remain unaffected.
  }
  window.dispatchEvent(new CustomEvent("sopranova:frontend-event", { detail: event }));
}
