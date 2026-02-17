"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username,full_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMsg(`Load error: ${error.message}`);
        return;
      }

      setUsername(data?.username ?? "");
      setFullName(data?.full_name ?? "");
      setAvatarUrl(data?.avatar_url ?? "");
    };

    load();
  }, [router]);

  const save = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return router.push("/auth/login");

    const uname = username.trim();
    if (!uname) return setMsg("Username is required.");
    if (uname.length < 3) return setMsg("Username must be at least 3 characters.");

    setMsg("Saving...");

    const { error } = await supabase
      .from("profiles")
      .update({
        username: uname,
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMsg(`Save error: ${error.message}`);
      return;
    }

    setMsg("Profile updated.");
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1>Profile Settings</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <label>Username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
        style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
      />

      <label>Full name</label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
      />

      <label>Avatar URL (optional)</label>
      <input
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="https://..."
        style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
      />

      <button onClick={save}>Save Profile</button>
      {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
    </main>
  );
}
