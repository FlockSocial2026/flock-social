"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type FeedItem = Post & {
  profile: Profile | null;
  likeCount: number;
  likedByMe: boolean;
};

type LikeRow = {
  post_id: string;
  user_id: string;
};

export default function FeedPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<string | null>(null);

  const loadPosts = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setMe(user.id);

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id,user_id,content,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postError) {
      setMsg(`Load error: ${postError.message}`);
      return;
    }

    const basePosts = (postData ?? []) as Post[];
    const userIds = Array.from(new Set(basePosts.map((p) => p.user_id)));
    const postIds = basePosts.map((p) => p.id);

    let profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", userIds);

      if (profileError) {
        setMsg(`Profile load error: ${profileError.message}`);
        return;
      }

      profileMap = new Map((profileData as Profile[]).map((p) => [p.id, p]));
    }

    let likeRows: LikeRow[] = [];
    if (postIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id,user_id")
        .in("post_id", postIds);

      if (likesError) {
        setMsg(`Likes load error: ${likesError.message}`);
        return;
      }

      likeRows = (likesData ?? []) as LikeRow[];
    }

    const likeCountByPost = new Map<string, number>();
    const likedByMeSet = new Set<string>();

    for (const l of likeRows) {
      likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1);
      if (l.user_id === user.id) likedByMeSet.add(l.post_id);
    }

    const merged: FeedItem[] = basePosts.map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id) ?? null,
      likeCount: likeCountByPost.get(p.id) ?? 0,
      likedByMe: likedByMeSet.has(p.id),
    }));

    setPosts(merged);
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

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!me) return;

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", me);

      if (error) return setMsg(`Unlike error: ${error.message}`);
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: me,
      });

      if (error) return setMsg(`Like error: ${error.message}`);
    }

    await loadPosts();
  };

  const formatAuthor = (p: FeedItem) => {
    const username = p.profile?.username?.trim();
    const fullName = p.profile?.full_name?.trim();

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
            <div style={{ marginBottom: 10 }}>{p.content}</div>
            <button onClick={() => toggleLike(p.id, p.likedByMe)}>
              {p.likedByMe ? "Unlike" : "Like"} ({p.likeCount})
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
