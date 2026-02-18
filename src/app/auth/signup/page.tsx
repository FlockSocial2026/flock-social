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
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Sign Up</h1>
      <p style={{ marginBottom: 20, color: "#666" }}>
        Create your Flock Social account.
      </p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password (min 6+)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={handleSignup} style={{ padding: "10px 14px" }}>
        Sign Up
      </button>

      <p style={{ marginTop: 12 }}>{msg}</p>

      <p style={{ marginTop: 20 }}>
        Already have an account? <Link href="/auth/login">Log in</Link>
      </p>
    </main>
  );
}