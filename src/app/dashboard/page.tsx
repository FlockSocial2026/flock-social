"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("Checking session...");
  const [unread, setUnread] = useState<number>(0);
  const [canModerate, setCanModerate] = useState<boolean>(false);

  useEffect(() => {
    const boot = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) { router.push("/auth/login"); return; }
      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) { setStatus(`Profile check error: ${error.message}`); return; }

      const missingUsername = !profile?.username || profile.username.trim() === "";
      const missingFullName = !profile?.full_name || profile.full_name.trim() === "";
      if (missingUsername || missingFullName) { router.push("/onboarding"); return; }

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      setUnread(count ?? 0);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const modRes = await fetch("/api/moderation/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCanModerate(modRes.ok);
      }

      setStatus("Ready");
    };

    boot();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1>Dashboard</h1>
      <p style={{ color: "#666" }}>You are logged in as: {email}</p>
      <p style={{ color: "#666" }}>Status: {status}</p>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <Link href="/feed" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          Open Feed
        </Link>

        <Link href="/discover" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          Discover
        </Link>

        <Link href="/notifications" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          Notifications {unread > 0 ? `(${unread})` : ""}
        </Link>

        <Link href="/settings/profile" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          Profile Settings
        </Link>

        <Link href="/reports" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          My Reports
        </Link>

        {canModerate ? (
          <Link href="/moderation" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
            Moderation Queue
          </Link>
        ) : null}

        <button onClick={handleLogout} style={{ padding: "10px 14px" }}>
          Log Out
        </button>
      </div>
    </main>
  );
}



