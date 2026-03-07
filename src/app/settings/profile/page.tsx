"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  profile_visibility?: "public" | "followers" | "private" | null;
  allow_direct_contact?: boolean | null;
};

type SimpleProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const [allowDirectContact, setAllowDirectContact] = useState(true);
  const [churchLabel, setChurchLabel] = useState("No church connected");
  const [followers, setFollowers] = useState<SimpleProfile[]>([]);
  const [following, setFollowing] = useState<SimpleProfile[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState("");

  const profileLink = useMemo(() => (username.trim() ? `/u/${encodeURIComponent(username.trim())}` : null), [username]);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setUserId(user.id);

    let profile: ProfileRow | null = null;

    const fullSelect = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,bio,profile_visibility,allow_direct_contact")
      .eq("id", user.id)
      .maybeSingle();

    if (fullSelect.error) {
      const fallback = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (fallback.error) {
        setMsg(`Load error: ${fallback.error.message}`);
        return;
      }
      profile = fallback.data as ProfileRow | null;
    } else {
      profile = fullSelect.data as ProfileRow | null;
    }

    setUsername(profile?.username ?? "");
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setBio(profile?.bio ?? "");
    setVisibility((profile?.profile_visibility as "public" | "followers" | "private" | null) ?? "public");
    setAllowDirectContact(profile?.allow_direct_contact ?? true);

    const [{ data: followerRows }, { data: followingRows }] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);

    const followerIds = Array.from(new Set((followerRows ?? []).map((r: any) => r.follower_id)));
    const followingIds = Array.from(new Set((followingRows ?? []).map((r: any) => r.following_id)));
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));

    if (allIds.length > 0) {
      const { data: relatedProfiles } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .in("id", allIds);

      const map = new Map<string, SimpleProfile>((relatedProfiles ?? []).map((p: any) => [p.id, p]));
      setFollowers(followerIds.map((id) => map.get(id)).filter(Boolean) as SimpleProfile[]);
      setFollowing(followingIds.map((id) => map.get(id)).filter(Boolean) as SimpleProfile[]);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const flockRes = await fetch("/api/flock/church", { headers: { Authorization: `Bearer ${token}` } });
      if (flockRes.ok) {
        const flockJson = await flockRes.json();
        if (flockJson?.church?.name) {
          setChurchLabel(`${flockJson.church.name}${flockJson.membership?.role ? ` (${flockJson.membership.role})` : ""}`);
        }
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const uploadAvatarFile = async (file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploadingAvatar(true);
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    setUploadingAvatar(false);

    if (upErr) {
      setMsg(`Avatar upload error: ${upErr.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setMsg("Avatar uploaded. Save profile to apply.");
  };

  const save = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return router.push("/auth/login");

    const uname = username.trim();
    if (!uname) return setMsg("Username is required.");
    if (uname.length < 3) return setMsg("Username must be at least 3 characters.");

    setMsg("Saving...");

    const payload: Record<string, any> = {
      username: uname,
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      profile_visibility: visibility,
      allow_direct_contact: allowDirectContact,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("profiles").update(payload).eq("id", user.id);

    if (error && /column/i.test(error.message)) {
      // fallback for environments that do not yet have extension columns
      ({ error } = await supabase
        .from("profiles")
        .update({
          username: uname,
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id));
    }

    if (error) {
      setMsg(`Save error: ${error.message}`);
      return;
    }

    setMsg("Profile updated.");
    await load();
  };

  return (
    <main className="app-shell section-carbon" style={{ maxWidth: 780 }}>
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Profile Settings</h1>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" style={{ width: 92, height: 92, borderRadius: 999, objectFit: "cover", border: "2px solid rgba(255,213,150,0.65)" }} />
            ) : (
              <div className="icon-glass" style={{ width: 92, height: 92, fontSize: 32 }}>👤</div>
            )}
          </div>
          <div>
            <label className="form-label">Upload avatar</label>
            <input
              className="field"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatarFile(file);
              }}
            />
            <label className="form-label">Avatar URL (optional override)</label>
            <input className="field" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            {uploadingAvatar ? <p className="small-muted" style={{ margin: "4px 0 0" }}>Uploading avatar...</p> : null}
          </div>
        </div>

        <label className="form-label">Username</label>
        <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />

        <label className="form-label">Full name</label>
        <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />

        <label className="form-label">About me / bio</label>
        <textarea
          className="field"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell people who you are, what you care about, and what you're building..."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label className="form-label">Profile visibility</label>
            <select className="field" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
              <option value="public">Public</option>
              <option value="followers">Followers only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="form-label">Direct contact</label>
            <select className="field" value={allowDirectContact ? "allowed" : "off"} onChange={(e) => setAllowDirectContact(e.target.value === "allowed")}>
              <option value="allowed">Allow direct message button</option>
              <option value="off">Hide direct message button</option>
            </select>
          </div>
        </div>

        <div className="card card-premium" style={{ marginBottom: 12 }}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700 }}>Church Membership</div>
              <div className="small-muted">{churchLabel}</div>
            </div>
            <Link href="/flock">Manage in Flock</Link>
          </div>
        </div>

        <div className="row-between">
          <button className="btn-primary" onClick={save}>Save Profile</button>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn-secondary" href={profileLink ?? "/feed"} style={{ pointerEvents: profileLink ? "auto" : "none", opacity: profileLink ? 1 : 0.6 }}>
              View Public Profile
            </Link>
            <Link className="btn-secondary" href={`/feed?prefill=${encodeURIComponent("Quick update from my profile:")}`}>
              Create Feed Post
            </Link>
          </div>
        </div>

        {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
      </section>

      <section className="card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Connections</h3>
          <span className="small-muted">Followers {followers.length} • Following {following.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Followers</div>
            <div style={{ display: "grid", gap: 6 }}>
              {followers.length === 0 ? <div className="small-muted">No followers yet.</div> : null}
              {followers.slice(0, 8).map((p) => (
                <Link key={p.id} href={p.username ? `/u/${encodeURIComponent(p.username)}` : "#"}>@{p.username ?? p.full_name ?? "unknown"}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Following</div>
            <div style={{ display: "grid", gap: 6 }}>
              {following.length === 0 ? <div className="small-muted">Not following anyone yet.</div> : null}
              {following.slice(0, 8).map((p) => (
                <Link key={p.id} href={p.username ? `/u/${encodeURIComponent(p.username)}` : "#"}>@{p.username ?? p.full_name ?? "unknown"}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
