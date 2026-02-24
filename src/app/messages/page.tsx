"use client";

import Link from "next/link";

const seededThreads = [
  {
    id: "t-1",
    name: "Pastor Samuel",
    preview: "Can you share Sunday's volunteer count before 6pm?",
    time: "2m ago",
    unread: 1,
  },
  {
    id: "t-2",
    name: "Prayer Team",
    preview: "Tonight prayer circle starts at 7:30 PM in Room B.",
    time: "18m ago",
    unread: 0,
  },
  {
    id: "t-3",
    name: "Community Group Leaders",
    preview: "Please confirm next week's small-group host locations.",
    time: "1h ago",
    unread: 3,
  },
];

export default function MessagesPage() {
  return (
    <main style={{ maxWidth: 920, margin: "42px auto", fontFamily: "Arial, sans-serif", padding: "0 16px 32px" }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>Messages</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Inbox scaffold for church communication workflows.</p>
          </div>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Conversation Threads</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {seededThreads.map((thread) => (
            <div key={thread.id} style={{ border: "1px solid #eceff3", borderRadius: 10, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong>{thread.name}</strong>
                <span style={{ color: "#6b7280", fontSize: 12 }}>{thread.time}</span>
              </div>
              <p style={{ margin: "0 0 8px", color: "#374151" }}>{thread.preview}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={{ padding: "6px 10px" }}>Open</button>
                <button style={{ padding: "6px 10px" }}>Mark Read</button>
                {thread.unread > 0 ? (
                  <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>{thread.unread} unread</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#166534" }}>up to date</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>Compose (next increment)</h3>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          This is a visual scaffold. Next step wires live thread data + send workflow.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <input placeholder="Recipient group or member" style={{ padding: 10 }} disabled />
          <textarea placeholder="Write a message..." rows={4} style={{ padding: 10 }} disabled />
          <button style={{ width: 140, padding: "8px 10px" }} disabled>
            Send (coming soon)
          </button>
        </div>
      </section>
    </main>
  );
}
