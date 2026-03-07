import Link from "next/link";

export default function GroupsPage() {
  return (
    <main className="app-shell section-carbon" style={{ maxWidth: 720 }}>
      <section className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>Groups</h1>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
        <p className="small-muted" style={{ margin: 0 }}>Community groups surface scaffolded for Step 42.</p>
      </section>
    </main>
  );
}
