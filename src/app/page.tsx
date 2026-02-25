import Link from "next/link";

const liveFeatures = [
  "Church identity + connection (Flock)",
  "Announcements + events + RSVP flows",
  "Role-based admin controls (member, group leader, pastor/staff, church admin)",
  "Pilot metrics snapshot + trend deltas",
  "Moderation queue + audit + summary cron foundation",
  "Dashboard recent activity filters + quick actions",
  "Church admin broadcast-to-inbox draft bridge",
  "Discover relevance ranking + mode filters",
  "Events stream + RSVP interaction workflow",
  "Event attendance signal summaries (going/maybe/not going)",
  "Admin event attendance drilldown + CSV export",
  "Execution console + event outreach runbook linkage",
];

const BUILD_STAMP = "2026-02-25T17:28-EST";

const nextBuildItems = [
  "Messages live data + send flow",
  "Church admin broadcast + inbox bridge",
  "Search quality and discovery ranking improvements",
  "Prayer leaderboard release (currently gated)",
];

export default function HomePage() {
  return (
    <main style={{ maxWidth: 980, margin: "42px auto", fontFamily: "Arial, sans-serif", padding: "0 16px 40px" }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 20,
          marginBottom: 18,
          background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Flock Social</h1>
            <p style={{ margin: 0, color: "#4b5563", maxWidth: 700 }}>
              Faith-centered community platform for churches: community feed, prayer, groups, events, and church operations.
            </p>
          </div>
          <span
            style={{
              background: "#111827",
              color: "white",
              fontSize: 12,
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
            title={`build ${BUILD_STAMP}`}
          >
            Build status: Steps 925-930 complete
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <Link
            href="/auth/login"
            style={{
              padding: "10px 14px",
              border: "1px solid #111827",
              borderRadius: 8,
              textDecoration: "none",
              background: "#111827",
              color: "white",
            }}
          >
            Log In
          </Link>

          <Link
            href="/auth/signup"
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Sign Up
          </Link>

          <Link
            href="/discover"
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Explore Discover
          </Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Live Now</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.5 }}>
            {liveFeatures.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Next Visible Ship Targets</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.5 }}>
            {nextBuildItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Where to check progress</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.5 }}>
            <li>
              <Link href="/dashboard">Dashboard</Link> (after login)
            </li>
            <li>
              <Link href="/flock">Flock</Link> (church connect + announcements/events)
            </li>
            <li>
              <Link href="/flock/admin">Flock Admin</Link> (role-based)
            </li>
            <li>
              <Link href="/events">Events</Link>, <Link href="/messages">Messages</Link>, and <Link href="/prayer">Prayer</Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
