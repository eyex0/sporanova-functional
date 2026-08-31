import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Logo from "../components/Logo";
import { trpc } from "../lib/trpc";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 450));
      navigate("/dashboard", { replace: true });
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      setLoading(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    login.mutate({ email, password });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 40 }}>
            <Logo size={22} showWordmark />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 32px" }}>Log in to access your SOPRANOVA account.</p>

          <form onSubmit={handleSubmit}>
            {/* Google SSO */}
            <button
              type="button"
              onClick={() => { window.location.assign("/api/auth/google?returnTo=/app/agents"); }}
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", fontSize: 14, fontWeight: 500, color: "#374151",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s", marginBottom: 20,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Login with Google
            </button>

            {/* SSO */}
            <button
              type="button"
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", fontSize: 14, fontWeight: 500, color: "#374151",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s", marginBottom: 20,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
            >
              Sign in with SSO
            </button>

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                  fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif",
                  background: "#fff", color: "#111827", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                  fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif",
                  background: "#fff", color: "#111827", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 8,
                background: loading || success ? "#6366f1" : "#111827",
                color: "#fff", border: "none", fontSize: 14, fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: "all 0.2s", marginTop: 4,
              }}
            >
              {loading && !success ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </span>
              ) : success ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Entering workspace
                </span>
              ) : "Continue"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", marginTop: 32 }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ fontWeight: 600, color: "#111827", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              Create a new account
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — decorative */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", position: "relative", overflow: "hidden" }} className="login-right-panel">
        {/* Grid pattern */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating cards */}
        <div style={{ position: "relative", width: 400, height: 400 }}>
          {/* Chat widget card */}
          <div style={{
            position: "absolute", top: 60, left: 20, width: 280, background: "#fff",
            borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 20,
            border: "1px solid #f3f4f6",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 12 }}>&#10022;</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>AI Agent</div>
                <div style={{ fontSize: 10, color: "#22c55e" }}>● Online</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f3f4f6", fontSize: 12, color: "#374151", maxWidth: "85%" }}>
                Hi! How can I help you today?
              </div>
              <div style={{ padding: "8px 12px", borderRadius: "12px 12px 4px 12px", background: "#6366f1", fontSize: 12, color: "#fff", maxWidth: "85%", alignSelf: "flex-end" }}>
                Tell me about your pricing
              </div>
            </div>
          </div>

          {/* Analytics card */}
          <div style={{
            position: "absolute", top: 20, right: 10, width: 200, background: "#fff",
            borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 16,
            border: "1px solid #f3f4f6",
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 8 }}>Conversations</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>1,247</div>
            <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>↑ 12% this week</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginTop: 10, height: 40 }}>
              {[20, 35, 25, 40, 30, 50, 45].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h, background: "#6366f1", borderRadius: 3, opacity: 0.3 + (i * 0.1) }} />
              ))}
            </div>
          </div>

          {/* Actions card */}
          <div style={{
            position: "absolute", bottom: 80, right: 30, width: 220, background: "#fff",
            borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 14,
            border: "1px solid #f3f4f6",
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 10 }}>Active Channels</div>
            {["Live Chat", "Email", "WhatsApp"].map((ch, i) => (
              <div key={ch} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#374151" }}>{ch}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#22c55e", background: "#f0fdf4", padding: "2px 6px", borderRadius: 4 }}>Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Company logos */}
        <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 32, opacity: 0.35 }}>
          {["DOLBY", "MIELE", "OPAL", "JUMIA", "SAGE", "IHG", "F45"].map((name) => (
            <span key={name} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>{name}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 767px) {
          .login-right-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
