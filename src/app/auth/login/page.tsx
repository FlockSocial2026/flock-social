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
    <main className="auth-splash">
      <section className="auth-splash-panel">
        <div className="auth-logo-wrap">
          <img className="auth-logo" src="/branding/fs-logo.jpg" alt="Flock Social logo" />
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">Welcome back</span>
          <h1 className="auth-title splash">Log in to Flock Social</h1>
          <p className="auth-subtitle splash">Continue your community conversations, prayer updates, and church activity feed.</p>
        </div>

        <label className="form-label splash">Email</label>
        <input
          className="field splash"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="form-label splash">Password</label>
        <input
          className="field splash"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <button className="btn-primary" onClick={handleLogin} style={{ width: "100%" }}>
          Log In
        </button>

        <p className="auth-msg">{msg}</p>

        <p className="auth-switch">
          Need an account? <Link href="/auth/signup">Sign up</Link>
        </p>

        <p className="auth-meta splash">Secure authentication powered by Supabase.</p>
      </section>
    </main>
  );
}
