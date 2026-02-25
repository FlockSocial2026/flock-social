"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type SearchMode = "all" | "users" | "posts";
type SortMode = "relevance" | "recent";

const normalize = (v: string) => v.trim().toLowerCase();

const userScore = (u: Profile, term: string) => {
  const uname = normalize(u.username ?? "");
  const full = normalize(u.full_name ?? "");
  let score = 0;

  if (uname === term) score += 120;
  if (full === term) score += 100;
  if (uname.startsWith(term)) score += 70;
  if (full.startsWith(term)) score += 50;
  if (uname.includes(term)) score += 30;
  if (full.includes(term)) score += 20;

  return score;
};

const postScore = (p: Post, term: string) => {
  const text = normalize(p.content);
  let score = 0;

  if (text.startsWith(term)) score += 40;
  if (text.includes(term)) score += 20;

  const ageHours = Math.max(0, (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60));
  const recencyBoost = Math.max(0, 24 - ageHours);
  score += recencyBoost;

  return score;
};

export default function DiscoverPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");

  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map());

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/auth/login");
    };
    checkSession();
  }, [router]);

  const search = async () => {
    const termRaw = q.trim();
    if (!termRaw) {
      setUsers([]);
      setPosts([]);
      setMsg("Type something to search.");
      return;
    }

    const term = normalize(termRaw);

    setLoading(true);
    setMsg("");

    const shouldSearchUsers = searchMode === "all" || searchMode === "users";
    const shouldSearchPosts = searchMode === "all" || searchMode === "posts";

    let foundUsers: Profile[] = [];
    let foundPosts: Post[] = [];

    if (shouldSearchUsers) {
      const { data: usersData, error: usersErr } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .or(`username.ilike.%${termRaw}%,full_name.ilike.%${termRaw}%`)
        .limit(30);

      if (usersErr) {
        setMsg(`User search error: ${usersErr.message}`);
        setLoading(false);
        return;
      }

      foundUsers = (usersData ?? []) as Profile[];

      if (sortMode === "relevance") {
        foundUsers = foundUsers.sort((a, b) => userScore(b, term) - userScore(a, term));
      }
    }

    if (shouldSearchPosts) {
      const { data: postsData, error: postsErr } = await supabase
        .from("posts")
        .select("id,user_id,content,image_url,created_at")
        .ilike("content", `%${termRaw}%`)
        .order("created_at", { ascending: false })
        .limit(40);

      if (postsErr) {
        setMsg(`Post search error: ${postsErr.message}`);
        setLoading(false);
        return;
      }

      foundPosts = (postsData ?? []) as Post[];

      if (sortMode === "relevance") {
        foundPosts = foundPosts.sort((a, b) => postScore(b, term) - postScore(a, term));
      }
    }

    const ids = Array.from(new Set(foundPosts.map((p) => p.user_id)));
    let map = new Map<string, Profile>();

    if (ids.length > 0) {
      const { data: authorProfiles, error: authorErr } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", ids);

      if (!authorErr) {
        map = new Map((authorProfiles as Profile[]).map((p) => [p.id, p]));
      }
    }

    setUsers(foundUsers);
    setPosts(foundPosts);
    setProfileMap(map);

    track("discover_search", {
      term: termRaw,
      mode: searchMode,
      sort: sortMode,
      users: foundUsers.length,
      posts: foundPosts.length,
    });

    if (foundUsers.length === 0 && foundPosts.length === 0) {
      setMsg("No results yet. Try a broader keyword.");
    }

    setLoading(false);
  };

  const authorLabel = (userId: string) => {
    const p = profileMap.get(userId);
    if (!p) return `user:${userId.slice(0, 8)}...`;
    if (p.full_name && p.username) return `${p.full_name} (@${p.username})`;
    if (p.username) return `@${p.username}`;
    if (p.full_name) return p.full_name;
    return `user:${userId.slice(0, 8)}...`;
  };

  const authorUsername = (userId: string) => profileMap.get(userId)?.username ?? null;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Discover</h1>
          <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "6px 10px", background: "#111827", color: "#fff" }}>
            STEP 911
          </span>
        </div>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users or posts..."
          style={{ flex: 1, padding: 10 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <button onClick={search} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {([
          { key: "all", label: "All" },
          { key: "users", label: "Users" },
          { key: "posts", label: "Posts" },
        ] as const).map((item) => {
          const active = searchMode === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSearchMode(item.key)}
              style={{
                border: active ? "1px solid #111827" : "1px solid #d1d5db",
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}

        {([
          { key: "relevance", label: "Sort: Relevance" },
          { key: "recent", label: "Sort: Recent" },
        ] as const).map((item) => {
          const active = sortMode === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSortMode(item.key)}
              style={{
                border: active ? "1px solid #1d4ed8" : "1px solid #d1d5db",
                background: active ? "#eff6ff" : "#fff",
                color: active ? "#1d4ed8" : "#111827",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280" }}>
        Results: {users.length} users • {posts.length} posts
      </p>

      {msg ? <p style={{ marginBottom: 12 }}>{msg}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16 }}>
        <section>
          <h2 style={{ marginBottom: 10 }}>Users</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u) => (
              <div key={u.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{u.full_name || "Unnamed"}</div>
                <div style={{ color: "#666", marginBottom: 6 }}>@{u.username}</div>
                {u.username ? <Link href={`/u/${encodeURIComponent(u.username)}`}>View Profile</Link> : null}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: 10 }}>Posts</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((p) => {
              const uname = authorUsername(p.user_id);
              return (
                <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                    {uname ? (
                      <Link href={`/u/${encodeURIComponent(uname)}`}>{authorLabel(p.user_id)}</Link>
                    ) : (
                      authorLabel(p.user_id)
                    )}{" "}
                    • {new Date(p.created_at).toLocaleString()}
                  </div>
                  <div style={{ marginBottom: 8 }}>{p.content}</div>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt="post"
                      style={{ maxWidth: "100%", borderRadius: 8 }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
