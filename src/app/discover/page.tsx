"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

export default function DiscoverPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
    const term = q.trim();
    if (!term) {
      setUsers([]);
      setPosts([]);
      setMsg("Type something to search.");
      return;
    }

    setLoading(true);
    setMsg("");

    // Users search
    const { data: usersData, error: usersErr } = await supabase
      .from("profiles")
      .select("id,username,full_name")
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(20);

    if (usersErr) {
      setMsg(`User search error: ${usersErr.message}`);
      setLoading(false);
      return;
    }

    // Posts search
    const { data: postsData, error: postsErr } = await supabase
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .ilike("content", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (postsErr) {
      setMsg(`Post search error: ${postsErr.message}`);
      setLoading(false);
      return;
    }

    const foundUsers = (usersData ?? []) as Profile[];
    const foundPosts = (postsData ?? []) as Post[];

    // Map profiles for post authors
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
        <h1>Discover</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
