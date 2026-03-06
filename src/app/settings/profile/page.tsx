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
    <main className="app-shell" style={{ maxWidth: 640 }}>
      <section className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Profile Settings</h1>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>

        <label className="form-label">Username</label>
        <input
          className="field"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
        />

        <label className="form-label">Full name</label>
        <input
          className="field"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
        />

        <label className="form-label">Avatar URL (optional)</label>
        <input
          className="field"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
          style={{ marginBottom: 12 }}
        />

        <button className="btn-primary" onClick={save}>Save Profile</button>
        {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
      </section>
    </main>
  );
}
