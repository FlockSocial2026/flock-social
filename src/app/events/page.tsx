"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};

type RSVPStatus = "going" | "maybe" | "not_going";

const rsvpOptions: RSVPStatus[] = ["going", "maybe", "not_going"];

export default function EventsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvpMap, setRsvpMap] = useState<Record<string, RSVPStatus | undefined>>({});
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [nowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const boot = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/auth/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const t = sessionData.session?.access_token;
      if (!t) return;
      setToken(t);

      const res = await fetch("/api/flock/events?page=1&pageSize=50", {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!res.ok) {
        setMsg("Unable to load events.");
        return;
      }

      const json = await res.json();
      setEvents((json.items ?? []) as EventRow[]);
    };

    boot();
  }, [router]);

  const upcomingCount = useMemo(
    () => events.filter((event) => new Date(event.starts_at).getTime() >= nowTs).length,
    [events, nowTs]
  );

  const submitRsvp = async (eventId: string, status: RSVPStatus) => {
    if (!token) return;

    setBusyEventId(eventId);
    setMsg("");

    const res = await fetch(`/api/flock/events/${encodeURIComponent(eventId)}/rsvp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setMsg(`RSVP failed for event ${eventId.slice(0, 8)}...`);
      setBusyEventId(null);
      return;
    }

    setRsvpMap((prev) => ({ ...prev, [eventId]: status }));
    setBusyEventId(null);
    setMsg(`RSVP updated: ${status.replace("_", " ")}.`);
  };

  return (
    <main style={{ maxWidth: 920, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>Events</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Church event stream + RSVP workflow.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "6px 10px", background: "#111827", color: "#fff" }}>
              STEP 912
            </span>
            <Link href="/dashboard">Back to Dashboard</Link>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <p style={{ margin: 0, color: "#374151" }}>
          <strong>{events.length}</strong> total events • <strong>{upcomingCount}</strong> upcoming
        </p>
        {msg ? <p style={{ marginBottom: 0 }}>{msg}</p> : null}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        {events.length === 0 ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, color: "#6b7280" }}>
            No events yet. Church staff can publish events from Flock Admin.
          </div>
        ) : (
          events.map((event) => {
            const selected = rsvpMap[event.id];
            const isBusy = busyEventId === event.id;

            return (
              <article key={event.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>{event.title}</h3>
                <p style={{ margin: "0 0 6px", color: "#374151" }}>
                  {new Date(event.starts_at).toLocaleString()}
                  {event.ends_at ? ` - ${new Date(event.ends_at).toLocaleString()}` : ""}
                </p>
                {event.location ? <p style={{ margin: "0 0 6px", color: "#4b5563" }}>Location: {event.location}</p> : null}
                {event.description ? <p style={{ margin: "0 0 10px" }}>{event.description}</p> : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {rsvpOptions.map((option) => {
                    const active = selected === option;
                    return (
                      <button
                        key={option}
                        onClick={() => submitRsvp(event.id, option)}
                        disabled={isBusy}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 999,
                          border: active ? "1px solid #111827" : "1px solid #d1d5db",
                          background: active ? "#111827" : "#fff",
                          color: active ? "#fff" : "#111827",
                          cursor: "pointer",
                        }}
                      >
                        {option.replace("_", " ")}
                      </button>
                    );
                  })}
                  {selected ? <span style={{ fontSize: 12, color: "#166534" }}>Your RSVP: {selected.replace("_", " ")}</span> : null}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
