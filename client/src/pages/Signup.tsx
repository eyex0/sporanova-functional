import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Logo from "../components/Logo";
import { trpc } from "../lib/trpc";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const register = trpc.auth.register.useMutation({
    onSuccess: () => navigate("/dashboard", { replace: true }),
    onError: (mutationError) => {
      setError(mutationError.message);
      setLoading(false);
    },
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    register.mutate({
      email: form.email,
      password: form.password,
      name: `${form.firstName} ${form.lastName}`.trim(),
      organizationName: form.company,
    });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 40 }}>
            <Logo size={22} showWordmark />
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            {[1, 2].map((s) => (
              <div key={s} style={{
                height: 4, borderRadius: 2, transition: "all 0.3s",
                width: s === step ? 32 : 12, background: s <= step ? "#111827" : "#e5e7eb",
              }} />
            ))}
            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>{step} of 2</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            {step === 1 ? "Create your account" : "Your workspace"}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 32px" }}>
            {step === 1 ? "Start your SOPRANOVA journey." : "A few more details to personalize your experience."}
          </p>

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>First Name</label>
                    <input type="text" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Jane" required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111827", boxSizing: "border-box", transition: "border-color 0.15s" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Last Name</label>
                    <input type="text" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Smith" required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111827", boxSizing: "border-box", transition: "border-color 0.15s" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Work Email</label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@company.com" required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111827", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Password</label>
                  <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Create a strong password" required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111827", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20, textAlign: "center" }}>
                  By continuing you agree to our{" "}
                  <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>Terms</a>
                  {" "}and{" "}
                  <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>Privacy Policy</a>
                </p>
              </>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Company</label>
                <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Your organization" required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111827", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
              </div>
            )}

            {error && <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 8,
                background: "#111827", color: "#fff", border: "none",
                fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.2s",
              }}
            >
              {loading ? "Creating..." : step === 1 ? "Continue" : "Create Account"}
            </button>

            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginTop: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
                ← Back
              </button>
            )}
          </form>

          <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", marginTop: 32 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ fontWeight: 600, color: "#111827", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — decorative */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", position: "relative", overflow: "hidden" }} className="signup-right-panel">
        {/* Grid pattern */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Capability cards */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 40 }}>
          {[
            { title: "AI Agents", desc: "Deploy intelligent agents across every channel", color: "#6366f1" },
            { title: "Analytics", desc: "Real-time insights into every conversation", color: "#22c55e" },
            { title: "Integrations", desc: "Connect to 200+ tools you already use", color: "#f59e0b" },
            { title: "Enterprise", desc: "SOC 2 compliant with full data isolation", color: "#ef4444" },
          ].map((card) => (
            <div key={card.title} style={{
              background: "#fff", borderRadius: 12, padding: 20,
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6", width: 180,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: card.color, marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{card.desc}</div>
            </div>
          ))}
        </div>

        {/* Company logos */}
        <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 32, opacity: 0.35 }}>
          {["DOLBY", "MIELE", "OPAL", "JUMIA", "SAGE", "IHG", "F45"].map((name) => (
            <span key={name} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>{name}</span>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .signup-right-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
