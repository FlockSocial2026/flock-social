"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RSVPStatus = "going" | "maybe" | "not_going";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  my_rsvp: RSVPStatus | null;
  rsvp_summary: {
    going: number;
    maybe: number;
    not_going: number;
    total: number;
  };
};

type EventFilter = "all" | "upcoming" | "past" | "my_going" | "my_maybe" | "my_not_going";
type EventSort = "soonest" | "latest" | "most_responses";

const rsvpOptions: RSVPStatus[] = ["going", "maybe", "not_going"];

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvpMap, setRsvpMap] = useState<Record<string, RSVPStatus | undefined>>({});
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [nowTs] = useState<number>(() => Date.now());
  const [filterMode, setFilterMode] = useState<EventFilter>(() => {
    const focus = searchParams.get("focus");
    if (focus === "upcoming") return "upcoming";
    if (focus === "my") return "my_going";
    return "all";
  });
  const [sortMode, setSortMode] = useState<EventSort>("soonest");
  const apiFilter = filterMode === "all" || filterMode === "upcoming" || filterMode === "past" ? filterMode : "all";
  const apiSort = sortMode === "latest" ? "latest" : "soonest";

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
    };

    boot();
  }, [router]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!token) return;

      const res = await fetch(`/api/flock/events?page=1&pageSize=50&filter=${encodeURIComponent(apiFilter)}&sort=${encodeURIComponent(apiSort)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setMsg("Unable to load events.");
        return;
      }

      const json = await res.json();
      const rows = (json.items ?? []) as EventRow[];
      setEvents(rows);

      const initialRsvp: Record<string, RSVPStatus | undefined> = {};
      for (const row of rows) {
        if (row.my_rsvp) initialRsvp[row.id] = row.my_rsvp;
      }
      setRsvpMap(initialRsvp);
    };

    loadEvents();
  }, [token, apiFilter, apiSort]);

  const upcomingCount = useMemo(
    () => events.filter((event) => new Date(event.starts_at).getTime() >= nowTs).length,
    [events, nowTs]
  );

  const filteredEvents = useMemo(() => {
    if (filterMode === "all") return events;
    if (filterMode === "upcoming") return events.filter((event) => new Date(event.starts_at).getTime() >= nowTs);
    if (filterMode === "past") return events.filter((event) => new Date(event.starts_at).getTime() < nowTs);
    if (filterMode === "my_going") return events.filter((event) => (rsvpMap[event.id] ?? event.my_rsvp) === "going");
    if (filterMode === "my_maybe") return events.filter((event) => (rsvpMap[event.id] ?? event.my_rsvp) === "maybe");
    return events.filter((event) => (rsvpMap[event.id] ?? event.my_rsvp) === "not_going");
  }, [events, filterMode, nowTs, rsvpMap]);

  const sortedEvents = useMemo(() => {
    const rows = [...filteredEvents];
    if (sortMode === "latest") {
      rows.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
      return rows;
    }
    if (sortMode === "most_responses") {
      rows.sort((a, b) => (b.rsvp_summary?.total ?? 0) - (a.rsvp_summary?.total ?? 0));
      return rows;
    }
    rows.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return rows;
  }, [filteredEvents, sortMode]);

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
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;

        const oldStatus = rsvpMap[eventId];
        const nextSummary = { ...event.rsvp_summary };

        if (oldStatus) {
          nextSummary[oldStatus] = Math.max(0, nextSummary[oldStatus] - 1);
          nextSummary.total = Math.max(0, nextSummary.total - 1);
        }

        nextSummary[status] += 1;
        nextSummary.total += 1;

        return { ...event, my_rsvp: status, rsvp_summary: nextSummary };
      })
    );

    setBusyEventId(null);
    setMsg(`RSVP updated: ${status.replace("_", " ")}.`);
  };

  return (
    <main style={{ maxWidth: 920, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>Events</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Church event stream + RSVP workflow with attendance signals.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "6px 10px", background: "#111827", color: "#fff" }}>
              STEP 921
            </span>
            <Link href="/dashboard">Back to Dashboard</Link>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <p style={{ margin: 0, color: "#374151" }}>
          <strong>{events.length}</strong> total events • <strong>{upcomingCount}</strong> upcoming
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {(["all", "upcoming", "past", "my_going", "my_maybe", "my_not_going"] as const).map((mode) => {
            const active = filterMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                style={{
                  border: active ? "1px solid #111827" : "1px solid #d1d5db",
                  background: active ? "#111827" : "#fff",
                  color: active ? "#fff" : "#111827",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {mode.split("_").join(" ")}
              </button>
            );
          })}
          {([
            { key: "soonest", label: "Sort: Soonest" },
            { key: "latest", label: "Sort: Latest" },
            { key: "most_responses", label: "Sort: Most Responses" },
          ] as const).map((item) => {
            const active = sortMode === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSortMode(item.key)}
                style={{
                  border: active ? "1px solid #1d4ed8" : "1px solid #d1d5db",
                  background: active ? "#eff6ff" : "#fff",
                  color: active ? "#1d4ed8" : "#111827",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {msg ? <p style={{ marginBottom: 0 }}>{msg}</p> : null}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        {sortedEvents.length === 0 ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, color: "#6b7280" }}>
            No events in this view yet. Church staff can publish events from Flock Admin.
          </div>
        ) : (
          sortedEvents.map((event) => {
            const selected = rsvpMap[event.id] ?? event.my_rsvp ?? undefined;
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

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
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

                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                  Attendance signal: {event.rsvp_summary.going} going • {event.rsvp_summary.maybe} maybe • {event.rsvp_summary.not_going} not going • {event.rsvp_summary.total} total responses
                </p>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
