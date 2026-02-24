"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ChecklistItem = {
  label: string;
  done: boolean;
  required?: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [ackCommunityRules, setAckCommunityRules] = useState(false);
  const [ackProfileVisibility, setAckProfileVisibility] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/auth/login");
    };
    check();
  }, [router]);

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedFullName = fullName.trim();

  const checklist: ChecklistItem[] = useMemo(
    () => [
      { label: "Choose a username", done: normalizedUsername.length >= 3, required: true },
      { label: "Add your full name", done: normalizedFullName.length >= 2, required: true },
      { label: "Acknowledge community rules", done: ackCommunityRules, required: true },
      { label: "Confirm profile visibility", done: ackProfileVisibility, required: true },
    ],
    [normalizedUsername, normalizedFullName, ackCommunityRules, ackProfileVisibility]
  );

  const requiredDone = checklist.filter((c) => c.required).every((c) => c.done);
  const completedCount = checklist.filter((c) => c.done).length;

  const saveProfile = async () => {
    if (!requiredDone) {
      setMsg("Please complete all required checklist items first.");
      return;
    }

    setMsg("Saving...");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("No user session. Please log in again.");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: normalizedUsername,
        full_name: normalizedFullName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) return setMsg(`Error: ${error.message}`);
    setMsg("Profile saved. Redirecting...");
    router.push("/dashboard");
  };

  return (
    <main style={{ maxWidth: 760, margin: "42px auto", fontFamily: "Arial, sans-serif", padding: "0 16px 24px" }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>Welcome to Flock Social</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Complete your first-run setup to unlock the dashboard.</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "8px 12px", background: "#111827", color: "#fff" }}>
            STEP 905
          </span>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>First-Run Checklist</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          {completedCount}/{checklist.length} complete
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {checklist.map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #eceff3", borderRadius: 10, padding: 10 }}>
              <span>{item.label}</span>
              <strong style={{ color: item.done ? "#166534" : "#92400e" }}>{item.done ? "Done" : "Pending"}</strong>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Profile Setup</h3>
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

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input type="checkbox" checked={ackCommunityRules} onChange={(e) => setAckCommunityRules(e.target.checked)} />
          I agree to follow community conduct rules.
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={ackProfileVisibility} onChange={(e) => setAckProfileVisibility(e.target.checked)} />
          I understand my profile is visible to members in my church community.
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={saveProfile} disabled={!requiredDone} style={{ padding: "10px 14px" }}>
            Save and Continue
          </button>
          <Link href="/auth/login">Back to Login</Link>
        </div>

        <p style={{ marginTop: 12 }}>{msg}</p>
      </section>
    </main>
  );
}
