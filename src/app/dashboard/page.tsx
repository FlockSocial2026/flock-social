"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setEmail(user.email ?? "");
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1>Dashboard</h1>
      <p style={{ color: "#666" }}>You are logged in as: {email}</p>

      <button onClick={handleLogout} style={{ marginTop: 16, padding: "10px 14px" }}>
        Log Out
      </button>
    </main>
  );
}