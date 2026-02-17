import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "60px auto", fontFamily: "Arial, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Flock Social</h1>
      <p style={{ marginBottom: 24, color: "#666" }}>
        Welcome. Choose an option to continue.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/auth/login"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none"
          }}
        >
          Log In
        </Link>

        <Link
          href="/auth/signup"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none"
          }}
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}