import Link from "next/link";

export default function EventsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <h1>Events</h1>
      <p>Events index scaffolded. Use Flock tab for church events and RSVP.</p>
      <Link href="/dashboard">Back to Dashboard</Link>
    </main>
  );
}
