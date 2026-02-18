"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      setToken(accessToken);
    };
    boot();
  }, [router]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const updateStatus = async (id: string, next: ReportRow["status"]) => {
    if (!token) return;
    setBusyId(id);

    const res = await fetch("/api/moderation/reports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reportId: id, status: next }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setMsg(`Update failed: ${txt}`);
      setBusyId(null);
      return;
    }

    setBusyId(null);
    await load();
  };

  return (
    <main style={{ maxWidth: 920, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Moderation Queue</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["open", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} disabled={statusFilter === s}>
            {s}
          </button>
        ))}
      </div>

      {msg ? <p style={{ marginBottom: 10 }}>{msg}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              {r.target_type.toUpperCase()} • {new Date(r.created_at).toLocaleString()} • report:{r.id.slice(0, 8)}
            </div>
            <div style={{ marginBottom: 8 }}>{r.reason}</div>
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
