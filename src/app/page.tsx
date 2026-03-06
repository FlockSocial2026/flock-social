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
  "Wild-beta attendance control tower playbook",
  "Dispatch logging + conversion risk operations",
  "Cron-backed reminder and snapshot automation endpoints",
];

const BUILD_STAMP = "2026-03-06T12:47-EST";

const nextBuildItems = [
  "Messages live data + send flow",
  "Church admin broadcast + inbox bridge",
  "Search quality and discovery ranking improvements",
  "Prayer leaderboard release (currently gated)",
];

export default function HomePage() {
  return (
    <main className="app-shell" style={{ maxWidth: 980, paddingBottom: 40 }}>
      <section className="card" style={{ padding: 22, marginBottom: 18, background: "linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)" }}>
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <span className="auth-eyebrow" style={{ marginBottom: 10 }}>Live Product Preview</span>
            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(1.8rem, 3vw, 2.3rem)" }}>Flock Social</h1>
            <p className="small-muted" style={{ margin: 0, maxWidth: 700, fontSize: 15 }}>
              Faith-centered community platform for churches: community feed, prayer, groups, events, and church operations.
            </p>
          </div>
          <span className="badge-dark" title={`build ${BUILD_STAMP}`}>
            Build status: Steps 1068-1069 design pass complete
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <Link href="/auth/login" className="btn-primary" style={{ textDecoration: "none" }}>
            Log In
          </Link>

          <Link
            href="/auth/signup"
            style={{
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              textDecoration: "none",
              color: "#0f172a",
              background: "#fff",
            }}
          >
            Sign Up
          </Link>

          <Link
            href="/discover"
            style={{
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              textDecoration: "none",
              color: "#0f172a",
              background: "#fff",
            }}
          >
            Explore Discover
          </Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Live Now</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.6 }}>
            {liveFeatures.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Next Visible Ship Targets</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.6 }}>
            {nextBuildItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Where to check progress</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#1f2937", lineHeight: 1.6 }}>
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
