"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

type Profile = { id: string; username: string | null; full_name: string | null };
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

type GroupedNotification = {
  key: string;
  actor_id: string;
  type: NotificationRow["type"];
  post_id: string | null;
  latest_at: string;
  items: NotificationRow[];
  unread: boolean;
};

type NotificationDigest = {
  unread: number;
  last24hCount: number;
  byType: { like: number; comment: number; follow: number };
};

const GROUP_WINDOW_MS = 60 * 60 * 1000; // 1h

export default function NotificationsPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map());
  const [digest, setDigest] = useState<NotificationDigest | null>(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = userData.user;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setMe(user.id);

    const token = sessionData.session?.access_token;
    if (token) {
      const digestRes = await fetch("/api/notifications/digest", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (digestRes.ok) {
        const digestJson = await digestRes.json();
        setDigest({
          unread: digestJson.unread ?? 0,
          last24hCount: digestJson.last24hCount ?? 0,
          byType: digestJson.byType ?? { like: 0, comment: 0, follow: 0 },
        });
      }
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,actor_id,type,post_id,comment_id,created_at,read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      setMsg(`Load error: ${error.message}`);
      return;
    }

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const buckets: GroupedNotification[] = [];

    for (const row of rows) {
      const rowTime = new Date(row.created_at).getTime();

      const candidate = buckets.find((g) => {
        const sameActor = g.actor_id === row.actor_id;
        const sameType = g.type === row.type;
        const samePost = g.post_id === row.post_id;
        const withinWindow = Math.abs(new Date(g.latest_at).getTime() - rowTime) <= GROUP_WINDOW_MS;
        return sameActor && sameType && samePost && withinWindow;
      });

      if (candidate) {
        candidate.items.push(row);
        if (new Date(candidate.latest_at).getTime() < rowTime) candidate.latest_at = row.created_at;
        candidate.unread = candidate.unread || !row.read_at;
      } else {
        buckets.push({
          key: `${row.actor_id}:${row.type}:${row.post_id ?? "none"}:${row.id}`,
          actor_id: row.actor_id,
          type: row.type,
          post_id: row.post_id,
          latest_at: row.created_at,
          items: [row],
          unread: !row.read_at,
        });
      }
    }

    return buckets.sort((a, b) => +new Date(b.latest_at) - +new Date(a.latest_at));
  }, [rows]);

  const unreadCount = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  const markAllRead = async () => {
    if (!me) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", me)
      .is("read_at", null);

    if (error) {
      setMsg(`Mark read error: ${error.message}`);
      return;
    }

    track("notifications_mark_all_read", { unreadBefore: unreadCount });
    await load();
  };

  const actorName = (actorId: string) => {
    const p = profileMap.get(actorId);
    if (!p) return `user:${actorId.slice(0, 8)}...`;
    if (p.full_name && p.username) return `${p.full_name} (@${p.username})`;
    if (p.username) return `@${p.username}`;
    if (p.full_name) return p.full_name;
    return `user:${actorId.slice(0, 8)}...`;
  };

  const verb = (type: NotificationRow["type"], count: number) => {
    if (type === "like") return count > 1 ? `liked your post ${count} times` : "liked your post";
    if (type === "comment") return count > 1 ? `commented on your post ${count} times` : "commented on your post";
    return count > 1 ? `followed you (${count} events)` : "followed you";
  };

  return (
    <main style={{ maxWidth: 760, margin: "32px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1>Notifications</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={markAllRead}>Mark all read</button>
        <span style={{ color: "#666", alignSelf: "center" }}>Unread: {unreadCount}</span>
      </div>

      {msg ? <p style={{ marginBottom: 10 }}>{msg}</p> : null}

      {digest ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 12, background: "#fafafa" }}>
          <strong>24h digest</strong>
          <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            total {digest.last24hCount} • likes {digest.byType.like} • comments {digest.byType.comment} • follows {digest.byType.follow}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {grouped.map((g) => (
          <div key={g.key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, opacity: g.unread ? 1 : 0.75 }}>
            <div style={{ fontSize: 14 }}>
              <strong>{actorName(g.actor_id)}</strong> {verb(g.type, g.items.length)}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {new Date(g.latest_at).toLocaleString()} • grouped {g.items.length} event{g.items.length === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
