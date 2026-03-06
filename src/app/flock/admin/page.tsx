"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MemberRow = { id: string; user_id: string; role: "member" | "group_leader" | "pastor_staff" | "church_admin"; created_at: string };
type RoleAuditRow = { id: string; actor_user_id: string; target_user_id: string; old_role: string; new_role: string; changed_at: string };
type EventAttendanceRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  rsvp_summary: { going: number; maybe: number; not_going: number; total: number };
};

type DispatchLogItem = {
  id: string;
  eventId?: string | null;
  eventTitle: string;
  audience: string;
  cadence: "T-72h" | "T-24h" | "T-2h";
  createdAt: string;
};

type ConversionTimelineItem = {
  event_id: string;
  title: string;
  starts_at: string;
  going: number;
  maybe: number;
  not_going: number;
  total: number;
  maybe_to_going_pct: number | null;
};

type TimelineSource = "snapshot" | "live" | "none";

type OpsHealth = {
  generatedAt: string;
  snapshot: { latestAt: string | null; ageMin: number | null; healthy: boolean };
  dispatchLast24h: {
    total: number;
    cadence: { "T-72h": number; "T-24h": number; "T-2h": number };
    audience: Record<string, number>;
  };
  upcomingEvents: { next24h: number; next72h: number };
};

type OpsGuidance = {
  guidance: {
    snapshotFreshness: { healthyMinutes: number; healthyMeaning: string; staleMeaning: string };
    dispatchCoverage: Record<string, string>;
    recommendedActions: string[];
  };
  generatedAt: string;
};

type OpsAlert = { level: "info" | "warning" | "critical"; key: string; message: string; action: string };

type OpsAlertsPayload = {
  generatedAt: string;
  alerts: OpsAlert[];
};

type OpsSummaryPayload = {
  generatedAt: string;
  status: { healthy: boolean; criticalCount: number; warningCount: number };
};

type OpsIncidentsPayload = {
  generatedAt: string;
  openCount: number;
  incidents: Array<{ id: string; severity: "critical" | "warning"; summary: string; action: string }>;
};

type OpsNextActionsPayload = {
  generatedAt: string;
  total: number;
  items: Array<{ priority: "P0" | "P1" | "P2"; key: string; action: string }>;
};

type OpsEscalationsPayload = {
  generatedAt: string;
  level: "none" | "watch" | "escalate";
  counts: { critical: number; warning: number };
  protocol: string[];
};

type OpsDailyBriefPayload = {
  generatedAt: string;
  headline: string;
  metrics: { healthy: boolean; critical: number; warning: number; openIncidents: number };
  topActions: Array<{ priority: "P0" | "P1" | "P2"; key: string; action: string }>;
};

type OpsRunbookPayload = {
  generatedAt: string;
  level: "none" | "watch" | "escalate";
  checklist: Array<{ id: string; type: "protocol" | "action"; text: string }>;
};

type OpsHandoffPayload = {
  generatedAt: string;
  handoffText: string;
};

type OpsHandoffMarkdownPayload = {
  generatedAt: string;
  markdown: string;
};

type OpsPacketPayload = {
  generatedAt: string;
  packetVersion: string;
  packet: {
    summary: { status?: { criticalCount?: number; warningCount?: number; healthy?: boolean } };
    incidents: { openCount?: number };
    runbook: { level?: string };
  };
};

type OpsSnapshotPayload = {
  generatedAt: string;
  snapshot: { healthy: boolean; critical: number; warning: number; openIncidents: number; runbookLevel: string };
  compactText: string;
};

type OpsExecutiveUpdatePayload = {
  generatedAt: string;
  status: { healthy: boolean; critical: number; warning: number; openIncidents: number; runbookLevel: string };
  headline: string;
  topActions: string[];
  concise: string[];
  reportText: string;
};

type OpsHourlyReportPayload = {
  generatedAt: string;
  dispatchCount: number;
  cadence: { "T-72h": number; "T-24h": number; "T-2h": number };
  timelineSampleSize: number;
  averageMaybeToGoingPct: number;
  topActions: string[];
  report: string;
};

type OpsOvernightReportPayload = {
  generatedAt: string;
  snapshot: { healthy: boolean; critical: number; warning: number; openIncidents: number; runbookLevel: string };
  dailyBriefHeadline: string;
  packetVersion: string;
  topActions: Array<{ priority: string; action: string }>;
  report: string;
};

type OpsReportBundlePayload = {
  generatedAt: string;
  posture: { healthy: boolean; critical: number; warning: number; openIncidents: number; runbookLevel: string };
  summaryLine: string;
  bundle: {
    executive: { headline: string; reportText: string; topActions: string[] };
    hourly: { report: string; dispatchCount: number; timelineSampleSize: number };
    overnight: { report: string; packetVersion: string; topActions: Array<{ priority: string; action: string }> };
  };
};

type OpsReportBundleMarkdownPayload = {
  generatedAt: string;
  markdown: string;
};

type OpsReportBundleBriefPayload = {
  generatedAt: string;
  brief: string;
  maxLen: number;
};

type OpsReportBundleSlackPayload = {
  generatedAt: string;
  text: string;
  blocks: Array<{ type: string; text?: { type: string; text: string } }>;
};

type OpsReportBundleDiscordPayload = {
  generatedAt: string;
  content: string;
  embeds: Array<{ title?: string; description?: string }>;
};

type OpsReportBundleTelegramPayload = {
  generatedAt: string;
  parseMode: string;
  text: string;
};

type OpsReportBundleEmailPayload = {
  generatedAt: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  markdown: string;
};

type OpsReportBundleWebhookPayload = {
  generatedAt: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
};

type OpsReportBundlePlainPayload = {
  generatedAt: string;
  lines: string[];
  text: string;
  charCount: number;
};

type OpsReportBundleWhatsAppPayload = {
  generatedAt: string;
  text: string;
  charCount: number;
};

type OpsReportBundleSmsPayload = {
  generatedAt: string;
  sms: string;
  charCount: number;
  segmentsEstimate: number;
};

type OpsReportBundleSignalPayload = {
  generatedAt: string;
  text: string;
  brief: string;
  charCount: number;
};

type OpsReportBundleIMessagePayload = {
  generatedAt: string;
  bubble: string;
  brief: string;
  charCount: number;
};

export default function FlockAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roleAudit, setRoleAudit] = useState<RoleAuditRow[]>([]);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pilotMetrics, setPilotMetrics] = useState<Record<string, number> | null>(null);
  const [pilotTrends, setPilotTrends] = useState<Record<string, { current: number; previous: number; diff: number; pct: number | null }> | null>(null);
  const [eventAttendance, setEventAttendance] = useState<EventAttendanceRow[]>([]);
  const dispatchStorageKey = "flock_admin_dispatch_log_v1";
  const [dispatchLog, setDispatchLog] = useState<DispatchLogItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(dispatchStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as DispatchLogItem[];
      return Array.isArray(parsed) ? parsed.slice(0, 200) : [];
    } catch {
      return [];
    }
  });
  const [msg, setMsg] = useState("");
  const [conversionTimeline, setConversionTimeline] = useState<ConversionTimelineItem[]>([]);
  const [timelineSource, setTimelineSource] = useState<TimelineSource>("none");
  const [timelineGeneratedAt, setTimelineGeneratedAt] = useState<string | null>(null);
  const [dispatchCadenceFilter, setDispatchCadenceFilter] = useState<"all" | "T-72h" | "T-24h" | "T-2h">("all");
  const [dispatchAudienceFilter, setDispatchAudienceFilter] = useState("all");
  const [opsHealth, setOpsHealth] = useState<OpsHealth | null>(null);
  const [opsGuidance, setOpsGuidance] = useState<OpsGuidance | null>(null);
  const [opsAlerts, setOpsAlerts] = useState<OpsAlertsPayload | null>(null);
  const [opsSummary, setOpsSummary] = useState<OpsSummaryPayload | null>(null);
  const [opsIncidents, setOpsIncidents] = useState<OpsIncidentsPayload | null>(null);
  const [opsNextActions, setOpsNextActions] = useState<OpsNextActionsPayload | null>(null);
  const [opsEscalations, setOpsEscalations] = useState<OpsEscalationsPayload | null>(null);
  const [opsDailyBrief, setOpsDailyBrief] = useState<OpsDailyBriefPayload | null>(null);
  const [opsRunbook, setOpsRunbook] = useState<OpsRunbookPayload | null>(null);
  const [opsHandoff, setOpsHandoff] = useState<OpsHandoffPayload | null>(null);
  const [opsHandoffMarkdown, setOpsHandoffMarkdown] = useState<OpsHandoffMarkdownPayload | null>(null);
  const [opsPacket, setOpsPacket] = useState<OpsPacketPayload | null>(null);
  const [opsSnapshot, setOpsSnapshot] = useState<OpsSnapshotPayload | null>(null);
  const [opsExecutiveUpdate, setOpsExecutiveUpdate] = useState<OpsExecutiveUpdatePayload | null>(null);
  const [opsHourlyReport, setOpsHourlyReport] = useState<OpsHourlyReportPayload | null>(null);
  const [opsOvernightReport, setOpsOvernightReport] = useState<OpsOvernightReportPayload | null>(null);
  const [opsReportBundle, setOpsReportBundle] = useState<OpsReportBundlePayload | null>(null);
  const [opsReportBundleMarkdown, setOpsReportBundleMarkdown] = useState<OpsReportBundleMarkdownPayload | null>(null);
  const [opsReportBundleBrief, setOpsReportBundleBrief] = useState<OpsReportBundleBriefPayload | null>(null);
  const [opsReportBundleSlack, setOpsReportBundleSlack] = useState<OpsReportBundleSlackPayload | null>(null);
  const [opsReportBundleDiscord, setOpsReportBundleDiscord] = useState<OpsReportBundleDiscordPayload | null>(null);
  const [opsReportBundleTelegram, setOpsReportBundleTelegram] = useState<OpsReportBundleTelegramPayload | null>(null);
  const [opsReportBundleEmail, setOpsReportBundleEmail] = useState<OpsReportBundleEmailPayload | null>(null);
  const [opsReportBundleWebhook, setOpsReportBundleWebhook] = useState<OpsReportBundleWebhookPayload | null>(null);
  const [opsReportBundlePlain, setOpsReportBundlePlain] = useState<OpsReportBundlePlainPayload | null>(null);
  const [opsReportBundleWhatsApp, setOpsReportBundleWhatsApp] = useState<OpsReportBundleWhatsAppPayload | null>(null);
  const [opsReportBundleSms, setOpsReportBundleSms] = useState<OpsReportBundleSmsPayload | null>(null);
  const [opsReportBundleSignal, setOpsReportBundleSignal] = useState<OpsReportBundleSignalPayload | null>(null);
  const [opsReportBundleIMessage, setOpsReportBundleIMessage] = useState<OpsReportBundleIMessagePayload | null>(null);

  const loadMembers = async (t: string) => {
    const res = await fetch("/api/flock/members?page=1&pageSize=100", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setMembers((json.items ?? []) as MemberRow[]);
  };

  const loadRoleAudit = async (t: string) => {
    const res = await fetch("/api/flock/role-audit?page=1&pageSize=20", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setRoleAudit((json.items ?? []) as RoleAuditRow[]);
  };

  const loadPilotMetrics = async (scopeChurchId?: string | null) => {
    const qs = scopeChurchId ? `?churchId=${encodeURIComponent(scopeChurchId)}` : "";
    const res = await fetch(`/api/metrics/pilot-summary${qs}`);
    if (!res.ok) return;
    const json = await res.json();
    setPilotMetrics(json.metrics ?? null);
    setPilotTrends(json.trends ?? null);
  };

  const loadEventAttendance = async (t: string) => {
    const res = await fetch("/api/flock/events?page=1&pageSize=50", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setEventAttendance((json.items ?? []) as EventAttendanceRow[]);
  };

  const loadDispatchLogs = async (t: string, filters?: { cadence?: string; audience?: string }) => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (filters?.cadence && filters.cadence !== "all") params.set("cadence", filters.cadence);
    if (filters?.audience && filters.audience !== "all") params.set("audience", filters.audience);

    const res = await fetch(`/api/flock/dispatch-logs?${params.toString()}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    const items = ((json.items ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id ?? ""),
      eventId: item.event_id ? String(item.event_id) : null,
      eventTitle: String(item.event_title ?? "(event)"),
      audience: String(item.audience ?? "all"),
      cadence: String(item.cadence ?? "T-24h") as "T-72h" | "T-24h" | "T-2h",
      createdAt: String(item.created_at ?? new Date().toISOString()),
    }));
    setDispatchLog(items);
  };

  const loadConversionTimeline = async (t: string) => {
    const res = await fetch("/api/flock/conversion-timeline?limit=12", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setConversionTimeline((json.items ?? []) as ConversionTimelineItem[]);
    setTimelineSource((json.source ?? "none") as TimelineSource);
    setTimelineGeneratedAt(json.generatedAt ?? null);
  };

  const loadOpsHealth = async (t: string) => {
    const res = await fetch("/api/flock/ops-health", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsHealth((json ?? null) as OpsHealth | null);
  };

  const loadOpsGuidance = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/explain", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsGuidance((json ?? null) as OpsGuidance | null);
  };

  const loadOpsAlerts = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/alerts", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsAlerts((json ?? null) as OpsAlertsPayload | null);
  };

  const loadOpsSummary = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/summary", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsSummary((json ?? null) as OpsSummaryPayload | null);
  };

  const loadOpsIncidents = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/incidents", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsIncidents((json ?? null) as OpsIncidentsPayload | null);
  };

  const loadOpsNextActions = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/next-actions", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsNextActions((json ?? null) as OpsNextActionsPayload | null);
  };

  const loadOpsEscalations = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/escalations", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsEscalations((json ?? null) as OpsEscalationsPayload | null);
  };

  const loadOpsDailyBrief = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/daily-brief", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsDailyBrief((json ?? null) as OpsDailyBriefPayload | null);
  };

  const loadOpsRunbook = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/runbook", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsRunbook((json ?? null) as OpsRunbookPayload | null);
  };

  const loadOpsHandoff = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/handoff", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsHandoff((json ?? null) as OpsHandoffPayload | null);
  };

  const loadOpsHandoffMarkdown = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/handoff/markdown", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsHandoffMarkdown((json ?? null) as OpsHandoffMarkdownPayload | null);
  };

  const loadOpsPacket = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/packet", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsPacket((json ?? null) as OpsPacketPayload | null);
  };

  const loadOpsSnapshot = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/snapshot", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsSnapshot((json ?? null) as OpsSnapshotPayload | null);
  };

  const loadOpsExecutiveUpdate = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/executive-update", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsExecutiveUpdate((json ?? null) as OpsExecutiveUpdatePayload | null);
  };

  const loadOpsHourlyReport = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/hourly-report", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsHourlyReport((json ?? null) as OpsHourlyReportPayload | null);
  };

  const loadOpsOvernightReport = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/overnight-report", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsOvernightReport((json ?? null) as OpsOvernightReportPayload | null);
  };

  const loadOpsReportBundle = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundle((json ?? null) as OpsReportBundlePayload | null);
  };

  const loadOpsReportBundleMarkdown = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/markdown", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleMarkdown((json ?? null) as OpsReportBundleMarkdownPayload | null);
  };

  const loadOpsReportBundleBrief = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/brief", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleBrief((json ?? null) as OpsReportBundleBriefPayload | null);
  };

  const loadOpsReportBundleSlack = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/slack", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleSlack((json ?? null) as OpsReportBundleSlackPayload | null);
  };

  const loadOpsReportBundleDiscord = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/discord", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleDiscord((json ?? null) as OpsReportBundleDiscordPayload | null);
  };

  const loadOpsReportBundleTelegram = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/telegram", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleTelegram((json ?? null) as OpsReportBundleTelegramPayload | null);
  };

  const loadOpsReportBundleEmail = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/email", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleEmail((json ?? null) as OpsReportBundleEmailPayload | null);
  };

  const loadOpsReportBundleWebhook = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/webhook", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleWebhook((json ?? null) as OpsReportBundleWebhookPayload | null);
  };

  const loadOpsReportBundlePlain = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/plain", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundlePlain((json ?? null) as OpsReportBundlePlainPayload | null);
  };

  const loadOpsReportBundleWhatsApp = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/whatsapp", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleWhatsApp((json ?? null) as OpsReportBundleWhatsAppPayload | null);
  };

  const loadOpsReportBundleSms = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/sms", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleSms((json ?? null) as OpsReportBundleSmsPayload | null);
  };

  const loadOpsReportBundleSignal = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/signal", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleSignal((json ?? null) as OpsReportBundleSignalPayload | null);
  };

  const loadOpsReportBundleIMessage = async (t: string) => {
    const res = await fetch("/api/flock/ops-health/report-bundle/imessage", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setOpsReportBundleIMessage((json ?? null) as OpsReportBundleIMessagePayload | null);
  };

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      setToken(t);

      const res = await fetch("/api/flock/roles/me", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      setRole(json.role ?? null);

      const churchRes = await fetch("/api/flock/church", { headers: { Authorization: `Bearer ${t}` } });
      const churchJson = await churchRes.json();
      const cid = churchJson?.church?.id ?? null;
      setChurchId(cid);

      await loadMembers(t);
      await loadRoleAudit(t);
      await loadPilotMetrics(cid);
      await loadEventAttendance(t);
      await loadDispatchLogs(t, { cadence: dispatchCadenceFilter, audience: dispatchAudienceFilter });
      await loadConversionTimeline(t);
      await loadOpsHealth(t);
      await loadOpsGuidance(t);
      await loadOpsAlerts(t);
      await loadOpsSummary(t);
      await loadOpsIncidents(t);
      await loadOpsNextActions(t);
      await loadOpsEscalations(t);
      await loadOpsDailyBrief(t);
      await loadOpsRunbook(t);
      await loadOpsHandoff(t);
      await loadOpsHandoffMarkdown(t);
      await loadOpsPacket(t);
      await loadOpsSnapshot(t);
      await loadOpsExecutiveUpdate(t);
      await loadOpsHourlyReport(t);
      await loadOpsOvernightReport(t);
      await loadOpsReportBundle(t);
      await loadOpsReportBundleMarkdown(t);
      await loadOpsReportBundleBrief(t);
      await loadOpsReportBundleSlack(t);
      await loadOpsReportBundleDiscord(t);
      await loadOpsReportBundleTelegram(t);
      await loadOpsReportBundleEmail(t);
      await loadOpsReportBundleWebhook(t);
      await loadOpsReportBundlePlain(t);
      await loadOpsReportBundleWhatsApp(t);
      await loadOpsReportBundleSms(t);
      await loadOpsReportBundleSignal(t);
      await loadOpsReportBundleIMessage(t);
    };
    boot();
  }, []);

  useEffect(() => {
    if (!token) return;
    loadDispatchLogs(token, { cadence: dispatchCadenceFilter, audience: dispatchAudienceFilter });
  }, [token, dispatchCadenceFilter, dispatchAudienceFilter]);

  // dispatch log is initialized from localStorage via useState lazy initializer

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(dispatchStorageKey, JSON.stringify(dispatchLog.slice(0, 200)));
  }, [dispatchLog, dispatchStorageKey]);

  const refreshOpsPanels = async () => {
    if (!token) return;
    await loadDispatchLogs(token, { cadence: dispatchCadenceFilter, audience: dispatchAudienceFilter });
    await loadConversionTimeline(token);
    await loadOpsHealth(token);
    await loadOpsGuidance(token);
    await loadOpsAlerts(token);
    await loadOpsSummary(token);
    await loadOpsIncidents(token);
    await loadOpsNextActions(token);
    await loadOpsEscalations(token);
    await loadOpsDailyBrief(token);
    await loadOpsRunbook(token);
    await loadOpsHandoff(token);
    await loadOpsHandoffMarkdown(token);
    await loadOpsPacket(token);
    await loadOpsSnapshot(token);
    await loadOpsExecutiveUpdate(token);
    await loadOpsHourlyReport(token);
    await loadOpsOvernightReport(token);
    await loadOpsReportBundle(token);
    await loadOpsReportBundleMarkdown(token);
    await loadOpsReportBundleBrief(token);
    await loadOpsReportBundleSlack(token);
    await loadOpsReportBundleDiscord(token);
    await loadOpsReportBundleTelegram(token);
    await loadOpsReportBundleEmail(token);
    await loadOpsReportBundleWebhook(token);
    await loadOpsReportBundlePlain(token);
    await loadOpsReportBundleWhatsApp(token);
    await loadOpsReportBundleSms(token);
    await loadOpsReportBundleSignal(token);
    await loadOpsReportBundleIMessage(token);
    setMsg("Ops panels refreshed.");
  };

  const publishAnnouncement = async () => {
    if (!token) return;
    const res = await fetch("/api/flock/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, body, audience: "all" }),
    });

    if (!res.ok) {
      setMsg(`Publish failed: ${await res.text()}`);
      return;
    }

    setTitle("");
    setBody("");
    setMsg("Announcement published.");
  };

  const createEvent = async () => {
    if (!token) return;
    const startsAt = eventStartsAt ? new Date(eventStartsAt).toISOString() : "";

    const res = await fetch("/api/flock/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: eventTitle,
        startsAt,
        location: eventLocation,
      }),
    });

    if (!res.ok) {
      setMsg(`Event create failed: ${await res.text()}`);
      return;
    }

    setEventTitle("");
    setEventStartsAt("");
    setEventLocation("");
    setMsg("Event created.");
  };

  const buildBroadcastPrefill = () => {
    const heading = title.trim() ? `Announcement: ${title.trim()}` : "Announcement";
    const content = body.trim() || "(add announcement message)";
    return encodeURIComponent(`${heading}\n\n${content}`);
  };

  const buildEventReminderPrefill = (event: EventAttendanceRow) => {
    const when = new Date(event.starts_at).toLocaleString();
    const where = event.location ? `\nLocation: ${event.location}` : "";
    return encodeURIComponent(`Reminder: ${event.title}\nWhen: ${when}${where}\n\nReply if you can still make it.`);
  };

  const buildFollowUpPrefill = (event: EventAttendanceRow, status: "maybe" | "not_going") => {
    const when = new Date(event.starts_at).toLocaleString();
    const label = status === "maybe" ? "maybe" : "not going";
    return encodeURIComponent(`Follow-up: ${event.title}\nWhen: ${when}\nAudience: ${label}\n\nChecking in — can we help you attend?`);
  };

  const exportEventAttendanceCsv = () => {
    if (eventAttendance.length === 0) {
      setMsg("No event attendance data to export.");
      return;
    }

    const header = ["event_id", "title", "starts_at", "location", "going", "maybe", "not_going", "total"];
    const rows = eventAttendance.map((event) => [
      event.id,
      `"${event.title.replace(/"/g, '""')}"`,
      event.starts_at,
      `"${(event.location ?? "").replace(/"/g, '""')}"`,
      String(event.rsvp_summary?.going ?? 0),
      String(event.rsvp_summary?.maybe ?? 0),
      String(event.rsvp_summary?.not_going ?? 0),
      String(event.rsvp_summary?.total ?? 0),
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Event attendance CSV exported.");
  };

  const logDispatch = async (event: EventAttendanceRow, audience: string, cadence: "T-72h" | "T-24h" | "T-2h") => {
    const fallbackItem: DispatchLogItem = {
      id: `local-${event.id}-${audience}-${cadence}-${dispatchLog.length + 1}`,
      eventId: event.id,
      eventTitle: event.title,
      audience,
      cadence,
      createdAt: new Date().toISOString(),
    };

    if (!token) {
      setDispatchLog((prev) => [fallbackItem, ...prev]);
      setMsg(`Logged ${cadence} dispatch for ${event.title} (${audience}).`);
      return;
    }

    const res = await fetch("/api/flock/dispatch-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: event.id, eventTitle: event.title, audience, cadence }),
    });

    if (!res.ok) {
      setDispatchLog((prev) => [fallbackItem, ...prev]);
      setMsg(`Dispatch API unavailable; logged locally for ${event.title}.`);
      return;
    }

    await loadDispatchLogs(token, { cadence: dispatchCadenceFilter, audience: dispatchAudienceFilter });
    await loadConversionTimeline(token);
    setMsg(`Logged ${cadence} dispatch for ${event.title} (${audience}).`);
  };

  const conversionProxy = eventAttendance.reduce(
    (acc, event) => {
      acc.going += event.rsvp_summary?.going ?? 0;
      acc.maybe += event.rsvp_summary?.maybe ?? 0;
      return acc;
    },
    { going: 0, maybe: 0 }
  );

  const maybeToGoingRate = conversionProxy.going + conversionProxy.maybe === 0
    ? null
    : Math.round((conversionProxy.going / (conversionProxy.going + conversionProxy.maybe)) * 100);

  const attendanceRisk = maybeToGoingRate === null
    ? "unknown"
    : maybeToGoingRate < 40
      ? "high"
      : maybeToGoingRate < 60
        ? "medium"
        : "healthy";

  const cadenceSummary = useMemo(() => {
    return dispatchLog.reduce(
      (acc, item) => {
        acc[item.cadence] += 1;
        return acc;
      },
      { "T-72h": 0, "T-24h": 0, "T-2h": 0 } as Record<"T-72h" | "T-24h" | "T-2h", number>
    );
  }, [dispatchLog]);

  const exportDispatchLogCsv = () => {
    if (dispatchLog.length === 0) {
      setMsg("No dispatch logs to export.");
      return;
    }

    const header = ["id", "event_title", "audience", "cadence", "created_at"];
    const rows = dispatchLog.map((item) => [
      item.id,
      `"${item.eventTitle.replace(/"/g, '""')}"`,
      item.audience,
      item.cadence,
      item.createdAt,
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatch-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Dispatch log exported.");
  };

  const updateRole = async (membershipId: string, nextRole: MemberRow["role"]) => {
    if (!token) return;
    const res = await fetch(`/api/flock/members/${membershipId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: nextRole }),
    });

    if (!res.ok) {
      setMsg(`Role update failed: ${await res.text()}`);
      return;
    }

    setMsg("Role updated.");
    await loadMembers(token);
    await loadRoleAudit(token);
  };

  const allowed = role === "pastor_staff" || role === "church_admin";
  const canAssignRoles = role === "church_admin";

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Flock Admin</h1>
        <Link href="/flock">Back to Flock</Link>
      </div>

      {msg ? <p>{msg}</p> : null}
      {!allowed ? <p style={{ color: "#a00" }}>You do not have publish permissions for this church.</p> : null}

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Weekly Push Announcement</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={publishAnnouncement} disabled={!allowed}>Publish Announcement</button>
          <Link
            href={`/messages?audience=church_all&prefill=${buildBroadcastPrefill()}`}
            style={{ alignSelf: "center", fontSize: 14 }}
          >
            Bridge to Inbox Draft
          </Link>
        </div>
        <p style={{ marginBottom: 0, color: "#666", fontSize: 12 }}>
          Bridge sends your announcement into Messages as a prefilled draft for direct inbox follow-up.
        </p>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Church Event</h3>
        <input placeholder="Event Title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input placeholder="Location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <button onClick={createEvent} disabled={!allowed}>Create Event</button>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Pilot Metrics Snapshot</h3>
        <p style={{ color: "#666", marginTop: 0 }}>Scope: {churchId ? `church ${churchId.slice(0, 8)}...` : "global"}</p>
        {!pilotMetrics ? (
          <p style={{ color: "#666" }}>Metrics unavailable.</p>
        ) : (
          <ul>
            {Object.entries(pilotMetrics).map(([k, v]) => (
              <li key={k}><strong>{k}</strong>: {v}</li>
            ))}
          </ul>
        )}

        <h4 style={{ marginBottom: 6 }}>Trend Deltas</h4>
        {!pilotTrends ? (
          <p style={{ color: "#666" }}>Trend deltas unavailable.</p>
        ) : (
          <ul>
            {Object.entries(pilotTrends).map(([k, t]) => (
              <li key={k}>
                <strong>{k}</strong>: {t.current} vs {t.previous} ({t.diff >= 0 ? "+" : ""}{t.diff}, {t.pct === null ? "n/a" : `${t.pct}%`})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Event Attendance Drilldown</h3>
          <button onClick={exportEventAttendanceCsv}>Export CSV</button>
        </div>
        {eventAttendance.length === 0 ? <p style={{ color: "#666" }}>No event attendance data yet.</p> : null}
        <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
          Use the event reminder automation runbook: <code>docs/STEP_923_EVENT_REMINDER_AUTOMATION.md</code>
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {eventAttendance.map((event) => (
            <div key={event.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              <div style={{ fontWeight: 700 }}>{event.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {new Date(event.starts_at).toLocaleString()} {event.location ? `• ${event.location}` : ""}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                going: <b>{event.rsvp_summary?.going ?? 0}</b> • maybe: <b>{event.rsvp_summary?.maybe ?? 0}</b> • not going: <b>{event.rsvp_summary?.not_going ?? 0}</b> • total: <b>{event.rsvp_summary?.total ?? 0}</b>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/messages?audience=event_reminder&prefill=${buildEventReminderPrefill(event)}`} style={{ fontSize: 13 }}>
                  Send Reminder Draft
                </Link>
                <button onClick={() => logDispatch(event, "all", "T-24h")} style={{ fontSize: 12 }}>Log T-24h</button>
                <Link href={`/messages?audience=follow_up_maybe&prefill=${buildFollowUpPrefill(event, "maybe")}`} style={{ fontSize: 13 }}>
                  Follow Up Maybe ({event.rsvp_summary?.maybe ?? 0})
                </Link>
                <button onClick={() => logDispatch(event, "maybe", "T-2h")} style={{ fontSize: 12 }}>Log Maybe Follow-up</button>
                <Link href={`/messages?audience=follow_up_not_going&prefill=${buildFollowUpPrefill(event, "not_going")}`} style={{ fontSize: 13 }}>
                  Follow Up Not Going ({event.rsvp_summary?.not_going ?? 0})
                </Link>
                <button onClick={() => logDispatch(event, "not_going", "T-72h")} style={{ fontSize: 12 }}>Log Re-engage</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Ops Health Snapshot</h3>
        {opsSummary ? (
          <p style={{ marginTop: 0, fontSize: 12, color: opsSummary.status.healthy ? "#166534" : "#b91c1c" }}>
            Summary: {opsSummary.status.healthy ? "healthy" : "attention needed"} • critical {opsSummary.status.criticalCount} • warning {opsSummary.status.warningCount}
          </p>
        ) : null}
        {opsDailyBrief ? (
          <div style={{ marginTop: 0, marginBottom: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
            <div style={{ fontSize: 12, color: "#374151" }}><b>Daily brief:</b> {opsDailyBrief.headline}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              incidents {opsDailyBrief.metrics.openIncidents} • critical {opsDailyBrief.metrics.critical} • warning {opsDailyBrief.metrics.warning}
            </div>
          </div>
        ) : null}
        {!opsHealth ? (
          <p style={{ color: "#666" }}>Ops health unavailable.</p>
        ) : (
          <>
            <p style={{ marginTop: 0, fontSize: 12, color: "#666" }}>
              Generated: {new Date(opsHealth.generatedAt).toLocaleString()}
            </p>
            <p style={{ marginTop: 0, fontSize: 13, color: opsHealth.snapshot.healthy ? "#166534" : "#b91c1c" }}>
              Snapshot freshness: {opsHealth.snapshot.ageMin === null ? "none" : `${opsHealth.snapshot.ageMin} min old`} ({opsHealth.snapshot.healthy ? "healthy" : "stale"})
            </p>
            <p style={{ marginTop: 0, fontSize: 13 }}>
              Upcoming events: <b>{opsHealth.upcomingEvents.next24h}</b> in next 24h • <b>{opsHealth.upcomingEvents.next72h}</b> in next 72h
            </p>
            <p style={{ marginTop: 0, fontSize: 13 }}>
              Dispatches last 24h: <b>{opsHealth.dispatchLast24h.total}</b> (T-72h {opsHealth.dispatchLast24h.cadence["T-72h"]} • T-24h {opsHealth.dispatchLast24h.cadence["T-24h"]} • T-2h {opsHealth.dispatchLast24h.cadence["T-2h"]})
            </p>
            {opsGuidance ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fafafa" }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Guidance refreshed {new Date(opsGuidance.generatedAt).toLocaleString()}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {opsGuidance.guidance.recommendedActions.slice(0, 3).map((item) => (
                    <li key={item} style={{ fontSize: 12, color: "#333" }}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {opsAlerts ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Alerts refreshed {new Date(opsAlerts.generatedAt).toLocaleString()}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {opsAlerts.alerts.map((alert) => (
                    <div
                      key={alert.key}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 8,
                        background: alert.level === "critical" ? "#fef2f2" : alert.level === "warning" ? "#fffbeb" : "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: alert.level === "critical" ? "#b91c1c" : alert.level === "warning" ? "#92400e" : "#334155" }}>
                        {alert.level}
                      </div>
                      <div style={{ fontSize: 13, color: "#111827" }}>{alert.message}</div>
                      <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>Action: {alert.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {opsIncidents ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fcfcfd" }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Open incidents: <b>{opsIncidents.openCount}</b>
                </div>
                {opsIncidents.incidents.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#166534" }}>No open incidents.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {opsIncidents.incidents.map((incident) => (
                      <div key={incident.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: incident.severity === "critical" ? "#b91c1c" : "#92400e" }}>{incident.severity}</div>
                        <div style={{ fontSize: 13 }}>{incident.summary}</div>
                        <div style={{ fontSize: 12, color: "#4b5563" }}>Action: {incident.action}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {opsNextActions ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Priority action queue ({opsNextActions.total})
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {opsNextActions.items.slice(0, 5).map((item) => (
                    <div key={item.key} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: item.priority === "P0" ? "#b91c1c" : item.priority === "P1" ? "#92400e" : "#334155" }}>{item.priority}</div>
                      <div style={{ fontSize: 13 }}>{item.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {opsEscalations ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fafafa" }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Escalation level: <b style={{ color: opsEscalations.level === "escalate" ? "#b91c1c" : opsEscalations.level === "watch" ? "#92400e" : "#166534" }}>{opsEscalations.level}</b>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  critical {opsEscalations.counts.critical} • warning {opsEscalations.counts.warning}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {opsEscalations.protocol.map((line) => (
                    <li key={line} style={{ fontSize: 12, color: "#333" }}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {opsRunbook ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  Runbook ({opsRunbook.level})
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {opsRunbook.checklist.slice(0, 6).map((item) => (
                    <div key={item.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: item.type === "protocol" ? "#334155" : "#166534" }}>{item.type}</div>
                      <div style={{ fontSize: 13 }}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {opsHandoff ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fcfcfd" }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Shift handoff preview</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsHandoff.handoffText}</pre>
                {opsHandoffMarkdown ? (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Markdown handoff export</summary>
                    <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsHandoffMarkdown.markdown}</pre>
                  </details>
                ) : null}

                {opsPacket ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 12, color: "#374151" }}>
                      Packet {opsPacket.packetVersion} • incidents {opsPacket.packet?.incidents?.openCount ?? 0} • runbook level {opsPacket.packet?.runbook?.level ?? "n/a"}
                    </div>
                  </div>
                ) : null}

                {opsSnapshot ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 12, color: "#374151" }}>{opsSnapshot.compactText}</div>
                  </div>
                ) : null}

                {opsExecutiveUpdate ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 700, marginBottom: 4 }}>Executive Update (ready to send)</div>
                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{opsExecutiveUpdate.headline}</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsExecutiveUpdate.reportText}</pre>
                  </div>
                ) : null}

                {opsHourlyReport ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, background: "#f9fafb" }}>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 700, marginBottom: 4 }}>Hourly Progress Report (ready to send)</div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>
                      Dispatches {opsHourlyReport.dispatchCount} • Timeline samples {opsHourlyReport.timelineSampleSize} • Maybe→Going avg {opsHourlyReport.averageMaybeToGoingPct}%
                    </div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsHourlyReport.report}</pre>
                  </div>
                ) : null}

                {opsOvernightReport ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 700, marginBottom: 4 }}>Overnight Full Report (ready to send)</div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>
                      Packet {opsOvernightReport.packetVersion} • {opsOvernightReport.dailyBriefHeadline}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsOvernightReport.report}</pre>
                  </div>
                ) : null}

                {opsReportBundle ? (
                  <div style={{ marginTop: 8, border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, background: "#f9fafb" }}>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 700, marginBottom: 4 }}>Unified Report Bundle (executive + hourly + overnight)</div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>{opsReportBundle.summaryLine}</div>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show executive</summary>
                      <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundle.bundle.executive.reportText}</pre>
                    </details>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show hourly</summary>
                      <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundle.bundle.hourly.report}</pre>
                    </details>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show overnight</summary>
                      <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundle.bundle.overnight.report}</pre>
                    </details>
                    {opsReportBundleMarkdown ? (
                      <details>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show markdown export</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleMarkdown.markdown}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleBrief ? (
                      <div style={{ marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                        <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Brief send format ({opsReportBundleBrief.maxLen} chars)</div>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleBrief.brief}</pre>
                      </div>
                    ) : null}
                    {opsReportBundleSlack ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Slack payload preview</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{JSON.stringify(opsReportBundleSlack, null, 2)}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleDiscord ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Discord payload preview</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{JSON.stringify(opsReportBundleDiscord, null, 2)}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleTelegram ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Telegram payload preview</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{JSON.stringify(opsReportBundleTelegram, null, 2)}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleEmail ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Email payload preview</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{JSON.stringify(opsReportBundleEmail, null, 2)}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleWebhook ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Webhook payload preview</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{JSON.stringify(opsReportBundleWebhook, null, 2)}</pre>
                      </details>
                    ) : null}
                    {opsReportBundlePlain ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Plain-text payload preview ({opsReportBundlePlain.charCount} chars)</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundlePlain.text}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleWhatsApp ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show WhatsApp payload preview ({opsReportBundleWhatsApp.charCount} chars)</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleWhatsApp.text}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleSms ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show SMS payload preview ({opsReportBundleSms.charCount} chars, ~{opsReportBundleSms.segmentsEstimate} segments)</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleSms.sms}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleSignal ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show Signal payload preview ({opsReportBundleSignal.charCount} chars)</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleSignal.text}</pre>
                      </details>
                    ) : null}
                    {opsReportBundleIMessage ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}>Show iMessage payload preview ({opsReportBundleIMessage.charCount} chars)</summary>
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>{opsReportBundleIMessage.bubble}</pre>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Reminder Dispatch Log (Ops)</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={dispatchCadenceFilter} onChange={(e) => setDispatchCadenceFilter(e.target.value as "all" | "T-72h" | "T-24h" | "T-2h")}>
              <option value="all">all cadence</option>
              <option value="T-72h">T-72h</option>
              <option value="T-24h">T-24h</option>
              <option value="T-2h">T-2h</option>
            </select>
            <select value={dispatchAudienceFilter} onChange={(e) => setDispatchAudienceFilter(e.target.value)}>
              <option value="all">all audience</option>
              <option value="all">all</option>
              <option value="maybe">maybe</option>
              <option value="not_going">not_going</option>
            </select>
            <button onClick={refreshOpsPanels}>Refresh</button>
            <button onClick={exportDispatchLogCsv}>Export Dispatch Log CSV</button>
          </div>
        </div>
        <p style={{ marginTop: 0, fontSize: 12, color: "#666" }}>
          Maybe→Going proxy: {maybeToGoingRate === null ? "n/a" : `${maybeToGoingRate}%`} (based on current attendance snapshot)
        </p>
        <p style={{ marginTop: 0, fontSize: 12, color: attendanceRisk === "high" ? "#b91c1c" : attendanceRisk === "medium" ? "#92400e" : "#166534" }}>
          Attendance conversion risk: <b>{attendanceRisk}</b>
          {attendanceRisk === "high" ? " — escalate with extra reminder + leader outreach." : ""}
          {attendanceRisk === "medium" ? " — monitor and push one more follow-up cycle." : ""}
        </p>
        <p style={{ marginTop: 0, fontSize: 12, color: "#666" }}>
          Cadence coverage: T-72h {cadenceSummary["T-72h"]} • T-24h {cadenceSummary["T-24h"]} • T-2h {cadenceSummary["T-2h"]}
        </p>
        {dispatchLog.length === 0 ? <p style={{ color: "#666" }}>No dispatches logged in this session.</p> : null}
        <div style={{ display: "grid", gap: 6 }}>
          {dispatchLog.map((log) => (
            <div key={log.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8, fontSize: 13 }}>
              <b>{log.cadence}</b> • {log.eventTitle} • audience: {log.audience} • {new Date(log.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Conversion Timeline</h3>
        <p style={{ marginTop: 0, fontSize: 12, color: "#666" }}>
          Source: <b>{timelineSource}</b>{timelineGeneratedAt ? ` • refreshed ${new Date(timelineGeneratedAt).toLocaleString()}` : ""}
        </p>
        {conversionTimeline.length === 0 ? <p style={{ color: "#666" }}>No conversion timeline data yet.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {conversionTimeline.map((item) => {
            const pct = item.maybe_to_going_pct ?? 0;
            return (
              <div key={item.event_id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong>{item.title}</strong>
                  <span style={{ fontSize: 12, color: "#666" }}>{new Date(item.starts_at).toLocaleString()}</span>
                </div>
                <div style={{ marginTop: 6, background: "#f3f4f6", borderRadius: 999, height: 8 }}>
                  <div style={{ width: `${pct}%`, background: pct >= 60 ? "#166534" : pct >= 40 ? "#92400e" : "#b91c1c", height: 8, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                  maybe→going: {item.maybe_to_going_pct === null ? "n/a" : `${item.maybe_to_going_pct}%`} • total responses: {item.total}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Recent Role Audit</h3>
        {roleAudit.length === 0 ? <p style={{ color: "#666" }}>No role changes logged yet.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {roleAudit.map((a) => (
            <div key={a.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>{new Date(a.changed_at).toLocaleString()}</div>
              <div style={{ fontSize: 13 }}>
                actor:{a.actor_user_id.slice(0, 8)}... changed target:{a.target_user_id.slice(0, 8)}... from <b>{a.old_role}</b> to <b>{a.new_role}</b>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Role Management</h3>
        {!canAssignRoles ? <p style={{ color: "#666" }}>Only church admins can change roles.</p> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: "#444" }}>user:{m.user_id.slice(0, 8)}...</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.role}</div>
              </div>
              <select
                value={m.role}
                disabled={!canAssignRoles}
                onChange={(e) => updateRole(m.id, e.target.value as MemberRow["role"])}
              >
                <option value="member">member</option>
                <option value="group_leader">group_leader</option>
                <option value="pastor_staff">pastor_staff</option>
                <option value="church_admin">church_admin</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
