"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";
import { track } from "@/lib/analytics";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type LikeRow = { post_id: string; user_id: string };
type CommentRow = { id: string; post_id: string; user_id: string; content: string; created_at: string };
type FollowRow = { following_id: string };

type FeedItem = Post & {
  profile: Profile | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: Array<CommentRow & { profile: Profile | null }>;
};

const PAGE_SIZE = 20;
const MAX_POST_LENGTH = 280;
const MAX_COMMENT_LENGTH = 280;

export default function FeedPage() {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [lastPostAt, setLastPostAt] = useState<number>(0);
  const [lastCommentAt, setLastCommentAt] = useState<number>(0);

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const authorLabel = (profile: Profile | null, fallbackUserId: string) => {
    const username = profile?.username?.trim();
    const fullName = profile?.full_name?.trim();
    const label =
      username && fullName
        ? `${fullName} (@${username})`
        : username
        ? `@${username}`
        : fullName
        ? fullName
        : `user:${fallbackUserId.slice(0, 8)}...`;
    return { label, username: username ?? null };
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const createNotification = async (
    payload: { user_id: string; actor_id: string; type: "like" | "comment" | "follow"; post_id?: string },
    dedupeMinutes = 10,
  ) => {
    const cutoff = new Date(Date.now() - dedupeMinutes * 60_000).toISOString();

    const query = supabase
      .from("notifications")
      .select("id")
      .eq("user_id", payload.user_id)
      .eq("actor_id", payload.actor_id)
      .eq("type", payload.type)
      .gte("created_at", cutoff)
      .limit(1);

    const { data: existing } = payload.post_id
      ? await query.eq("post_id", payload.post_id)
      : await query;

    if ((existing ?? []).length > 0) return;

    await supabase.from("notifications").insert({
      user_id: payload.user_id,
      actor_id: payload.actor_id,
      type: payload.type,
      post_id: payload.post_id ?? null,
    });
  };

  const loadPosts = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return router.push("/auth/login");

    setMe(user.id);

    const { data: followsData, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followsError) return setMsg(`Follows load error: ${followsError.message}`);

    const following = new Set(((followsData ?? []) as FollowRow[]).map((f) => f.following_id));
    setFollowingSet(following);

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(visibleCount, PAGE_SIZE));

    if (postError) return setMsg(`Load error: ${postError.message}`);

    let basePosts = (postData ?? []) as Post[];
    if (feedMode === "following") {
      basePosts = basePosts.filter((p) => p.user_id === user.id || following.has(p.user_id));
    }

    const slicedPosts = basePosts.slice(0, visibleCount);
    const userIds = Array.from(new Set(slicedPosts.map((p) => p.user_id)));
    const postIds = slicedPosts.map((p) => p.id);

    let profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", userIds);
      if (profileError) return setMsg(`Profile load error: ${profileError.message}`);
      profileMap = new Map((profileData as Profile[]).map((p) => [p.id, p]));
    }

    let likeRows: LikeRow[] = [];
    if (postIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id,user_id")
        .in("post_id", postIds);
      if (likesError) return setMsg(`Likes load error: ${likesError.message}`);
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
        .order("created_at", { ascending: false })
        .limit(500);
      if (commentsError) return setMsg(`Comments load error: ${commentsError.message}`);
      commentRows = (commentsData ?? []) as CommentRow[];
    }

    const commentAuthorIds = Array.from(new Set(commentRows.map((c) => c.user_id)));
    const allProfileIds = Array.from(new Set([...userIds, ...commentAuthorIds]));
    if (allProfileIds.length > 0) {
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", allProfileIds);
      if (allProfilesError) return setMsg(`Comment profile load error: ${allProfilesError.message}`);
      profileMap = new Map((allProfiles as Profile[]).map((p) => [p.id, p]));
    }

    const commentsByPost = new Map<string, CommentRow[]>();
    for (const c of commentRows) {
      const arr = commentsByPost.get(c.post_id) ?? [];
      arr.push(c);
      commentsByPost.set(c.post_id, arr);
    }

    const merged: FeedItem[] = slicedPosts.map((p) => {
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
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedMode, visibleCount]);

  const uploadPostImage = async (userId: string): Promise<string | null> => {
    if (!selectedImage) return null;

    const ext = selectedImage.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploading(true);
    const { error: upErr } = await supabase.storage.from("post-images").upload(path, selectedImage, { upsert: false });
    setUploading(false);

    if (upErr) {
      setMsg(`Image upload error: ${upErr.message}`);
      return null;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const createPost = async () => {
    const now = Date.now();
    if (now - lastPostAt < 2000) return setMsg("Slow down a sec — you can post again in a moment.");
    if (actionBusy || uploading) return;

    const text = content.trim();
    if (!text) return setMsg("Post cannot be empty.");
    if (text.length > MAX_POST_LENGTH) return setMsg(`Post must be ${MAX_POST_LENGTH} chars or less.`);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return router.push("/auth/login");

    setActionBusy(true);
    setMsg("Posting...");

    const imageUrl = await uploadPostImage(user.id);
    const { error } = await supabase.from("posts").insert({ user_id: user.id, content: text, image_url: imageUrl });

    if (error) {
      setMsg(`Create error: ${error.message}`);
      setActionBusy(false);
      return;
    }

    setContent("");
    setSelectedImage(null);
    setLastPostAt(Date.now());
    setActionBusy(false);
    setMsg("Posted.");
    track("post_created", { hasImage: Boolean(imageUrl), length: text.length });
    await loadPosts();
  };

  const toggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!me || targetUserId === me) return;

    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", targetUserId);
      if (error) return setMsg(`Unfollow error: ${error.message}`);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: me, following_id: targetUserId });
      if (error) return setMsg(`Follow error: ${error.message}`);
      await createNotification({ user_id: targetUserId, actor_id: me, type: "follow" }, 60);
    }

    track("follow_toggled", { targetUserId, nowFollowing: !isFollowing });
    await loadPosts();
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!me) return;

    if (liked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me);
      if (error) return setMsg(`Unlike error: ${error.message}`);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: me });
      if (error) return setMsg(`Like error: ${error.message}`);

      const postOwner = posts.find((p) => p.id === postId)?.user_id;
      if (postOwner && postOwner !== me) {
        await createNotification({ user_id: postOwner, actor_id: me, type: "like", post_id: postId }, 10);
      }
    }

    track("like_toggled", { postId, nowLiked: !liked });
    await loadPosts();
  };

  const addComment = async (postId: string) => {
    const now = Date.now();
    if (now - lastCommentAt < 1500) return setMsg("Hold up — comment cooldown is 1.5s.");
    if (actionBusy || !me) return;

    const raw = commentDrafts[postId] ?? "";
    const text = raw.trim();
    if (!text) return setMsg("Comment cannot be empty.");
    if (text.length > MAX_COMMENT_LENGTH) return setMsg(`Comment must be ${MAX_COMMENT_LENGTH} chars or less.`);

    setActionBusy(true);
    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: me, content: text });

    if (error) {
      setMsg(`Comment error: ${error.message}`);
      setActionBusy(false);
      return;
    }

    const postOwner = posts.find((p) => p.id === postId)?.user_id;
    if (postOwner && postOwner !== me) {
      await createNotification({ user_id: postOwner, actor_id: me, type: "comment", post_id: postId }, 10);
    }

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setLastCommentAt(Date.now());
    setActionBusy(false);
    track("comment_created", { postId, length: text.length });
    await loadPosts();
  };

  const saveEditPost = async () => {
    if (!editingPostId || !me) return;
    const text = editingPostContent.trim();
    if (!text) return setMsg("Post cannot be empty.");
    if (text.length > MAX_POST_LENGTH) return setMsg(`Post must be ${MAX_POST_LENGTH} chars or less.`);

    const { error } = await supabase.from("posts").update({ content: text }).eq("id", editingPostId).eq("user_id", me);
    if (error) return setMsg(`Edit post error: ${error.message}`);

    setEditingPostId(null);
    setEditingPostContent("");
    setMsg("Post updated.");
    await loadPosts();
  };

  const deletePost = async (postId: string) => {
    if (!me || !window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", me);
    if (error) return setMsg(`Delete post error: ${error.message}`);
    setMsg("Post deleted.");
    await loadPosts();
  };

  const saveEditComment = async () => {
    if (!editingCommentId || !me) return;
    const text = editingCommentContent.trim();
    if (!text) return setMsg("Comment cannot be empty.");
    if (text.length > MAX_COMMENT_LENGTH) return setMsg(`Comment must be ${MAX_COMMENT_LENGTH} chars or less.`);

    const { error } = await supabase.from("comments").update({ content: text }).eq("id", editingCommentId).eq("user_id", me);
    if (error) return setMsg(`Edit comment error: ${error.message}`);

    setEditingCommentId(null);
    setEditingCommentContent("");
    setMsg("Comment updated.");
    await loadPosts();
  };

  const deleteComment = async (commentId: string) => {
    if (!me || !window.confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", me);
    if (error) return setMsg(`Delete comment error: ${error.message}`);
    setMsg("Comment deleted.");
    await loadPosts();
  };

  const canLoadMore = useMemo(() => posts.length >= visibleCount, [posts.length, visibleCount]);

  return (
    <main style={{ maxWidth: 760, margin: "24px auto", fontFamily: "Arial, sans-serif", padding: "0 12px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Feed</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setFeedMode("for_you")} disabled={feedMode === "for_you"}>For You</button>
        <button onClick={() => setFeedMode("following")} disabled={feedMode === "following"}>Following</button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, marginBottom: 14 }}>
        <textarea
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_POST_LENGTH}
          rows={4}
          style={{ width: "100%", padding: 10, marginBottom: 8 }}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 8, width: "100%" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <small>
            {content.length}/{MAX_POST_LENGTH}
            {selectedImage ? ` • ${selectedImage.name}` : ""}
            {uploading ? " • Uploading..." : ""}
          </small>
          <button onClick={createPost} disabled={actionBusy || uploading}>{actionBusy ? "Working..." : "Post"}</button>
        </div>
      </div>

      {msg ? <p style={{ marginBottom: 12 }}>{msg}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {posts.map((p) => {
          const isMine = me === p.user_id;
          const isFollowing = followingSet.has(p.user_id);
          const a = authorLabel(p.profile, p.user_id);

          return (
            <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {a.username ? <Link href={`/u/${encodeURIComponent(a.username)}`}>{a.label}</Link> : a.label} • {formatTime(p.created_at)}
                </div>
                {!isMine && <button onClick={() => toggleFollow(p.user_id, isFollowing)}>{isFollowing ? "Unfollow" : "Follow"}</button>}
              </div>

              {editingPostId === p.id ? (
                <div style={{ marginBottom: 8 }}>
                  <textarea value={editingPostContent} onChange={(e) => setEditingPostContent(e.target.value)} maxLength={MAX_POST_LENGTH} rows={3} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEditPost}>Save</button>
                    <button onClick={() => setEditingPostId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>{p.content}</div>
                  {p.image_url ? <img src={p.image_url} alt="post image" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 10 }} /> : null}
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <button onClick={() => toggleLike(p.id, p.likedByMe)}>{p.likedByMe ? "Unlike" : "Like"} ({p.likeCount})</button>
                <span style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>Comments ({p.commentCount})</span>

                {isMine && editingPostId !== p.id && (
                  <>
                    <button onClick={() => { setEditingPostId(p.id); setEditingPostContent(p.content); }}>Edit Post</button>
                    <button onClick={() => deletePost(p.id)}>Delete Post</button>
                  </>
                )}
                {!isMine && <ReportButton targetType="post" postId={p.id} userId={p.user_id} />}
              </div>

              <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                {p.comments.map((c) => {
                  const myComment = me === c.user_id;
                  const ca = authorLabel(c.profile, c.user_id);

                  return (
                    <div key={c.id} style={{ border: "1px solid #333", borderRadius: 6, padding: 8 }}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                        {ca.username ? <Link href={`/u/${encodeURIComponent(ca.username)}`}>{ca.label}</Link> : ca.label} • {formatTime(c.created_at)}
                      </div>

                      {editingCommentId === c.id ? (
                        <div>
                          <input value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} maxLength={MAX_COMMENT_LENGTH} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
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
                          <button onClick={() => { setEditingCommentId(c.id); setEditingCommentContent(c.content); }}>Edit</button>
                          <button onClick={() => deleteComment(c.id)}>Delete</button>
                        </div>
                      )}
                      {!myComment && <div style={{ marginTop: 8 }}><ReportButton targetType="comment" commentId={c.id} postId={p.id} userId={c.user_id} /></div>}
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
                  maxLength={MAX_COMMENT_LENGTH}
                />
                <button onClick={() => addComment(p.id)} disabled={actionBusy}>{actionBusy ? "..." : "Comment"}</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)} disabled={!canLoadMore}>Load more</button>
      </div>
    </main>
  );
}
