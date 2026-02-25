"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Thread = {
  id: string;
  name: string;
  unread: number;
  lastAt: string;
};

type Message = {
  id: string;
  threadId: string;
  body: string;
  sender: "me" | "them";
  at: string;
};

const initialThreads: Thread[] = [
  { id: "t-1", name: "Pastor Samuel", unread: 1, lastAt: "2m ago" },
  { id: "t-2", name: "Prayer Team", unread: 0, lastAt: "18m ago" },
  { id: "t-3", name: "Community Group Leaders", unread: 3, lastAt: "1h ago" },
];

const initialMessages: Message[] = [
  {
    id: "m-1",
    threadId: "t-1",
    sender: "them",
    body: "Can you share Sunday's volunteer count before 6pm?",
    at: "Today 2:01 PM",
  },
  {
    id: "m-2",
    threadId: "t-2",
    sender: "them",
    body: "Tonight prayer circle starts at 7:30 PM in Room B.",
    at: "Today 1:44 PM",
  },
  {
    id: "m-3",
    threadId: "t-3",
    sender: "them",
    body: "Please confirm next week's small-group host locations.",
    at: "Today 1:02 PM",
  },
];

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreads[0].id);
  const [draft, setDraft] = useState<string>("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId]
  );

  const activeMessages = useMemo(
    () => messages.filter((message) => message.threadId === activeThread?.id),
    [messages, activeThread?.id]
  );

  const unreadTotal = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unread, 0),
    [threads]
  );

  const openThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setThreads((prev) => prev.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread)));
  };

  const sendMessage = () => {
    if (!activeThread || draft.trim().length === 0) return;

    const text = draft.trim();
    const nextMessage: Message = {
      id: `m-${Date.now()}`,
      threadId: activeThread.id,
      sender: "me",
      body: text,
      at: new Date().toLocaleString(),
    };

    setMessages((prev) => [...prev, nextMessage]);
    setThreads((prev) => prev.map((thread) => (thread.id === activeThread.id ? { ...thread, lastAt: "just now" } : thread)));
    setDraft("");
  };

  return (
    <main style={{ maxWidth: 1100, margin: "42px auto", fontFamily: "Arial, sans-serif", padding: "0 16px 32px" }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>Messages</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Live thread selection + send workflow (Step 908).</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: unreadTotal > 0 ? "#92400e" : "#166534" }}>
              {unreadTotal} unread total
            </span>
            <Link href="/dashboard">Back to Dashboard</Link>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Conversation Threads</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {threads.map((thread) => {
              const active = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread.id)}
                  style={{
                    textAlign: "left",
                    border: active ? "1px solid #111827" : "1px solid #eceff3",
                    borderRadius: 10,
                    padding: 10,
                    background: active ? "#f9fafb" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong>{thread.name}</strong>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>{thread.lastAt}</span>
                  </div>
                  {thread.unread > 0 ? (
                    <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>{thread.unread} unread</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#166534" }}>up to date</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{activeThread?.name ?? "Thread"}</h3>

          <div
            style={{
              border: "1px solid #eceff3",
              borderRadius: 10,
              padding: 10,
              minHeight: 260,
              maxHeight: 400,
              overflowY: "auto",
              display: "grid",
              gap: 8,
              marginBottom: 12,
              background: "#fcfcfd",
            }}
          >
            {activeMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  justifySelf: message.sender === "me" ? "end" : "start",
                  maxWidth: "80%",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: message.sender === "me" ? "#111827" : "#fff",
                  color: message.sender === "me" ? "#fff" : "#111827",
                }}
              >
                <div style={{ fontSize: 14 }}>{message.body}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{message.at}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <textarea
              placeholder="Write a message..."
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{draft.length}/1000</span>
              <button onClick={sendMessage} style={{ width: 140, padding: "8px 10px" }} disabled={draft.trim().length === 0}>
                Send
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
