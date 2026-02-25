"use client";

import { useEffect, useState } from "react";
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
  eventTitle: string;
  audience: string;
  cadence: "T-72h" | "T-24h" | "T-2h";
  createdAt: string;
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
  const [dispatchLog, setDispatchLog] = useState<DispatchLogItem[]>([]);
  const [msg, setMsg] = useState("");

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
    };
    boot();
  }, []);

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

  const logDispatch = (event: EventAttendanceRow, audience: string, cadence: "T-72h" | "T-24h" | "T-2h") => {
    setDispatchLog((prev) => [
      {
        id: `d-${Date.now()}`,
        eventTitle: event.title,
        audience,
        cadence,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
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
        <h3 style={{ marginTop: 0 }}>Reminder Dispatch Log (Ops)</h3>
        <p style={{ marginTop: 0, fontSize: 12, color: "#666" }}>
          Maybe→Going proxy: {maybeToGoingRate === null ? "n/a" : `${maybeToGoingRate}%`} (based on current attendance snapshot)
        </p>
        <p style={{ marginTop: 0, fontSize: 12, color: attendanceRisk === "high" ? "#b91c1c" : attendanceRisk === "medium" ? "#92400e" : "#166534" }}>
          Attendance conversion risk: <b>{attendanceRisk}</b>
          {attendanceRisk === "high" ? " — escalate with extra reminder + leader outreach." : ""}
          {attendanceRisk === "medium" ? " — monitor and push one more follow-up cycle." : ""}
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
