import Link from "next/link";

export default function PrayerPage() {
  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <h1>Prayer</h1>
      <p>Prayer requests and updates hub (Top 100 leaderboard planned for later phase).</p>
      <Link href="/dashboard">Back to Dashboard</Link>
    </main>
  );
}
