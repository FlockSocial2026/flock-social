"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Announcement = { id: string; title: string; body: string; audience: string; published_at: string };
type EventItem = { id: string; title: string; description?: string | null; starts_at: string; location?: string | null };

export default function FlockPage() {
  const [token, setToken] = useState<string | null>(null);
  const [church, setChurch] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [churchSlug, setChurchSlug] = useState("");
  const [msg, setMsg] = useState("");

  const load = async (accessToken: string) => {
    const churchRes = await fetch("/api/flock/church", { headers: { Authorization: `Bearer ${accessToken}` } });
    const churchJson = await churchRes.json();
    setChurch(churchJson.church ?? null);
    setRole(churchJson.membership?.role ?? null);

    const annRes = await fetch("/api/flock/announcements", { headers: { Authorization: `Bearer ${accessToken}` } });
    const annJson = await annRes.json();
    setAnnouncements(annJson.items ?? []);

    const eventRes = await fetch("/api/flock/events", { headers: { Authorization: `Bearer ${accessToken}` } });
    const eventJson = await eventRes.json();
    setEvents(eventJson.items ?? []);
  };

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      setToken(t);
      await load(t);
    };
    boot();
  }, []);

  const connect = async () => {
    if (!token || !churchSlug.trim()) return;
    const res = await fetch("/api/flock/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ churchSlug: churchSlug.trim().toLowerCase() }),
    });
    if (!res.ok) {
      setMsg(`Connect failed: ${await res.text()}`);
      return;
    }
    setMsg("Connected to church.");
    await load(token);
  };

  const rsvp = async (eventId: string, status: "going" | "maybe" | "not_going") => {
    if (!token) return;
    const res = await fetch(`/api/flock/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setMsg(`RSVP failed: ${await res.text()}`);
      return;
    }
    setMsg(`RSVP saved: ${status}`);
  };

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Flock</h1>
        <div style={{ display: "flex", gap: 10 }}>
          {(role === "pastor_staff" || role === "church_admin") && <Link href="/flock/admin">Admin Console</Link>}
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
      </div>

      {msg ? <p>{msg}</p> : null}

      {!church ? (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h3>Connect to your church</h3>
          <input
            placeholder="church slug (example: first-baptist-miami)"
            value={churchSlug}
            onChange={(e) => setChurchSlug(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <button onClick={connect}>Connect</button>
        </section>
      ) : (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>{church.name}</h3>
          <p style={{ color: "#666" }}>
            {church.city ?? ""} {church.state ?? ""} • role: {role}
          </p>
        </section>
      )}

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Announcements</h3>
        {announcements.length === 0 ? <p style={{ color: "#666" }}>No announcements yet.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {announcements.map((a) => (
            <div key={a.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{new Date(a.published_at).toLocaleString()}</div>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>
        {events.length === 0 ? <p style={{ color: "#666" }}>No events yet.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {events.map((e) => (
            <div key={e.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {new Date(e.starts_at).toLocaleString()} {e.location ? `• ${e.location}` : ""}
              </div>
              {e.description ? <p>{e.description}</p> : null}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => rsvp(e.id, "going")}>Going</button>
                <button onClick={() => rsvp(e.id, "maybe")}>Maybe</button>
                <button onClick={() => rsvp(e.id, "not_going")}>Not Going</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
