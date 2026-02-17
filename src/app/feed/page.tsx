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

type LikeRow = {
  post_id: string;
  user_id: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type FeedItem = Post & {
  profile: Profile | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: Array<CommentRow & { profile: Profile | null }>;
};

export default function FeedPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

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

    // Profiles for post authors
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

    // Likes
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

    // Comments (latest 3 per post)
    let commentRows: CommentRow[] = [];
    if (postIds.length > 0) {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id,post_id,user_id,content,created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: false });

      if (commentsError) {
        setMsg(`Comments load error: ${commentsError.message}`);
        return;
      }

      commentRows = (commentsData ?? []) as CommentRow[];
    }

    // Pull profiles for comment authors too
    const commentAuthorIds = Array.from(new Set(commentRows.map((c) => c.user_id)));
    const allProfileIds = Array.from(new Set([...userIds, ...commentAuthorIds]));

    if (allProfileIds.length > 0) {
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", allProfileIds);

      if (allProfilesError) {
        setMsg(`Comment profile load error: ${allProfilesError.message}`);
        return;
      }

      profileMap = new Map((allProfiles as Profile[]).map((p) => [p.id, p]));
    }

    const commentsByPost = new Map<string, CommentRow[]>();
    for (const c of commentRows) {
      const arr = commentsByPost.get(c.post_id) ?? [];
      arr.push(c);
      commentsByPost.set(c.post_id, arr);
    }

    const merged: FeedItem[] = basePosts.map((p) => {
      const fullComments = commentsByPost.get(p.id) ?? [];
      const latest3 = fullComments.slice(0, 3).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) ?? null,
      }));

      return {
        ...p,
        profile: profileMap.get(p.user_id) ?? null,
        likeCount: likeCountByPost.get(p.id) ?? 0,
        likedByMe: likedByMeSet.has(p.id),
        commentCount: fullComments.length,
        comments: latest3,
      };
    });

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

  const addComment = async (postId: string) => {
    if (!me) return;

    const raw = commentDrafts[postId] ?? "";
    const text = raw.trim();
    if (!text) return setMsg("Comment cannot be empty.");
    if (text.length > 280) return setMsg("Comment must be 280 chars or less.");

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: me,
      content: text,
    });

    if (error) return setMsg(`Comment error: ${error.message}`);

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    await loadPosts();
  };

  const formatAuthor = (profile: Profile | null, fallbackUserId: string) => {
    const username = profile?.username?.trim();
    const fullName = profile?.full_name?.trim();

    if (username && fullName) return `${fullName} (@${username})`;
    if (username) return `@${username}`;
    if (fullName) return fullName;
    return `user:${fallbackUserId.slice(0, 8)}...`;
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
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
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

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {formatAuthor(p.profile, p.user_id)} • {formatTime(p.created_at)}
            </div>

            <div style={{ marginBottom: 10 }}>{p.content}</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => toggleLike(p.id, p.likedByMe)}>
                {p.likedByMe ? "Unlike" : "Like"} ({p.likeCount})
              </button>
              <span style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>
                Comments ({p.commentCount})
              </span>
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              {p.comments.map((c) => (
                <div key={c.id} style={{ border: "1px solid #333", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                    {formatAuthor(c.profile, c.user_id)} • {formatTime(c.created_at)}
                  </div>
                  <div>{c.content}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Write a comment..."
                value={commentDrafts[p.id] ?? ""}
                onChange={(e) =>
                  setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                style={{ flex: 1, padding: 8 }}
                maxLength={280}
              />
              <button onClick={() => addComment(p.id)}>Comment</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
