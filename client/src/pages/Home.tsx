import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import Logo from "../components/Logo";

const navLinks = ["Product", "Pricing", "Enterprise", "Resources"];

const productSuite = [
  { icon: "📘", title: "Procedures", desc: "Build step-by-step agent workflows that handle complex multi-turn tasks without losing context." },
  { icon: "💬", title: "Widgets", desc: "Embeddable chat widgets for your website. Fully customizable, mobile-responsive, and lightning fast." },
  { icon: "🎯", title: "Helpdesk", desc: "A full helpdesk inbox where agents and humans collaborate on customer conversations." },
  { icon: "🎬", title: "Backstage", desc: "A visual workspace to design, configure, and manage your agents with drag-and-drop simplicity." },
  { icon: "📊", title: "Analytics", desc: "Track resolution rates, response times, sentiment scores, and ROI across every channel." },
  { icon: "🔗", title: "Integrations", desc: "Connect to Slack, WhatsApp, email, CRMs, and 50+ platforms from a single agent." },
  { icon: "🧪", title: "Playground", desc: "Test and iterate on your agent in a sandbox before going live. No production impact." },
];

const lifecycleSteps = [
  { id: "build", label: "Build", title: "Build your agent", desc: "Define your agent's personality, knowledge base, and behavior rules using our intuitive interface." },
  { id: "test", label: "Test", title: "Test thoroughly", desc: "Run conversations in the Playground to verify accuracy, tone, and edge-case handling." },
  { id: "deploy", label: "Deploy", title: "Deploy everywhere", desc: "One-click deploy to web, mobile, Slack, WhatsApp, email, or your own API." },
  { id: "optimize", label: "Optimize", title: "Optimize continuously", desc: "AI-driven insights surface gaps in your agent's knowledge so you can improve over time." },
];

const agentTypes = [
  { label: "Support agent", desc: "Resolve customer issues 24/7 with AI that understands your product, policies, and processes.", color: "#4A7FA5" },
  { label: "Sales agent", desc: "Qualify leads, answer product questions, and guide prospects through your sales funnel.", color: "#5B6FA8" },
  { label: "Product guidance agent", desc: "Help users onboard, discover features, and get the most out of your product.", color: "#4A8B8C" },
];

const industries = [
  { name: "Financial Services", stat: "40% fewer escalations", desc: "Banks and fintechs use SOPRANOVA to handle account inquiries, fraud alerts, and compliance questions." },
  { name: "E-commerce", stat: "3x faster resolution", desc: "Online retailers automate order tracking, returns, and product recommendations." },
  { name: "Healthcare", stat: "HIPAA compliant", desc: "Clinics and health platforms manage appointment scheduling and patient FAQs securely." },
  { name: "SaaS", stat: "60% ticket reduction", desc: "Software companies automate onboarding, billing support, and technical troubleshooting." },
];

const footerLinks = {
  Product: ["Procedures", "Widgets", "Helpdesk", "Backstage", "Analytics", "Integrations", "Playground"],
  Company: ["About", "Blog", "Careers", "Contact", "Partners"],
  Resources: ["Documentation", "API Reference", "Changelog", "Status", "Community"],
  Legal: ["Privacy Policy", "Terms of Service", "Security", "GDPR", "SOC 2"],
};

function ProductSuiteCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        background: "#fff",
        transition: "all 0.25s ease",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "#d1d5db";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.transform = "";
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

function LifecycleStep({ step, isActive, onClick }: { step: typeof lifecycleSteps[0]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
        borderRadius: 12,
        border: isActive ? "1px solid #6366f1" : "1px solid transparent",
        background: isActive ? "#eef2ff" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isActive ? "#6366f1" : "#f3f4f6",
          color: isActive ? "#fff" : "#9ca3af",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          transition: "all 0.2s ease",
        }}
      >
        {step.id.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#111827" : "#6b7280", transition: "color 0.2s" }}>
          {step.title}
        </div>
        {isActive && (
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
            {step.desc}
          </div>
        )}
      </div>
    </button>
  );
}

function IndustryCard({ industry, isActive, onClick }: { industry: typeof industries[0]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "20px 24px",
        borderRadius: 12,
        border: isActive ? "1px solid #6366f1" : "1px solid #e5e7eb",
        background: isActive ? "#eef2ff" : "#fff",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
        flex: "0 0 auto",
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#6366f1" : "#374151", marginBottom: 4 }}>
        {industry.name}
      </div>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>{industry.stat}</div>
    </button>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLifecycle, setActiveLifecycle] = useState(0);
  const [activeIndustry, setActiveIndustry] = useState(0);
  const lifecycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    lifecycleTimer.current = setInterval(() => {
      setActiveLifecycle(prev => (prev + 1) % lifecycleSteps.length);
    }, 4000);
    return () => { if (lifecycleTimer.current) clearInterval(lifecycleTimer.current); };
  }, []);

  const handleLifecycleClick = (idx: number) => {
    setActiveLifecycle(idx);
    if (lifecycleTimer.current) clearInterval(lifecycleTimer.current);
    lifecycleTimer.current = setInterval(() => {
      setActiveLifecycle(prev => (prev + 1) % lifecycleSteps.length);
    }, 4000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── Nav ─── */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid #e5e7eb" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
              <Logo size={22} showWordmark />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {navLinks.map(link => (
                <button
                  key={link}
                  style={{
                    padding: "6px 14px", fontSize: 14, fontWeight: 500,
                    color: "#374151", background: "none", border: "none",
                    borderRadius: 8, cursor: "pointer", transition: "color 0.2s",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#374151")}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              to="/login"
              style={{
                padding: "8px 16px", fontSize: 14, fontWeight: 500,
                color: "#374151", textDecoration: "none", borderRadius: 8,
              }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              style={{
                padding: "8px 20px", fontSize: 14, fontWeight: 600,
                color: "#fff", background: "#111827", borderRadius: 8,
                textDecoration: "none", transition: "all 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1f2937")}
              onMouseLeave={e => (e.currentTarget.style.background = "#111827")}
            >
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 4.2rem)", fontWeight: 800, color: "#111827", lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-0.035em" }}>
            The complete AI agent{" "}
            <span style={{ color: "#6366f1" }}>platform</span>
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#6b7280", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 40px" }}>
            Build, deploy, and optimize AI agents that handle customer conversations across every channel. Enterprise-ready in minutes.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              to="/signup"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", fontSize: 15, fontWeight: 600,
                color: "#fff", background: "#6366f1", borderRadius: 10,
                textDecoration: "none", transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.3)"; }}
            >
              Get started for free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <a
              href="#product-suite"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", fontSize: 15, fontWeight: 600,
                color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 10, textDecoration: "none", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; }}
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ─── Trusted by ─── */}
      <section style={{ borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", padding: "40px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, marginBottom: 20, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Trusted by forward-thinking companies
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap", opacity: 0.4 }}>
            {["HAIER", "FINCORP", "TECHVAULT", "CLOUDPEAK", "NEXGEN"].map(name => (
              <div key={name} style={{ fontSize: 16, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product Suite ─── */}
      <section id="product-suite" style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              The complete product suite for customer-facing agents
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
              Everything you need to build, deploy, and manage AI agents at scale.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {productSuite.map(f => (
              <ProductSuiteCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Agent Lifecycle ─── */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              The agent lifecycle
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              From first draft to production deployment — and every iteration in between.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 40, alignItems: "center" }}>
            {/* Left: Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {lifecycleSteps.map((step, idx) => (
                <LifecycleStep
                  key={step.id}
                  step={step}
                  isActive={activeLifecycle === idx}
                  onClick={() => handleLifecycleClick(idx)}
                />
              ))}
            </div>
            {/* Right: Preview panel */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
                  SOPRANOVA — {lifecycleSteps[activeLifecycle].label}
                </div>
              </div>
              <div style={{ padding: 32, minHeight: 280, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", transition: "all 0.4s ease" }}>
                {activeLifecycle === 0 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>🛠️</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Build Your Agent</div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 300, lineHeight: 1.5 }}>
                      Define personality, connect knowledge sources, and set behavior rules — all in one workspace.
                    </div>
                  </div>
                )}
                {activeLifecycle === 1 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>🧪</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Test Thoroughly</div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 300, lineHeight: 1.5 }}>
                      Run conversations in the Playground to verify accuracy, tone, and edge-case handling.
                    </div>
                  </div>
                )}
                {activeLifecycle === 2 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>🚀</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Deploy Everywhere</div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 300, lineHeight: 1.5 }}>
                      One-click deploy to web, mobile, Slack, WhatsApp, email, or your own API.
                    </div>
                  </div>
                )}
                {activeLifecycle === 3 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>📈</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Optimize Continuously</div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 300, lineHeight: 1.5 }}>
                      AI-driven insights surface gaps in knowledge so you can improve over time.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── One agent for every interaction ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              One agent for every customer interaction
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
              Create specialized agents for different use cases — all powered by the same platform.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {agentTypes.map(agent => (
              <div
                key={agent.label}
                style={{
                  padding: 36,
                  borderRadius: 16,
                  border: "1px solid #f3f4f6",
                  background: "#fafafa",
                  textAlign: "center",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "#f3f4f6"; }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>
                  {agent.label}
                </h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Built for your industry ─── */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Built for your industry
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
              Pre-built templates and compliance-ready configurations for every vertical.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 32, overflowX: "auto", paddingBottom: 4, justifyContent: "center" }}>
            {industries.map((ind, idx) => (
              <IndustryCard
                key={ind.name}
                industry={ind}
                isActive={activeIndustry === idx}
                onClick={() => setActiveIndustry(idx)}
              />
            ))}
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 40,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                {industries[activeIndustry].stat}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 12px", fontFamily: "'Inter', sans-serif" }}>
                {industries[activeIndustry].name}
              </h3>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
                {industries[activeIndustry].desc}
              </p>
            </div>
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 12,
                padding: 32,
                border: "1px solid #f3f4f6",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Resolution Rate", value: "94%", bar: 94 },
                  { label: "Customer Satisfaction", value: "4.8/5", bar: 96 },
                  { label: "Avg Response Time", value: "<2s", bar: 85 },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{m.label}</span>
                      <span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{m.value}</span>
                    </div>
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${m.bar}%`, background: "#6366f1", borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Enterprise security (dark) ─── */}
      <section style={{ padding: "96px 0", background: "#111827", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 700, margin: "0 0 12px", color: "#fff", letterSpacing: "-0.02em" }}>
            Enterprise-grade security
          </h2>
          <p style={{ fontSize: 15, color: "#9ca3af", maxWidth: 480, margin: "0 auto 48px", lineHeight: 1.6 }}>
            Your data is protected by the highest standards of security, privacy, and compliance.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 800, margin: "0 auto" }}>
            {[
              { badge: "GDPR", title: "GDPR Compliant", desc: "Full data protection compliance with EU regulations. Your customers' data rights are respected." },
              { badge: "SOC 2", title: "SOC 2 Type II", desc: "Audited annually for security, availability, processing integrity, confidentiality, and privacy." },
              { badge: "HIPAA", title: "HIPAA Ready", desc: "Healthcare data handled with the highest level of encryption and access controls." },
            ].map(sec => (
              <div
                key={sec.badge}
                style={{
                  padding: 32,
                  borderRadius: 16,
                  border: "1px solid #374151",
                  background: "#1f2937",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4b5563"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.transform = ""; }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#a78bfa",
                    background: "rgba(167,139,250,0.15)",
                    letterSpacing: "0.06em",
                    marginBottom: 16,
                  }}
                >
                  {sec.badge}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f9fafb", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>
                  {sec.title}
                </h3>
                <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>{sec.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontWeight: 700, color: "#111827", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            Deliver exceptional customer experiences
          </h2>
          <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 16px" }}>
            Join hundreds of companies using SOPRANOVA to build AI-powered customer experiences.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 40, fontSize: 13, color: "#9ca3af" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6 11.6 2.7 8.3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              No credit card required
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6 11.6 2.7 8.3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Free plan available
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6 11.6 2.7 8.3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Setup in minutes
            </span>
          </div>
          <Link
            to="/signup"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", fontSize: 15, fontWeight: 600,
              color: "#fff", background: "#6366f1", borderRadius: 10,
              textDecoration: "none", transition: "all 0.2s",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.transform = ""; }}
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: "1px solid #f3f4f6", padding: "64px 0 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
            <div>
              <Logo size={20} showWordmark />
              <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: "16px 0 0", maxWidth: 220 }}>
                Build, deploy, and optimize AI agents that deliver exceptional customer experiences.
              </p>
            </div>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
                  {category}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {links.map(link => (
                    <a
                      key={link}
                      href="#"
                      style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#d1d5db" }}>© 2026 SOPRANOVA. All rights reserved.</div>
            <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#9ca3af" }}>
              <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Privacy</a>
              <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Terms</a>
              <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
