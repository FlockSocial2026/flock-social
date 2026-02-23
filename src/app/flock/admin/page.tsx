"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function FlockAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      setToken(t);

      const res = await fetch("/api/flock/roles/me", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      setRole(json.role ?? null);
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
    const res = await fetch("/api/flock/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: eventTitle,
        startsAt: new Date(eventStartsAt).toISOString(),
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

  const allowed = role === "pastor_staff" || role === "church_admin";

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

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Church Event</h3>
        <input placeholder="Event Title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input placeholder="Location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <button onClick={createEvent} disabled={!allowed}>Create Event</button>
      </section>
    </main>
  );
}
