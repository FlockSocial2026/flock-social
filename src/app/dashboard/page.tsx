"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("Checking session...");

  useEffect(() => {
    const boot = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setStatus(`Profile check error: ${error.message}`);
        return;
      }

      const missingUsername = !profile?.username || profile.username.trim() === "";
      const missingFullName = !profile?.full_name || profile.full_name.trim() === "";

      if (missingUsername || missingFullName) {
        router.push("/onboarding");
        return;
      }

      setStatus("Ready");
    };

    boot();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1>Dashboard</h1>
      <p style={{ color: "#666" }}>You are logged in as: {email}</p>
      <p style={{ color: "#666" }}>Status: {status}</p>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Link href="/feed" style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          Open Feed
        </Link>

        <button onClick={handleLogout} style={{ padding: "10px 14px" }}>
          Log Out
        </button>
      </div>
    </main>
  );
}
