"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/auth/login");
    };
    check();
  }, [router]);

  const saveProfile = async () => {
    setMsg("Saving...");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("No user session. Please log in again.");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) return setMsg(`Error: ${error.message}`);
    setMsg("Profile saved. Redirecting...");
    router.push("/dashboard");
  };

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1>Welcome to Flock Social</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>Set up your profile to continue.</p>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <input
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={saveProfile} style={{ padding: "10px 14px" }}>
        Save and Continue
      </button>

      <p style={{ marginTop: 12 }}>{msg}</p>
    </main>
  );
}
