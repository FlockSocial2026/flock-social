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

type ChurchRole = "member" | "group_leader" | "pastor_staff" | "church_admin";

const rolePrompts: Record<ChurchRole, { title: string; points: string[] }> = {
  member: {
    title: "Member setup focus",
    points: [
      "Complete your profile so your church community can recognize you.",
      "Enable prayer + group participation from day one.",
      "Keep notifications on for church updates and event changes.",
    ],
  },
  group_leader: {
    title: "Group leader setup focus",
    points: [
      "Set a complete profile so members trust group communications.",
      "Prepare to post group announcements and schedule reminders.",
      "Use messages to keep your small-group attendance steady week to week.",
    ],
  },
  pastor_staff: {
    title: "Pastor/staff setup focus",
    points: [
      "Prepare your profile for congregation-facing trust and clarity.",
      "Use announcements + events to keep weekly communication consistent.",
      "Monitor engagement signals to identify members needing follow-up.",
    ],
  },
  church_admin: {
    title: "Church admin setup focus",
    points: [
      "Set your profile for clear identity in church operations.",
      "Validate role and communication pathways before member rollout.",
      "Own reliability of updates, moderation workflow, and response SLAs.",
    ],
  },
};

function toPromptRole(roleValue: string | null | undefined): ChurchRole {
  switch (roleValue) {
    case "group_leader":
      return "group_leader";
    case "pastor_staff":
      return "pastor_staff";
    case "church_admin":
      return "church_admin";
    default:
      return "member";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [ackCommunityRules, setAckCommunityRules] = useState(false);
  const [ackProfileVisibility, setAckProfileVisibility] = useState(false);
  const [ackRoleResponsibilities, setAckRoleResponsibilities] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ChurchRole>("member");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const flockRes = await fetch("/api/flock/church", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!flockRes.ok) return;

      const flockJson = await flockRes.json();
      setSelectedRole(toPromptRole(flockJson?.membership?.role));
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
      { label: `Confirm ${selectedRole.replace("_", " ")} responsibilities`, done: ackRoleResponsibilities, required: true },
    ],
    [normalizedUsername, normalizedFullName, ackCommunityRules, ackProfileVisibility, ackRoleResponsibilities, selectedRole]
  );

  const requiredDone = checklist.filter((c) => c.required).every((c) => c.done);
  const completedCount = checklist.filter((c) => c.done).length;
  const rolePrompt = rolePrompts[selectedRole];

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
            STEP 909
          </span>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14, background: "#f8fafc" }}>
        <h3 style={{ marginTop: 0 }}>{rolePrompt.title}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          {rolePrompt.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
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

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input type="checkbox" checked={ackProfileVisibility} onChange={(e) => setAckProfileVisibility(e.target.checked)} />
          I understand my profile is visible to members in my church community.
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={ackRoleResponsibilities} onChange={(e) => setAckRoleResponsibilities(e.target.checked)} />
          I understand responsibilities for my current role: <strong>{selectedRole.replace("_", " ")}</strong>.
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
