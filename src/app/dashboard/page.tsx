"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type QuickStat = { label: string; value: string; tone?: "default" | "good" | "warn" };

type ActivityItem = {
  id: string;
  kind: "notification" | "report";
  title: string;
  subtitle: string;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  created_at: string;
};

type ReportRow = {
  id: string;
  target_type: "post" | "comment" | "user";
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("Checking session...");
  const [unread, setUnread] = useState<number>(0);
  const [canModerate, setCanModerate] = useState<boolean>(false);
  const [flockRole, setFlockRole] = useState<string>("not connected");
  const [churchName, setChurchName] = useState<string>("No church connected");
  const [buildStep, setBuildStep] = useState<string>("906");
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const boot = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setStatus(`Profile check error: ${error.message}`);
        return;
      }

      const missingUsername = !profile?.username || profile.username.trim() === "";
      const missingFullName = !profile?.full_name || profile.full_name.trim() === "";
      if (missingUsername || missingFullName) {
        router.push("/onboarding");
        return;
      }

      const [{ count }, notificationsRes, reportsRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null),
        supabase
          .from("notifications")
          .select("id,actor_id,type,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("reports")
          .select("id,target_type,status,created_at")
          .eq("reporter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setUnread(count ?? 0);

      const notifications = ((notificationsRes.data ?? []) as NotificationRow[]).map((n) => ({
        id: `n-${n.id}`,
        kind: "notification" as const,
        title: `Notification: ${n.type}`,
        subtitle: `Actor ${n.actor_id.slice(0, 8)}...`,
        createdAt: n.created_at,
      }));

      const reports = ((reportsRes.data ?? []) as ReportRow[]).map((r) => ({
        id: `r-${r.id}`,
        kind: "report" as const,
        title: `Report: ${r.target_type}`,
        subtitle: `Status: ${r.status}`,
        createdAt: r.created_at,
      }));

      setActivity(
        [...notifications, ...reports]
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          .slice(0, 8)
      );

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        const [modRes, flockRes] = await Promise.all([
          fetch("/api/moderation/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/flock/church", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setCanModerate(modRes.ok);

        if (flockRes.ok) {
          const flockJson = await flockRes.json();
          setFlockRole(flockJson?.membership?.role ?? "not connected");
          setChurchName(flockJson?.church?.name ?? "No church connected");
        }
      }

      setStatus("Ready");
    };

    boot();
  }, [router]);

  const stats: QuickStat[] = useMemo(
    () => [
      { label: "Unread Notifications", value: String(unread), tone: unread > 0 ? "warn" : "good" },
      { label: "Flock Role", value: flockRole },
      { label: "Moderation Access", value: canModerate ? "Enabled" : "Disabled", tone: canModerate ? "good" : "default" },
      { label: "Build Step", value: buildStep, tone: "good" },
    ],
    [unread, flockRole, canModerate, buildStep]
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
  } as const;

  return (
    <main style={{ maxWidth: 980, margin: "42px auto", fontFamily: "Arial, sans-serif", padding: "0 16px 32px" }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 18,
          marginBottom: 14,
          background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Dashboard</h1>
            <p style={{ color: "#4b5563", margin: 0 }}>
              Signed in as <strong>{email}</strong>
            </p>
            <p style={{ color: "#6b7280", margin: "6px 0 0" }}>Status: {status}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, background: "#111827", color: "#fff", borderRadius: 999, padding: "8px 12px" }}>
            STEP {buildStep}
          </span>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>{s.label}</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: s.tone === "good" ? "#166534" : s.tone === "warn" ? "#92400e" : "#111827",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Church Status</h3>
        <p style={{ margin: 0, color: "#111827" }}>
          <strong>Connected Church:</strong> {churchName}
        </p>
        <p style={{ margin: "6px 0 0", color: "#374151" }}>
          <strong>Your Role:</strong> {flockRole}
        </p>
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
        {activity.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0 }}>No recent activity yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {activity.map((item) => (
              <div key={item.id} style={{ border: "1px solid #edf0f4", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>{item.title}</strong>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ color: "#374151", marginTop: 4, fontSize: 13 }}>{item.subtitle}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Core Surfaces</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/feed">Feed</Link>
          <Link href="/discover">Discover</Link>
          <Link href="/prayer">Prayer</Link>
          <Link href="/groups">Groups</Link>
          <Link href="/search">Search</Link>
          <Link href="/flock">Flock</Link>
          <Link href="/events">Events</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/settings/profile">Profile Settings</Link>
          <Link href="/reports">My Reports</Link>
          {canModerate ? <Link href="/moderation">Moderation Queue</Link> : null}
        </div>
      </section>

      <section style={{ ...cardStyle }}>
        <h3 style={{ marginTop: 0 }}>Next Visible Ship Targets</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Messages live thread data model + send workflow</li>
          <li>Role-aware onboarding completion prompts</li>
          <li>Church admin broadcast + inbox bridge</li>
        </ul>
      </section>

      <div style={{ marginTop: 14 }}>
        <button onClick={handleLogout} style={{ padding: "10px 14px" }}>
          Log Out
        </button>
      </div>
    </main>
  );
}
