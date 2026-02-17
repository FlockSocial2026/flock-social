"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");

  const signIn = async () => {
    setMsg("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error ? `Signin error: ${error.message}` : "Signed in.");
  };

  const updateProfile = async () => {
    setMsg("Updating profile...");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("No user session. Sign in first.");

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username }, { onConflict: "id" });

    setMsg(error ? `Update error: ${error.message}` : "Profile updated.");
  };

  const readProfile = async () => {
    setMsg("Reading profile...");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("No user session. Sign in first.");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, created_at")
      .eq("id", user.id)
      .single();

    setMsg(error ? `Read error: ${error.message}` : `Profile: ${JSON.stringify(data)}`);
  };

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Profiles RLS Smoke Test</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <button onClick={signIn} style={{ marginBottom: 16 }}>Sign In</button>

      <input
        placeholder="New username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={updateProfile}>Update Profile</button>
        <button onClick={readProfile}>Read Profile</button>
      </div>

      <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</p>
    </main>
  );
}