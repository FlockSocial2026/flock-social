"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    setMsg("Signing in...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setMsg(`Login error: ${error?.message || "Unable to sign in"}`);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,username")
      .eq("id", data.user.id)
      .maybeSingle();

    track("login_success", { hasUsername: Boolean(profile?.username) });
    setMsg("Signed in successfully. Redirecting...");
    router.push(profile?.username ? "/dashboard" : "/onboarding");
  };

  return (
    <main className="auth-shell">
      <section className="card">
        <h1 style={{ marginBottom: 8 }}>Log In</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Use your email and password.
        </p>

        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <button className="btn-primary" onClick={handleLogin}>
          Log In
        </button>

        <p style={{ marginTop: 12 }}>{msg}</p>

        <p style={{ marginTop: 20 }}>
          Need an account? <Link href="/auth/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}
