"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Post = { id: string; user_id: string; content: string; created_at: string; };
type Profile = { id: string; username: string | null; full_name: string | null; };
type LikeRow = { post_id: string; user_id: string; };
type CommentRow = { id: string; post_id: string; user_id: string; content: string; created_at: string; };
type FollowRow = { follower_id: string; following_id: string; };

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
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const loadPosts = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { router.push("/auth/login"); return; }
    setMe(user.id);

    const { data: followsData, error: followsError } = await supabase
      .from("follows")
      .select("follower_id,following_id")
      .eq("follower_id", user.id);

    if (followsError) { setMsg(`Follows load error: ${followsError.message}`); return; }

    const follows = (followsData ?? []) as FollowRow[];
    const following = new Set(follows.map((f) => f.following_id));
    setFollowingSet(following);

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id,user_id,content,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (postError) { setMsg(`Load error: ${postError.message}`); return; }

    let basePosts = (postData ?? []) as Post[];

    if (feedMode === "following") {
      basePosts = basePosts.filter((p) => p.user_id === user.id || following.has(p.user_id));
    }

    const userIds = Array.from(new Set(basePosts.map((p) => p.user_id)));
    const postIds = basePosts.map((p) => p.id);

    let profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles").select("id,username,full_name").in("id", userIds);
      if (profileError) { setMsg(`Profile load error: ${profileError.message}`); return; }
      profileMap = new Map((profileData as Profile[]).map((p) => [p.id, p]));
    }

    let likeRows: LikeRow[] = [];
    if (postIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes").select("post_id,user_id").in("post_id", postIds);
      if (likesError) { setMsg(`Likes load error: ${likesError.message}`); return; }
      likeRows = (likesData ?? []) as LikeRow[];
    }

    const likeCountByPost = new Map<string, number>();
    const likedByMeSet = new Set<string>();
    for (const l of likeRows) {
      likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1);
      if (l.user_id === user.id) likedByMeSet.add(l.post_id);
    }

    let commentRows: CommentRow[] = [];
    if (postIds.length > 0) {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id,post_id,user_id,content,created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: false });
      if (commentsError) { setMsg(`Comments load error: ${commentsError.message}`); return; }
      commentRows = (commentsData ?? []) as CommentRow[];
    }

    const commentAuthorIds = Array.from(new Set(commentRows.map((c) => c.user_id)));
    const allProfileIds = Array.from(new Set([...userIds, ...commentAuthorIds]));
    if (allProfileIds.length > 0) {
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles").select("id,username,full_name").in("id", allProfileIds);
      if (allProfilesError) { setMsg(`Comment profile load error: ${allProfilesError.message}`); return; }
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
      const latest3 = fullComments.slice(0, 3).map((c) => ({ ...c, profile: profileMap.get(c.user_id) ?? null }));
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
      if (!data.user) { router.push("/auth/login"); return; }
      await loadPosts();
    };
    boot();
  }, [router, feedMode]);

  const createPost = async () => {
    const text = content.trim();
    if (!text) return setMsg("Post cannot be empty.");
    if (text.length > 280) return setMsg("Post must be 280 chars or less.");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { router.push("/auth/login"); return; }

    const { error } = await supabase.from("posts").insert({ user_id: user.id, content: text });
    if (error) return setMsg(`Create error: ${error.message}`);

    setContent("");
    setMsg("Posted.");
    await loadPosts();
  };

  const toggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!me || targetUserId === me) return;
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", targetUserId);
      if (error) return setMsg(`Unfollow error: ${error.message}`);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: me, following_id: targetUserId });
      if (!error) {
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          actor_id: me,
          type: "follow",
        });
      }
      if (error) return setMsg(`Follow error: ${error.message}`);
    }
    await loadPosts();
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!me) return;
    if (liked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me);
      if (error) return setMsg(`Unlike error: ${error.message}`);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: me });
      if (!error) {
        const postOwner = posts.find((p) => p.id === postId)?.user_id;
        if (postOwner && postOwner !== me) {
          await supabase.from("notifications").insert({
            user_id: postOwner,
            actor_id: me,
            type: "like",
            post_id: postId,
          });
        }
      }
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

    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: me, content: text });
    if (!error) {
      const postOwner = posts.find((p) => p.id === postId)?.user_id;
      if (postOwner && postOwner !== me) {
        await supabase.from("notifications").insert({
          user_id: postOwner,
          actor_id: me,
          type: "comment",
          post_id: postId,
        });
      }
    }
    if (error) return setMsg(`Comment error: ${error.message}`);

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    await loadPosts();
  };

  const startEditPost = (postId: string, current: string) => { setEditingPostId(postId); setEditingPostContent(current); };
  const saveEditPost = async () => {
    if (!editingPostId || !me) return;
    const text = editingPostContent.trim();
    if (!text) return setMsg("Post cannot be empty.");
    if (text.length > 280) return setMsg("Post must be 280 chars or less.");
    const { error } = await supabase.from("posts").update({ content: text }).eq("id", editingPostId).eq("user_id", me);
    if (error) return setMsg(`Edit post error: ${error.message}`);
    setEditingPostId(null); setEditingPostContent(""); setMsg("Post updated."); await loadPosts();
  };
  const deletePost = async (postId: string) => {
    if (!me) return;
    if (!window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", me);
    if (error) return setMsg(`Delete post error: ${error.message}`);
    setMsg("Post deleted."); await loadPosts();
  };

  const startEditComment = (commentId: string, current: string) => { setEditingCommentId(commentId); setEditingCommentContent(current); };
  const saveEditComment = async () => {
    if (!editingCommentId || !me) return;
    const text = editingCommentContent.trim();
    if (!text) return setMsg("Comment cannot be empty.");
    if (text.length > 280) return setMsg("Comment must be 280 chars or less.");
    const { error } = await supabase.from("comments").update({ content: text }).eq("id", editingCommentId).eq("user_id", me);
    if (error) return setMsg(`Edit comment error: ${error.message}`);
    setEditingCommentId(null); setEditingCommentContent(""); setMsg("Comment updated."); await loadPosts();
  };
  const deleteComment = async (commentId: string) => {
    if (!me) return;
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", me);
    if (error) return setMsg(`Delete comment error: ${error.message}`);
    setMsg("Comment deleted."); await loadPosts();
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
    new Date(iso).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Feed</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setFeedMode("for_you")} disabled={feedMode === "for_you"}>For You</button>
        <button onClick={() => setFeedMode("following")} disabled={feedMode === "following"}>Following</button>
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
        {posts.map((p) => {
          const isMine = me === p.user_id;
          const isFollowing = followingSet.has(p.user_id);

          return (
            <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {formatAuthor(p.profile, p.user_id)} • {formatTime(p.created_at)}
                </div>
                {!isMine && (
                  <button onClick={() => toggleFollow(p.user_id, isFollowing)}>
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>

              {editingPostId === p.id ? (
                <div style={{ marginBottom: 10 }}>
                  <textarea value={editingPostContent} onChange={(e) => setEditingPostContent(e.target.value)} maxLength={280} rows={3}
                    style={{ width: "100%", padding: 8, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEditPost}>Save</button>
                    <button onClick={() => setEditingPostId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 10 }}>{p.content}</div>
              )}

              <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <button onClick={() => toggleLike(p.id, p.likedByMe)}>
                  {p.likedByMe ? "Unlike" : "Like"} ({p.likeCount})
                </button>
                <span style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>Comments ({p.commentCount})</span>
                {isMine && editingPostId !== p.id && (
                  <>
                    <button onClick={() => startEditPost(p.id, p.content)}>Edit Post</button>
                    <button onClick={() => deletePost(p.id)}>Delete Post</button>
                  </>
                )}
              </div>

              <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                {p.comments.map((c) => {
                  const myComment = me === c.user_id;
                  return (
                    <div key={c.id} style={{ border: "1px solid #333", borderRadius: 6, padding: 8 }}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                        {formatAuthor(c.profile, c.user_id)} • {formatTime(c.created_at)}
                      </div>

                      {editingCommentId === c.id ? (
                        <div>
                          <input value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} maxLength={280}
                            style={{ width: "100%", padding: 8, marginBottom: 8 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={saveEditComment}>Save</button>
                            <button onClick={() => setEditingCommentId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>{c.content}</div>
                      )}

                      {myComment && editingCommentId !== c.id && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={() => startEditComment(c.id, c.content)}>Edit</button>
                          <button onClick={() => deleteComment(c.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Write a comment..."
                  value={commentDrafts[p.id] ?? ""}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  style={{ flex: 1, padding: 8 }}
                  maxLength={280}
                />
                <button onClick={() => addComment(p.id)}>Comment</button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

