"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  profile_visibility?: "public" | "followers" | "private" | null;
  allow_direct_contact?: boolean | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
};

type SimpleProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<SimpleProfile[]>([]);
  const [following, setFollowing] = useState<SimpleProfile[]>([]);
  const [churchName, setChurchName] = useState<string>("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [msg, setMsg] = useState("");

  const canContact = useMemo(() => {
    if (!profile) return false;
    if (!viewerId || viewerId === profile.id) return false;
    if (profile.allow_direct_contact === false) return false;
    return true;
  }, [profile, viewerId]);

  const load = async () => {
    const uname = decodeURIComponent(params.username || "").trim();
    if (!uname) return setMsg("Invalid username.");

    const { data: viewerData } = await supabase.auth.getUser();
    setViewerId(viewerData.user?.id ?? null);

    const fullSelect = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,bio,profile_visibility,allow_direct_contact")
      .ilike("username", uname)
      .maybeSingle();

    let p: any = fullSelect.data;

    if (fullSelect.error) {
      const fallback = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .ilike("username", uname)
        .maybeSingle();

      if (fallback.error) return setMsg(`Profile load error: ${fallback.error.message}`);
      p = fallback.data;
    }

    if (!p) return setMsg("User not found.");
    setProfile(p as Profile);

    const visibility = (p.profile_visibility as "public" | "followers" | "private" | undefined) ?? "public";

    if (visibility === "private" && viewerData.user?.id !== p.id) {
      setPosts([]);
      setMsg("This profile is private.");
      return;
    }

    const [{ data: postData, error: postErr }, { data: followerRows }, { data: followingRows }] = await Promise.all([
      supabase.from("posts").select("id,content,created_at").eq("user_id", p.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("follows").select("follower_id").eq("following_id", p.id),
      supabase.from("follows").select("following_id").eq("follower_id", p.id),
    ]);

    if (postErr) return setMsg(`Posts load error: ${postErr.message}`);
    setPosts((postData ?? []) as Post[]);

    const followerIds = Array.from(new Set((followerRows ?? []).map((r: any) => r.follower_id)));
    const followingIds = Array.from(new Set((followingRows ?? []).map((r: any) => r.following_id)));

    if (viewerData.user?.id) {
      setIsFollowing(followerIds.includes(viewerData.user.id));
    }

    const allIds = Array.from(new Set([...followerIds, ...followingIds]));
    if (allIds.length > 0) {
      const { data: relatedProfiles } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", allIds);

      const map = new Map<string, SimpleProfile>((relatedProfiles ?? []).map((x: any) => [x.id, x]));
      setFollowers(followerIds.map((id) => map.get(id)).filter(Boolean) as SimpleProfile[]);
      setFollowing(followingIds.map((id) => map.get(id)).filter(Boolean) as SimpleProfile[]);
    }

    const membershipRes = await supabase
      .from("church_memberships")
      .select("church_id")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membershipRes.error && membershipRes.data?.church_id) {
      const churchRes = await supabase
        .from("churches")
        .select("name")
        .eq("id", membershipRes.data.church_id)
        .maybeSingle();
      if (!churchRes.error && churchRes.data?.name) setChurchName(churchRes.data.name);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username]);

  const toggleFollow = async () => {
    if (!profile || !viewerId || viewerId === profile.id) return;

    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", profile.id);
      if (error) return setMsg(`Unfollow error: ${error.message}`);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: viewerId, following_id: profile.id });
      if (error) return setMsg(`Follow error: ${error.message}`);
    }

    setMsg("");
    await load();
  };

  return (
    <main className="app-shell section-carbon" style={{ maxWidth: 820 }}>
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <Link href="/feed">Back to Feed</Link>
        </div>

        {msg ? <p>{msg}</p> : null}

        {profile ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: 84, height: 84, borderRadius: 999, objectFit: "cover", border: "2px solid rgba(255,210,147,0.62)" }} />
                ) : (
                  <div className="icon-glass" style={{ width: 84, height: 84, fontSize: 30 }}>👤</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{profile.full_name || "Unnamed"}</div>
                <div className="small-muted">@{profile.username}</div>
                {churchName ? <div className="small-muted" style={{ marginTop: 4 }}>Member of {churchName}</div> : null}
              </div>
            </div>

            {profile.bio ? <p style={{ marginTop: 0 }}>{profile.bio}</p> : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {viewerId && viewerId !== profile.id ? (
                <button className="btn-secondary" onClick={toggleFollow}>{isFollowing ? "Unfollow" : "Follow"}</button>
              ) : null}
              {canContact ? (
                <Link className="btn-primary" href={`/messages?prefill=${encodeURIComponent(`Hi @${profile.username ?? "there"},`)}&audience=direct`}>
                  Contact
                </Link>
              ) : null}
              <Link className="btn-secondary" href={`/feed?prefill=${encodeURIComponent(`Shoutout to @${profile.username ?? "friend"}: `)}`}>
                Share to Feed
              </Link>
            </div>
          </>
        ) : null}
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Posts</h3>
          <span className="small-muted">{posts.length}</span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {posts.length === 0 ? <div className="small-muted">No posts yet.</div> : null}
          {posts.map((p) => (
            <div key={p.id} className="card card-premium">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{new Date(p.created_at).toLocaleString()}</div>
              <div>{p.content}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Network</h3>
          <span className="small-muted">Followers {followers.length} • Following {following.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Followers</div>
            <div style={{ display: "grid", gap: 6 }}>
              {followers.length === 0 ? <div className="small-muted">No followers yet.</div> : null}
              {followers.slice(0, 10).map((p) => (
                <Link key={p.id} href={p.username ? `/u/${encodeURIComponent(p.username)}` : "#"}>@{p.username ?? p.full_name ?? "unknown"}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Following</div>
            <div style={{ display: "grid", gap: 6 }}>
              {following.length === 0 ? <div className="small-muted">Not following anyone yet.</div> : null}
              {following.slice(0, 10).map((p) => (
                <Link key={p.id} href={p.username ? `/u/${encodeURIComponent(p.username)}` : "#"}>@{p.username ?? p.full_name ?? "unknown"}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
