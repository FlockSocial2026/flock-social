import Link from "next/link";

export default function GroupsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 12px", fontFamily: "Arial, sans-serif" }}>
      <h1>Groups</h1>
      <p>Community groups surface scaffolded for Step 42.</p>
      <Link href="/dashboard">Back to Dashboard</Link>
    </main>
  );
}
