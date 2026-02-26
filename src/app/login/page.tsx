"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/home");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Background orbs */}
      <div className="bg-orb" style={{ width: 400, height: 400, background: 'var(--accent-1)', top: '-10%', left: '-5%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-2)', bottom: '-10%', right: '-5%' }} />
      
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.header}>
          <h1 style={styles.logo}>
            <span style={styles.logoIcon}>📚</span> AskMyNotes
          </h1>
          <p style={styles.subtitle}>Your AI-powered study copilot</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.title}>Welcome back</h2>
          
          {error && (
            <div style={styles.error}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-gradient"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "14px" }}
          >
            {loading ? <div className="spinner" /> : "Sign In"}
          </button>

          <p style={styles.footer}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={styles.link}>
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  container: {
    width: "100%",
    maxWidth: 420,
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoIcon: {
    WebkitTextFillColor: "initial",
    fontSize: 32,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    background: "var(--bg-card)",
    backdropFilter: "blur(20px)",
    border: "1px solid var(--glass-border)",
    borderRadius: "var(--radius-xl)",
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    color: "#ef4444",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-secondary)",
  },
  link: {
    color: "var(--accent-2)",
    textDecoration: "none",
    fontWeight: 600,
  },
};
