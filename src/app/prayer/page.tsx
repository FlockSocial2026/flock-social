import Link from "next/link";

export default function PrayerPage() {
  return (
    <main className="app-shell section-carbon" style={{ maxWidth: 720 }}>
      <section className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>Prayer</h1>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
        <p className="small-muted" style={{ margin: 0 }}>
          Prayer requests and updates hub (Top 100 leaderboard planned for later phase).
        </p>
      </section>
    </main>
  );
}
