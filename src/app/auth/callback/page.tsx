"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Completing sign-in...");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/dashboard";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMsg(`Auth callback error: ${error.message}`);
          return;
        }
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id,username")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile?.username) {
        router.replace("/onboarding");
        return;
      }

      router.replace(next);
    };

    run();
  }, [router]);

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1>Finishing sign-in</h1>
      <p style={{ color: "#666" }}>{msg}</p>
    </main>
  );
}
