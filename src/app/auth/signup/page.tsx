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
    <main className="auth-shell">
      <section className="auth-card">
        <span className="auth-eyebrow">Get started</span>
        <h1 className="auth-title">Create your Flock Social account</h1>
        <p className="auth-subtitle">Join your church community, groups, and events in one place.</p>

        <label className="form-label">Email</label>
        <input
          className="field"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="form-label">Password</label>
        <input
          className="field"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <button className="btn-primary" onClick={handleSignup}>
          Sign Up
        </button>

        <p style={{ marginTop: 12 }}>{msg}</p>

        <p style={{ marginTop: 20 }}>
          Already have an account? <Link href="/auth/login">Log in</Link>
        </p>

        <p className="auth-meta">By signing up, you agree to community conduct and profile visibility rules.</p>
      </section>
    </main>
  );
}