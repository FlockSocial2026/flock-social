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

const BUILD_STAMP = "2026-03-06T16:50-EST";

const nextBuildItems = [
  "Messages live data + send flow",
  "Church admin broadcast + inbox bridge",
  "Search quality and discovery ranking improvements",
  "Prayer leaderboard release (currently gated)",
];

export default function HomePage() {
  return (
    <main className="app-shell" style={{ maxWidth: 1080, paddingBottom: 40 }}>
      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
          backgroundImage: "linear-gradient(rgba(10,12,18,0.55), rgba(10,12,18,0.72)), url('/branding/home-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderColor: "rgba(255,206,132,0.45)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <span className="auth-eyebrow" style={{ marginBottom: 10 }}>Live Product Preview</span>
            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(2rem, 3vw, 2.6rem)", color: "#f8ecd1" }}>Flock Social</h1>
            <p style={{ margin: 0, maxWidth: 700, fontSize: 16, color: "#e2e8f0" }}>
              Faith-centered community platform for churches: community feed, prayer, groups, events, and church operations.
            </p>
          </div>
          <span className="badge-dark" title={`build ${BUILD_STAMP}`} style={{ background: "rgba(15,23,42,0.88)", border: "1px solid rgba(255,206,132,0.35)" }}>
            Build status: Steps 1070-1073 design pass complete
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/auth/login" className="btn-primary" style={{ textDecoration: "none" }}>
            Log In
          </Link>

          <Link
            href="/auth/signup"
            style={{
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 10,
              textDecoration: "none",
              color: "#f8fafc",
              background: "rgba(15,23,42,0.55)",
            }}
          >
            Sign Up
          </Link>

          <Link
            href="/discover"
            style={{
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 10,
              textDecoration: "none",
              color: "#f8fafc",
              background: "rgba(15,23,42,0.55)",
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
