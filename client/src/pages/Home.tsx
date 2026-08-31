import { Link } from "react-router";
import { useState, useEffect } from "react";
import Logo from "../components/Logo";

const features = [
  { icon: "💬", title: "Conversational Agents", desc: "Deploy AI agents that handle customer conversations naturally and intelligently." },
  { icon: "🧠", title: "Enterprise Memory", desc: "Agents learn from your data, documentation, and past interactions to provide accurate answers." },
  { icon: "⚡", title: "Instant Deployment", desc: "Go live in minutes. No coding required. Connect your data and your agent is ready." },
  { icon: "📊", title: "Analytics & Insights", desc: "Track conversations, satisfaction scores, and agent performance in real-time." },
  { icon: "🔗", title: "Multi-Channel", desc: "Deploy across web, email, Slack, WhatsApp, and more from a single dashboard." },
  { icon: "🔒", title: "Enterprise Security", desc: "SOC2 compliant, role-based access, SSO integration, and audit logging built-in." },
];

const stats = [
  { value: "94%", label: "Resolution Rate" },
  { value: "<2s", label: "Response Time" },
  { value: "50+", label: "Integrations" },
  { value: "99.9%", label: "Uptime" },
];

const testimonials = [
  { name: "Sarah Chen", role: "Head of Support, TechCorp", quote: "SOPRANOVA reduced our support ticket volume by 60% in the first month." },
  { name: "Marco Rossi", role: "CTO, Haier Europe", quote: "The AI agents handle 80% of customer inquiries without human intervention." },
  { name: "Aisha Patel", role: "VP Operations, FinServ", quote: "Enterprise-grade AI that actually delivers on its promises." },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid #e5e7eb" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Logo size={20} showWordmark />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/login" style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#374151", textDecoration: "none", borderRadius: 8 }}>
              Log in
            </Link>
            <Link to="/signup" style={{ padding: "8px 20px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#6366f1", borderRadius: 8, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#4f46e5")}
              onMouseLeave={e => (e.currentTarget.style.background = "#6366f1")}>
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#6366f1", background: "#eef2ff", marginBottom: 24, letterSpacing: "0.04em" }}>
            SOPRANOVA PLATFORM
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 5.5vw, 4rem)", fontWeight: 800, color: "#111827", lineHeight: 1.1, margin: "0 0 24px", letterSpacing: "-0.03em" }}>
            Conversational agents for{" "}
            <span style={{ color: "#6366f1" }}>customer experience</span>
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#6b7280", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px" }}>
            Deploy AI-powered agents that understand your business, answer questions instantly, and learn from every interaction. Enterprise-ready in minutes.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#6366f1", borderRadius: 12, textDecoration: "none", transition: "all 0.2s", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.3)"; }}>
              Continue for free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link to="/platform" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; }}>
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", padding: "48px 0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Features</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
              Everything you need to deploy AI agents
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{ padding: 32, borderRadius: 16, border: "1px solid #f3f4f6", background: "#fff", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "#f3f4f6"; }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: 0 }}>Three steps to intelligent support</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
            {[
              { step: "01", title: "Connect your data", desc: "Upload documents, connect APIs, or link your knowledge base. Your agent learns automatically." },
              { step: "02", title: "Configure your agent", desc: "Set the tone, personality, and behavior. Define escalation rules and handoff conditions." },
              { step: "03", title: "Go live", desc: "Deploy to your website, app, or any channel. Monitor performance and improve over time." },
            ].map((item, i) => (
              <div key={item.step} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, margin: "0 auto 20px" }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Testimonials</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: 0 }}>Trusted by teams worldwide</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {testimonials.map(t => (
              <div key={t.name} style={{ padding: 32, borderRadius: 16, border: "1px solid #f3f4f6", background: "#fff" }}>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>"{t.quote}"</p>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
            Ready to transform your customer experience?
          </h2>
          <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 32px" }}>
            Join hundreds of companies using SOPRANOVA to deliver exceptional support.
          </p>
          <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#6366f1", borderRadius: 12, textDecoration: "none", transition: "all 0.2s", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.transform = ""; }}>
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #f3f4f6", padding: "40px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <Logo size={18} showWordmark />
          <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#9ca3af" }}>
            {["Platform", "Pricing", "Docs", "Blog", "Contact"].map(l => (
              <Link key={l} to={`/${l.toLowerCase()}`} style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
                {l}
              </Link>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#d1d5db" }}>© 2026 SOPRANOVA</div>
        </div>
      </footer>
    </div>
  );
}
