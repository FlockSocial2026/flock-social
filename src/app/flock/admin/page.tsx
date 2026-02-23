"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MemberRow = { id: string; user_id: string; role: "member" | "group_leader" | "pastor_staff" | "church_admin"; created_at: string };

export default function FlockAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [msg, setMsg] = useState("");

  const loadMembers = async (t: string) => {
    const res = await fetch("/api/flock/members", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const json = await res.json();
    setMembers((json.items ?? []) as MemberRow[]);
  };

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      setToken(t);

      const res = await fetch("/api/flock/roles/me", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      setRole(json.role ?? null);

      await loadMembers(t);
    };
    boot();
  }, []);

  const publishAnnouncement = async () => {
    if (!token) return;
    const res = await fetch("/api/flock/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, body, audience: "all" }),
    });

    if (!res.ok) {
      setMsg(`Publish failed: ${await res.text()}`);
      return;
    }

    setTitle("");
    setBody("");
    setMsg("Announcement published.");
  };

  const createEvent = async () => {
    if (!token) return;
    const startsAt = eventStartsAt ? new Date(eventStartsAt).toISOString() : "";

    const res = await fetch("/api/flock/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: eventTitle,
        startsAt,
        location: eventLocation,
      }),
    });

    if (!res.ok) {
      setMsg(`Event create failed: ${await res.text()}`);
      return;
    }

    setEventTitle("");
    setEventStartsAt("");
    setEventLocation("");
    setMsg("Event created.");
  };

  const updateRole = async (membershipId: string, nextRole: MemberRow["role"]) => {
    if (!token) return;
    const res = await fetch(`/api/flock/members/${membershipId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: nextRole }),
    });

    if (!res.ok) {
      setMsg(`Role update failed: ${await res.text()}`);
      return;
    }

    setMsg("Role updated.");
    await loadMembers(token);
  };

  const allowed = role === "pastor_staff" || role === "church_admin";
  const canAssignRoles = role === "church_admin";

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Flock Admin</h1>
        <Link href="/flock">Back to Flock</Link>
      </div>

      {msg ? <p>{msg}</p> : null}
      {!allowed ? <p style={{ color: "#a00" }}>You do not have publish permissions for this church.</p> : null}

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Weekly Push Announcement</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <button onClick={publishAnnouncement} disabled={!allowed}>Publish Announcement</button>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Church Event</h3>
        <input placeholder="Event Title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input placeholder="Location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <button onClick={createEvent} disabled={!allowed}>Create Event</button>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Role Management</h3>
        {!canAssignRoles ? <p style={{ color: "#666" }}>Only church admins can change roles.</p> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: "#444" }}>user:{m.user_id.slice(0, 8)}...</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.role}</div>
              </div>
              <select
                value={m.role}
                disabled={!canAssignRoles}
                onChange={(e) => updateRole(m.id, e.target.value as MemberRow["role"])}
              >
                <option value="member">member</option>
                <option value="group_leader">group_leader</option>
                <option value="pastor_staff">pastor_staff</option>
                <option value="church_admin">church_admin</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
