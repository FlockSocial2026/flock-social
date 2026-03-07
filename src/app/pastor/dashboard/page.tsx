"use client";

import Link from "next/link";

export default function PastorDashboardPage() {
  return (
    <main className="app-shell" style={{ maxWidth: 860 }}>
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>Congregation Portal</h1>
          <Link href="/dashboard">Main Dashboard</Link>
        </div>
        <p className="small-muted" style={{ margin: 0 }}>
          Pastor tools for your personal church family: publish announcements, manage events, and send congregation-wide messages.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Announcements</h3>
          <p className="small-muted">Publish updates and weekly direction to your church family.</p>
          <Link href="/flock/admin">Open Admin Announcements</Link>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Events</h3>
          <p className="small-muted">Create and manage congregation events with RSVP tracking.</p>
          <Link href="/events">Open Events</Link>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Messages</h3>
          <p className="small-muted">Send role-aware follow-ups and direct congregation communication.</p>
          <Link href="/messages">Open Messages</Link>
        </div>
      </section>
    </main>
  );
}
