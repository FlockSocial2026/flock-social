import type { getModerationSummary } from "@/lib/moderationSummary";

type Summary = Awaited<ReturnType<typeof getModerationSummary>>;

function alertLabels(summary: Summary) {
  const labels: string[] = [];
  if (summary.alerts.openBacklogHigh) labels.push("open-backlog-high");
  if (summary.alerts.newReportsSpike) labels.push("new-reports-spike");
  if (summary.alerts.userReportsSpike) labels.push("user-report-spike");
  return labels;
}

export function formatModerationAlert(summary: Summary) {
  const labels = alertLabels(summary);
  const severity = summary.backlog >= summary.thresholds.openWarn * 2 ? "critical" : labels.length ? "warning" : "info";

  const lines = [
    `Flock moderation ${severity.toUpperCase()} alert`,
    `window=${summary.windowHours}h backlog=${summary.backlog} new=${summary.recent.total}`,
    `targets: post=${summary.recent.byTarget.post} comment=${summary.recent.byTarget.comment} user=${summary.recent.byTarget.user}`,
    `status: open=${summary.recent.byStatus.open} reviewing=${summary.recent.byStatus.reviewing} resolved=${summary.recent.byStatus.resolved} dismissed=${summary.recent.byStatus.dismissed}`,
    `flags: ${labels.length ? labels.join(",") : "none"}`,
    `generatedAt=${summary.generatedAt}`,
  ];

  return { severity, labels, text: lines.join("\n") };
}

export async function sendModerationAlert(summary: Summary) {
  const webhook = process.env.MODERATION_ALERT_WEBHOOK_URL;
  if (!webhook) return { delivered: false, reason: "No MODERATION_ALERT_WEBHOOK_URL configured" };

  const payload = formatModerationAlert(summary);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "moderation.summary.alert",
      severity: payload.severity,
      labels: payload.labels,
      text: payload.text,
      summary,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { delivered: false, reason: `Webhook error ${res.status}: ${body.slice(0, 200)}` };
  }

  return { delivered: true as const, reason: "sent" };
}
