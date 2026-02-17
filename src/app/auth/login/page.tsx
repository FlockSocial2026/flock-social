"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    setMsg("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg(`Login error: ${error.message}`);
      return;
    }

    setMsg("Signed in successfully. Redirecting...");
    router.push("/dashboard");
  };

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Log In</h1>
      <p style={{ marginBottom: 20, color: "#666" }}>
        Use your email and password.
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
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button onClick={handleLogin} style={{ padding: "10px 14px" }}>
        Log In
      </button>

      <p style={{ marginTop: 12 }}>{msg}</p>

      <p style={{ marginTop: 20 }}>
        Need an account? <Link href="/auth/signup">Sign up</Link>
      </p>
    </main>
  );
}