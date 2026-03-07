"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PastorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(`Login error: ${error.message}`);
      return;
    }
    setMsg("Logged in. Redirecting to Congregation dashboard...");
    router.push("/pastor/dashboard");
  };

  return (
    <main className="auth-splash">
      <section className="auth-splash-panel glass-card">
        <div className="auth-logo-wrap">
          <img className="auth-logo" src="/branding/fs-logo.jpg" alt="Congregation logo" />
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">Pastor Access</span>
          <h1 className="pastor-title">Congregation</h1>
          <p className="auth-subtitle splash">Lead your church family: announcements, events, and direct congregation messaging.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <span className="icon-glass">📣</span>
            <span className="icon-glass">📅</span>
            <span className="icon-glass">💬</span>
          </div>
        </div>

        <label className="form-label splash">Email</label>
        <input
          className="field splash"
          type="email"
          placeholder="pastor@church.org"
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

        <button className="btn-glass-gold" onClick={handleLogin} style={{ width: "100%" }}>
          Enter Congregation Portal
        </button>

        <p className="auth-msg">{msg}</p>

        <p className="auth-switch">
          Need a pastor account? <Link href="/auth/signup">Sign up</Link>
        </p>

        <p className="auth-switch" style={{ marginTop: 8 }}>
          Not a pastor? <Link href="/auth/login">Return to member login</Link>
        </p>
      </section>
    </main>
  );
}
