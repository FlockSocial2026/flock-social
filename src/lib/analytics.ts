export type AnalyticsEvent = {
  event: string;
  at: string;
  props?: Record<string, unknown>;
};

const KEY = "flock_analytics_events";

export function track(event: string, props?: Record<string, unknown>) {
  const payload: AnalyticsEvent = { event, at: new Date().toISOString(), props };

  // lightweight local telemetry buffer
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    parsed.push(payload);
    // keep bounded
    localStorage.setItem(KEY, JSON.stringify(parsed.slice(-500)));
  } catch {
    // no-op in environments without localStorage
  }

  // visible debug trail for quick diagnosis in browser devtools
  console.log("[analytics]", payload);
}

export function readTrackedEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}
