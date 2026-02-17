"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
  } | null;
};

export default function FeedPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [msg, setMsg] = useState("");

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles:profiles!posts_user_id_fkey (
          username,
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(`Load error: ${error.message}`);
      return;
    }

    setPosts((data as FeedPost[]) ?? []);
  };

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      await loadPosts();
    };
    boot();
  }, [router]);

  const createPost = async () => {
    const text = content.trim();
    if (!text) return setMsg("Post cannot be empty.");
    if (text.length > 280) return setMsg("Post must be 280 chars or less.");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setMsg("Posting...");
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: text,
    });

    if (error) {
      setMsg(`Create error: ${error.message}`);
      return;
    }

    setContent("");
    setMsg("Posted.");
    await loadPosts();
  };

  const formatAuthor = (p: FeedPost) => {
    const username = p.profiles?.username?.trim();
    const fullName = p.profiles?.full_name?.trim();

    if (username && fullName) return `${fullName} (@${username})`;
    if (username) return `@${username}`;
    if (fullName) return fullName;
    return `user:${p.user_id.slice(0, 8)}...`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Feed</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <textarea
        placeholder="What's happening?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={280}
        rows={4}
        style={{ width: "100%", padding: 10, marginBottom: 8 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <small>{content.length}/280</small>
        <button onClick={createPost}>Post</button>
      </div>

      {msg ? <p style={{ marginBottom: 16 }}>{msg}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {posts.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {formatAuthor(p)} • {formatTime(p.created_at)}
            </div>
            <div>{p.content}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
