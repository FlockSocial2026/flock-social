import type { getModerationSummary } from "@/lib/moderationSummary";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Summary = Awaited<ReturnType<typeof getModerationSummary>>;
type AlertSeverity = "info" | "warning" | "critical";
type AlertChannel = "generic" | "slack" | "discord";

function alertLabels(summary: Summary) {
  const labels: string[] = [];
  if (summary.alerts.openBacklogHigh) labels.push("open-backlog-high");
  if (summary.alerts.newReportsSpike) labels.push("new-reports-spike");
  if (summary.alerts.userReportsSpike) labels.push("user-report-spike");
  return labels;
}

function getAlertChannel(): AlertChannel {
  const raw = (process.env.MODERATION_ALERT_CHANNEL || "generic").trim().toLowerCase();
  if (raw === "slack" || raw === "discord" || raw === "generic") return raw;
  return "generic";
}

function getAlertCooldownMinutes() {
  const minutes = Number(process.env.MODERATION_ALERT_COOLDOWN_MINUTES || 60);
  return Number.isFinite(minutes) ? Math.max(1, minutes) : 60;
}

function makeAlertKey(summary: Summary, severity: AlertSeverity, labels: string[]) {
  return [
    severity,
    labels.length ? labels.slice().sort().join("+") : "none",
    `window-${summary.windowHours}h`,
  ].join("|");
}

export function formatModerationAlert(summary: Summary) {
  const labels = alertLabels(summary);
  const severity: AlertSeverity = summary.backlog >= summary.thresholds.openWarn * 2 ? "critical" : labels.length ? "warning" : "info";

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

function buildWebhookPayload(channel: AlertChannel, base: ReturnType<typeof formatModerationAlert>, summary: Summary, alertKey: string) {
  if (channel === "slack") {
    return {
      text: base.text,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Flock Moderation Alert · ${base.severity.toUpperCase()}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*Window:* ${summary.windowHours}h`,
              `*Backlog:* ${summary.backlog}`,
              `*New reports:* ${summary.recent.total}`,
              `*Flags:* ${base.labels.length ? base.labels.join(", ") : "none"}`,
            ].join("\n"),
          },
        },
      ],
      metadata: {
        event_type: "moderation.summary.alert",
        event_payload: {
          alertKey,
          severity: base.severity,
        },
      },
    };
  }

  if (channel === "discord") {
    const color = base.severity === "critical" ? 0xe74c3c : base.severity === "warning" ? 0xf39c12 : 0x3498db;
    return {
      content: `Flock moderation ${base.severity.toUpperCase()} alert`,
      embeds: [
        {
          title: "Moderation Summary",
          color,
          fields: [
            { name: "Window", value: `${summary.windowHours}h`, inline: true },
            { name: "Backlog", value: String(summary.backlog), inline: true },
            { name: "New reports", value: String(summary.recent.total), inline: true },
            { name: "Flags", value: base.labels.length ? base.labels.join(", ") : "none" },
          ],
          timestamp: summary.generatedAt,
        },
      ],
      allowed_mentions: { parse: [] },
    };
  }

  return {
    type: "moderation.summary.alert",
    alertKey,
    severity: base.severity,
    labels: base.labels,
    text: base.text,
    summary,
  };
}

async function isInCooldown(alertKey: string, cooldownMinutes: number) {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("moderation_alert_events")
    .select("id,delivered_at")
    .eq("alert_key", alertKey)
    .gte("delivered_at", since)
    .order("delivered_at", { ascending: false })
    .limit(1);

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return { inCooldown: false as const, reason: "alert-events-table-missing" };
    }
    throw new Error(`Cooldown query failed: ${error.message}`);
  }

  return { inCooldown: Boolean(data?.length), reason: "ok" };
}

async function recordAlertEvent(alertKey: string, severity: AlertSeverity, labels: string[], channel: AlertChannel, payload: unknown) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("moderation_alert_events").insert({
    alert_key: alertKey,
    severity,
    labels,
    channel,
    payload,
  });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) return;
    throw new Error(`Failed to record alert event: ${error.message}`);
  }
}

export async function sendModerationAlert(summary: Summary) {
  const webhook = process.env.MODERATION_ALERT_WEBHOOK_URL;
  if (!webhook) return { delivered: false, reason: "No MODERATION_ALERT_WEBHOOK_URL configured" };

  const channel = getAlertChannel();
  const cooldownMinutes = getAlertCooldownMinutes();
  const basePayload = formatModerationAlert(summary);
  const alertKey = makeAlertKey(summary, basePayload.severity, basePayload.labels);

  const cooldown = await isInCooldown(alertKey, cooldownMinutes);
  if (cooldown.inCooldown) {
    return {
      delivered: false,
      reason: `Skipped duplicate alert (cooldown ${cooldownMinutes}m, key=${alertKey})`,
    };
  }

  const payload = buildWebhookPayload(channel, basePayload, summary, alertKey);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    return { delivered: false, reason: `Webhook error ${res.status}: ${body.slice(0, 200)}` };
  }

  await recordAlertEvent(alertKey, basePayload.severity, basePayload.labels, channel, payload);

  return {
    delivered: true as const,
    reason:
      cooldown.reason === "alert-events-table-missing"
        ? "sent (cooldown table missing; dedupe disabled)"
        : "sent",
  };
}
