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
      <section className="card">
        <h1 style={{ marginBottom: 8 }}>Sign Up</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Create your Flock Social account.
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
          placeholder="Password (min 6+)"
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
      </section>
    </main>
  );
}