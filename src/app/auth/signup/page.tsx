"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSignup = async () => {
    setMsg("Creating account...");
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setMsg(`Signup error: ${error.message}`);
      return;
    }

    setMsg("Signup successful. Check your email to confirm your account.");
  };

  return (
    <main className="auth-splash">
      <section className="auth-splash-panel">
        <div className="auth-logo-wrap">
          <img className="auth-logo" src="/branding/fs-logo.jpg" alt="Flock Social logo" />
        </div>

        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <span className="auth-eyebrow">Get started</span>
          <h1 className="auth-title" style={{ color: "#f8ecd1", marginTop: 8 }}>Create your Flock Social account</h1>
          <p className="auth-subtitle" style={{ color: "#d7dcea" }}>Join your church community, groups, and events in one place.</p>
        </div>

        <label className="form-label" style={{ color: "#e2e8f0" }}>Email</label>
        <input
          className="field"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ background: "rgba(255,255,255,0.92)" }}
        />

        <label className="form-label" style={{ color: "#e2e8f0" }}>Password</label>
        <input
          className="field"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12, background: "rgba(255,255,255,0.92)" }}
        />

        <button className="btn-primary" onClick={handleSignup} style={{ width: "100%" }}>
          Sign Up
        </button>

        <p style={{ marginTop: 12, color: "#f8fafc" }}>{msg}</p>

        <p style={{ marginTop: 20, color: "#d7dcea" }}>
          Already have an account? <Link href="/auth/login">Log in</Link>
        </p>

        <p className="auth-meta" style={{ color: "#b8c2d9", borderTopColor: "rgba(255,255,255,0.2)" }}>
          By signing up, you agree to community conduct and profile visibility rules.
        </p>
      </section>
    </main>
  );
}