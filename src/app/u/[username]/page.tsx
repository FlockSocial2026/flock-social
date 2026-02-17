"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
};

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const uname = decodeURIComponent(params.username || "").trim();
      if (!uname) return setMsg("Invalid username.");

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .ilike("username", uname)
        .maybeSingle();

      if (pErr) return setMsg(`Profile load error: ${pErr.message}`);
      if (!p) return setMsg("User not found.");

      setProfile(p as Profile);

      const { data: postData, error: postErr } = await supabase
        .from("posts")
        .select("id,content,created_at")
        .eq("user_id", p.id)
        .order("created_at", { ascending: false });

      if (postErr) return setMsg(`Posts load error: ${postErr.message}`);
      setPosts((postData ?? []) as Post[]);
    };

    load();
  }, [params.username]);

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1>Profile</h1>
        <Link href="/feed">Back to Feed</Link>
      </div>

      {msg ? <p>{msg}</p> : null}

      {profile && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.full_name || "Unnamed"}</div>
          <div style={{ color: "#666" }}>@{profile.username}</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {posts.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{new Date(p.created_at).toLocaleString()}</div>
            <div>{p.content}</div>
          </div>
        ))}
      </div>
    </main>
  );
}