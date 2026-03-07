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

        <div className="auth-heading">
          <span className="auth-eyebrow">Get started</span>
          <h1 className="auth-title splash">Create your Flock Social account</h1>
          <p className="auth-subtitle splash">Join your church community, groups, and events in one place.</p>
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
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <button className="btn-primary" onClick={handleSignup} style={{ width: "100%" }}>
          Sign Up
        </button>

        <p className="auth-msg">{msg}</p>

        <p className="auth-switch">
          Already have an account? <Link href="/auth/login">Log in</Link>
        </p>

        <p className="auth-switch" style={{ marginTop: 8 }}>
          Are you a Pastor? <Link href="/pastor/login">Use Congregation login</Link>
        </p>

        <p className="auth-meta splash">By signing up, you agree to community conduct and profile visibility rules.</p>
      </section>
    </main>
  );
}