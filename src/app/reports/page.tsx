"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ReportRow = {
  id: string;
  target_type: "post" | "comment" | "user";
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

export default function ReportsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData.user;
      if (!me) return router.push("/auth/login");

      const { data, error } = await supabase
        .from("reports")
        .select("id,target_type,reason,status,created_at")
        .eq("reporter_id", me.id)
        .order("created_at", { ascending: false });

      if (error) return setMsg(`Load error: ${error.message}`);
      setRows((data ?? []) as ReportRow[]);
    };

    load();
  }, [router]);

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h1>My Reports</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      {msg ? <p>{msg}</p> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
            <div><strong>{r.target_type.toUpperCase()}</strong> • {r.status}</div>
            <div style={{ marginTop: 4 }}>{r.reason}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>{new Date(r.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
