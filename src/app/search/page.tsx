import Link from "next/link";

export default function SearchPage() {
  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <h1>Search</h1>
      <p>Global search scaffolded (people, groups, churches, events).</p>
      <Link href="/dashboard">Back to Dashboard</Link>
    </main>
  );
}
