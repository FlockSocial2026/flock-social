"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "user";
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  resolution_note?: string | null;
};

export default function ModerationPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed">("open");
  const [targetFilter, setTargetFilter] = useState<"all" | "post" | "comment" | "user">("all");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    if (!token) return;

    const res = await fetch(`/api/moderation/reports?status=${statusFilter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      setMsg(`Load failed: ${txt}`);
      return;
    }

    const json = await res.json();
    setRows((json.items ?? []) as ReportRow[]);
  };

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return router.push("/auth/login");

      const meRes = await fetch("/api/moderation/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meRes.ok) {
        setMsg("You are not authorized for moderation.");
        setTimeout(() => router.push("/dashboard"), 900);
        return;
      }

      setIsModerator(true);
      setToken(accessToken);
    };
    boot();
  }, [router]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const visibleRows = useMemo(
    () => (targetFilter === "all" ? rows : rows.filter((r) => r.target_type === targetFilter)),
    [rows, targetFilter],
  );

  const updateStatus = async (id: string, next: ReportRow["status"]) => {
    if (!token) return;
    setBusyId(id);

    const resolutionNote = (resolutionDrafts[id] ?? "").trim() || null;

    const res = await fetch("/api/moderation/reports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reportId: id, status: next, resolutionNote }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setMsg(`Update failed: ${txt}`);
      setBusyId(null);
      return;
    }

    track("moderation_status_update", { reportId: id, status: next, hasResolutionNote: Boolean(resolutionNote) });
    setBusyId(null);
    await load();
  };

  return (
    <main style={{ maxWidth: 920, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Moderation Queue</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/api/moderation/audit?format=csv" style={{ textDecoration: "none" }}>Export Audit CSV</a>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["open", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} disabled={statusFilter === s}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["all", "post", "comment", "user"] as const).map((t) => (
          <button key={t} onClick={() => setTargetFilter(t)} disabled={targetFilter === t}>
            target:{t}
          </button>
        ))}
      </div>

      {msg ? <p style={{ marginBottom: 10 }}>{msg}</p> : null}
      {!isModerator ? <p style={{ color: "#666", marginBottom: 12 }}>Checking moderator access…</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {visibleRows.map((r) => (
          <div key={r.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              {r.target_type.toUpperCase()} • {new Date(r.created_at).toLocaleString()} • report:{r.id.slice(0, 8)}
            </div>
            <div style={{ marginBottom: 8 }}>{r.reason}</div>

            <textarea
              placeholder="Resolution note (optional)"
              value={resolutionDrafts[r.id] ?? r.resolution_note ?? ""}
              onChange={(e) => setResolutionDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
              rows={2}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => updateStatus(r.id, "reviewing")} disabled={busyId === r.id}>Mark reviewing</button>
              <button onClick={() => updateStatus(r.id, "resolved")} disabled={busyId === r.id}>Resolve</button>
              <button onClick={() => updateStatus(r.id, "dismissed")} disabled={busyId === r.id}>Dismiss</button>
              <button onClick={() => updateStatus(r.id, "open")} disabled={busyId === r.id}>Re-open</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
