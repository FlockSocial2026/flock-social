"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; username: string | null; full_name: string | null; };
type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map());
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { router.push("/auth/login"); return; }
    setMe(user.id);

    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,actor_id,type,post_id,comment_id,created_at,read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) { setMsg(`Load error: ${error.message}`); return; }
    const items = (data ?? []) as NotificationRow[];
    setRows(items);

    const actorIds = Array.from(new Set(items.map((n) => n.actor_id)));
    if (actorIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", actorIds);

      if (!pErr) {
        setProfileMap(new Map((profiles as Profile[]).map((p) => [p.id, p])));
      }
    }
  };

  useEffect(() => { load(); }, []);

  const unreadCount = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  const markAllRead = async () => {
    if (!me) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", me)
      .is("read_at", null);

    if (error) return setMsg(`Mark read error: ${error.message}`);
    await load();
  };

  const actorName = (actorId: string) => {
    const p = profileMap.get(actorId);
    if (!p) return `user:${actorId.slice(0,8)}...`;
    if (p.full_name && p.username) return `${p.full_name} (@${p.username})`;
    if (p.username) return `@${p.username}`;
    if (p.full_name) return p.full_name;
    return `user:${actorId.slice(0,8)}...`;
  };

  const verb = (type: NotificationRow["type"]) => {
    if (type === "like") return "liked your post";
    if (type === "comment") return "commented on your post";
    return "followed you";
  };

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1>Notifications</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={markAllRead}>Mark all read</button>
        <span style={{ color: "#666", alignSelf: "center" }}>Unread: {unreadCount}</span>
      </div>

      {msg ? <p style={{ marginBottom: 10 }}>{msg}</p> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((n) => (
          <div key={n.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, opacity: n.read_at ? 0.75 : 1 }}>
            <div style={{ fontSize: 14 }}>
              <strong>{actorName(n.actor_id)}</strong> {verb(n.type)}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {new Date(n.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
