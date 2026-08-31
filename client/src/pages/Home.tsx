import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import Logo from "../components/Logo";

/* ─── Data ─── */

const logos = ["DOLBY", "PEARSON", "OPAL", "SIAE", "EF EDUCATION FIRST", "THOTIS", "APLAZO", "ROCHE", "F45", "BRIDGESTONE", "CHUCK E. CHEESE", "SAGE", "JUMIA", "NATIONAL GRID", "ALPIAN"];

const agents = [
  {
    label: "Support agent",
    desc: "Resolve complex support queries accurately across live chat, email, phone, Slack, and more.",
    userMsg: "My order arrived damaged — can you help?",
    aiMsg: "So sorry about that — a free replacement is on its way and arrives Thursday.",
    color: "#4A7FA5",
  },
  {
    label: "Sales agent",
    desc: "Engage prospects, answer product questions, and guide conversations toward revenue.",
    userMsg: "Is Pro worth it for my team?",
    aiMsg: "For a team, yes — Pro adds five seats, and yearly billing saves you 20%.",
    color: "#5B6FA8",
  },
  {
    label: "Product guidance agent",
    desc: "Help customers find info and understand your products with a clear, on-brand voice.",
    userMsg: "What's your brand about?",
    aiMsg: "We make gear built to last — for people who love the outdoors.",
    color: "#4A8B8C",
  },
];

const lifecycleSteps = [
  { id: "build", num: "01", title: "Build", desc: "Connect your data sources, define your agent's role, and set guardrails. No code required — ready in minutes." },
  { id: "test", num: "02", title: "Test", desc: "Run real customer scenarios before going live. Validate accuracy, brand consistency, and edge case handling across every channel." },
  { id: "deploy", num: "03", title: "Deploy", desc: "Publish your agent across chat, WhatsApp, email, Slack, and more with a single click. Goes live instantly." },
  { id: "optimize", num: "04", title: "Optimize", desc: "Track resolution rates, review escalations, and refine instructions. Your agent improves with every conversation." },
];

const productSuite = [
  {
    title: "Procedures",
    desc: "Written in plain language, followed step by step with actions built in.",
    items: ["Ask for order number and email to locate order.", "Use lookup_order to retrieve the order details.", "Confirm which item the customer wants to return.", "Check the return window eligibility.", "Check the customer information.", "Use payment_info to retrieve payment details."],
  },
  {
    title: "Widgets",
    desc: "Agents respond with interactive components, not just text.",
    example: { pkg: "Your package is in transit", eta: "Will arrive in 2 days", status: "In-transit", updated: "2m ago" },
  },
  {
    title: "Helpdesk",
    desc: "Built for AI and humans working from the same conversation.",
    tickets: [
      { status: "New", who: "Jane Doe", issue: "Payment issue", detail: "I was charged twice for my subscription this month.", time: "30m" },
      { status: "New", who: "John Smith", issue: "Login problem", detail: "I can't log in even after resetting my password twice.", time: "45m" },
      { status: "On hold", who: "Alice Jones", issue: "Bug report", detail: "The dashboard freezes every time I try to export a report.", time: "50m" },
    ],
  },
  {
    title: "Backstage",
    desc: "Your agent, offstage. Ask it about customers, tell it what to fix.",
    prompt: "Summarize issues customers are facing",
    result: { completed: 3, summary: [{ topic: "Pricing and billing", count: 12 }, { topic: "Account setup", count: 8 }, { topic: "API integration", count: 5 }, { topic: "Product features", count: 18 }, { topic: "Bug reports", count: 3 }] },
  },
  {
    title: "Analytics",
    desc: "Topics, sentiment, and trends at a glance.",
    metrics: [{ label: "Positive", value: 713 }, { label: "Jul 5", value: 541 }],
  },
  {
    title: "Integrations",
    desc: "Connect to CRMs, helpdesks, and more with a single click.",
    logos: ["Slack", "HubSpot", "Salesforce", "Zendesk", "Intercom", "Notion"],
  },
  {
    title: "Playground",
    desc: "Test models and settings before going live.",
    models: ["Claude Sonnet 4.6", "GPT-5.6", "Gemini 3.5 Flash", "DeepSeek V4-Pro", "Grok 4.5"],
  },
];

const testimonials = [
  { quote: "SOPRANOVA gave us a powerful, flexible way to launch our AI chatbot without the complexity we saw in other platforms. Guests report strong satisfaction, and the system has been easy for our team to maintain.", name: "Mark Kupferman", role: "CMO, Chuck E Cheese", company: "CHUCK E. CHEESE" },
  { quote: "Before using SOPRANOVA, user inquiries were handled entirely through manual channels. Since implementing it, we've achieved more consistent responses and reduced repetitive inquiries.", name: "Michael Igo", role: "Assistant Director, Dept. of Statistics Malaysia", company: "DEPT. OF STATISTICS" },
  { quote: "The chatbots are user-friendly, easy to customize, and have been effectively serving our customers for nearly two years.", name: "Ann Donie", role: "Product Owner, Sage", company: "SAGE" },
  { quote: "SOPRANOVA is an excellent AI chat solution for businesses. Onboarding is fast, and training the bot is easy even with a lot of information. It's been a practical, scalable tool that we highly recommend.", name: "Jesús Franco", role: "CTO, Synergym", company: "SYNERGYM" },
  { quote: "This has been one of the single best things we have done. Introducing a chatbot to our website gave us significantly more insight into the questions our customers actually had.", name: "Brent Nathan", role: "Head Of Technology, Les Mills", company: "LES MILLS" },
];

const channels = [
  { icon: "💬", label: "Chat", desc: "Your customers can talk to your agent on your Website, Meta Apps, Slack and more!" },
  { icon: "📧", label: "Email", desc: "Handle inbound support emails automatically. Your agent reads, responds, and resolves — around the clock, without a queue." },
  { icon: "📞", label: "Voice", desc: "Let customers call and get instant answers. Your agent handles questions over voice with natural, conversational responses." },
];

const industries = [
  { name: "Retail & E-commerce", desc: "Shoppers want sizing, shipping, and returns answered instantly. AI agents trained on your catalog and policies keep them moving to checkout." },
  { name: "Technology", desc: "Your users want help inside the product, not a ticket queue. Embed an identity-verified AI agent in your app, docs, and Slack." },
  { name: "Travel & Hospitality", desc: "Guests ask about availability, rates, and check-in at every hour. AI agents answer across chat, email, and voice." },
  { name: "Financial Services", desc: "Lost cards, disputed charges, and account changes cannot wait on hold. AI agents resolve them across every channel, inside the guardrails you set." },
];

const footerCols = {
  Product: ["Security", "SOPRANOVA Experts", "Hire an Expert", "Affiliates"],
  Features: ["Product overview", "Helpdesk", "Playground", "Backstage"],
  Resources: ["Customers", "Blog", "Pricing", "Docs", "Changelog", "Contact us"],
  Company: ["Trust", "Enterprise", "Careers"],
  Policy: ["Privacy Policy", "Terms & conditions", "DPA", "Cookie Policy"],
};

/* ─── Components ─── */

function LogoTicker() {
  const track = [...logos, ...logos];
  return (
    <div style={{ overflow: "hidden", padding: "32px 0", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }}>
      <div
        style={{
          display: "flex",
          gap: 48,
          width: "max-content",
          animation: "scroll-logos 40s linear infinite",
        }}
      >
        {track.map((name, i) => (
          <div key={i} style={{ fontSize: 14, fontWeight: 700, color: "#d1d5db", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", userSelect: "none" }}>
            {name}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

function ChatBubble({ userMsg, aiMsg, isActive }: { userMsg: string; aiMsg: string; isActive: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, background: "#f9fafb", borderRadius: 16, border: "1px solid #f3f4f6", minHeight: 160, transition: "all 0.3s ease", opacity: isActive ? 1 : 0.4 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "#111827", color: "#fff", fontSize: 13, lineHeight: 1.5 }}>
          {userMsg}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
        </div>
        <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: "12px 12px 12px 4px", background: "#eef2ff", color: "#374151", fontSize: 13, lineHeight: 1.5 }}>
          {aiMsg}
          <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Agent</div>
        </div>
      </div>
    </div>
  );
}

function LifecyclePanel({ step }: { step: typeof lifecycleSteps[0] }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", minHeight: 420, display: "flex", flexDirection: "column" }}>
      {/* Browser chrome */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>sopranova.com/dashboard</div>
      </div>
      {/* Content */}
      <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {step.id === "build" && (
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Instructions</div>
              <div style={{ fontSize: 12, color: "#374151", background: "#f9fafb", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>You are an AI agent helping customers with inquiries and requests. Provide friendly, efficient service.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Model</div>
                <div style={{ fontSize: 12, color: "#374151", background: "#f9fafb", padding: "8px 12px", borderRadius: 8 }}>Claude Sonnet 4.6</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Branding</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: "#6366f1" }} />
                  <span style={{ fontSize: 12, color: "#374151" }}>Accent color</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Procedure</div>
              <div style={{ fontSize: 12, color: "#374151", background: "#f9fafb", padding: "10px 12px", borderRadius: 8, lineHeight: 1.6 }}>
                1. Greet customer, ask about return.<br />
                2. Request order number or email.<br />
                3. Use lookup_order for details.<br />
                4. Confirm customer's return.<br />
                5. Check return window eligibility.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Actions</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Get invoices", "Get slots", "Retrieve products"].map(a => (
                  <span key={a} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "#eef2ff", color: "#6366f1", fontWeight: 500 }}>{a}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {step.id === "test" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Playground</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ padding: "8px 12px", borderRadius: "10px 10px 2px 10px", background: "#111827", color: "#fff", fontSize: 12 }}>How do I return an item?</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", borderRadius: "10px 10px 10px 2px", background: "#eef2ff", color: "#374151", fontSize: 12 }}>I can help with that! Could you share your order number or the email you used to place it?</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ padding: "8px 12px", borderRadius: "10px 10px 2px 10px", background: "#111827", color: "#fff", fontSize: 12 }}>It's order #45892</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", borderRadius: "10px 10px 10px 2px", background: "#eef2ff", color: "#374151", fontSize: 12 }}>Found it! You're within the 30-day return window. I've initiated a return — you'll receive a prepaid label by email. ✅</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ Accuracy: 98%</span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ Brand voice: Good</span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ Edge cases: Passed</span>
            </div>
          </div>
        )}
        {step.id === "deploy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Publish to channels</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["💬 Web Widget", "📱 WhatsApp", "📧 Email", "💼 Slack", "📱 Messenger", "📞 Voice"].map(ch => (
                <div key={ch} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  {ch}
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 500 }}>
              ✓ Agent is live on all channels
            </div>
          </div>
        )}
        {step.id === "optimize" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Performance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Resolution Rate", value: "94%", bar: 94 },
                { label: "Satisfaction", value: "4.8/5", bar: 96 },
                { label: "Response Time", value: "<2s", bar: 88 },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { topic: "Pricing and billing", count: 12, pct: 40 },
                { topic: "Account setup", count: 8, pct: 27 },
                { topic: "API integration", count: 5, pct: 17 },
                { topic: "Product features", count: 18, pct: 60 },
                { topic: "Bug reports", count: 3, pct: 10 },
              ].map(t => (
                <div key={t.topic}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{t.topic}</span>
                    <span style={{ fontSize: 11, color: "#111827", fontWeight: 600 }}>{t.count}</span>
                  </div>
                  <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${t.pct}%`, background: "#6366f1", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ item, isActive, onClick }: { item: typeof productSuite[0]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 18px",
        borderRadius: 12,
        border: isActive ? "1px solid #6366f1" : "1px solid transparent",
        background: isActive ? "#eef2ff" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#111827" : "#6b7280" }}>{item.title}</div>
    </button>
  );
}

function IndustryCard({ industry, isActive, onClick }: { industry: typeof industries[0]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 20px",
        borderRadius: 12,
        border: isActive ? "1px solid #6366f1" : "1px solid #e5e7eb",
        background: isActive ? "#eef2ff" : "#fff",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#6366f1" : "#374151" }}>{industry.name}</div>
    </button>
  );
}

/* ─── Main ─── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeAgent, setActiveAgent] = useState(0);
  const [activeLifecycle, setActiveLifecycle] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [activeChannel, setActiveChannel] = useState(0);
  const [activeIndustry, setActiveIndustry] = useState(0);
  const agentTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lifecycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    agentTimer.current = setInterval(() => setActiveAgent(p => (p + 1) % agents.length), 5000);
    lifecycleTimer.current = setInterval(() => setActiveLifecycle(p => (p + 1) % lifecycleSteps.length), 5000);
    return () => { if (agentTimer.current) clearInterval(agentTimer.current); if (lifecycleTimer.current) clearInterval(lifecycleTimer.current); };
  }, []);

  const handleAgentClick = (idx: number) => {
    setActiveAgent(idx);
    if (agentTimer.current) clearInterval(agentTimer.current);
    agentTimer.current = setInterval(() => setActiveAgent(p => (p + 1) % agents.length), 5000);
  };

  const handleLifecycleClick = (idx: number) => {
    setActiveLifecycle(idx);
    if (lifecycleTimer.current) clearInterval(lifecycleTimer.current);
    lifecycleTimer.current = setInterval(() => setActiveLifecycle(p => (p + 1) % lifecycleSteps.length), 5000);
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
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link to="/" style={{ textDecoration: "none" }}><Logo size={20} showWordmark /></Link>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {["Solutions", "Resources", "Customers", "Enterprise", "Pricing"].map(link => (
                <button key={link} style={{ padding: "6px 12px", fontSize: 14, fontWeight: 500, color: "#374151", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/login" style={{ padding: "8px 14px", fontSize: 14, fontWeight: 500, color: "#374151", textDecoration: "none", borderRadius: 8 }}>Log in</Link>
            <Link to="/signup" style={{ padding: "8px 18px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#111827", borderRadius: 8, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1f2937")}
              onMouseLeave={e => (e.currentTarget.style.background = "#111827")}>
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{ paddingTop: 150, paddingBottom: 80, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 10%, rgba(99,102,241,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fef3c7", marginBottom: 24 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#f59e0b"><path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z" /></svg>
            4.8 — The leading AI agent for CX
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 5.5vw, 3.8rem)", fontWeight: 800, color: "#111827", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.035em" }}>
            Conversational agents for<br />customer experience
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#6b7280", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 36px" }}>
            AI agents that meet customers at every stage of their journey, across chat, email, and voice, to resolve issues end to end and increase revenue.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#111827", borderRadius: 10, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1f2937"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#111827"; e.currentTarget.style.transform = ""; }}>
              Start free trial
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link to="/enterprise" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; }}>
              Get a demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Logo Ticker ─── */}
      <LogoTicker />

      {/* ─── One Agent for Every Interaction ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>
              One agent for every customer interaction, runs support, sales, and product guidance 24/7
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {agents.map((agent, idx) => (
              <div key={agent.label} onClick={() => handleAgentClick(idx)} style={{ cursor: "pointer" }}>
                <ChatBubble userMsg={agent.userMsg} aiMsg={agent.aiMsg} isActive={activeAgent === idx} />
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, margin: "0 auto 12px", borderRadius: 14, background: agent.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px", fontFamily: "'Inter', sans-serif" }}>{agent.label}</h3>
                  <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonial (OpenAI-style) ─── */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <blockquote style={{ fontSize: "1.15rem", color: "#374151", lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic" }}>
            "SOPRANOVA is a strong signal of how customer support will evolve. It is an early adopter of the agentic approach, which will become increasingly effective, trusted, and prominent."
          </blockquote>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Marc Manara</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Head of Startups, OpenAI</div>
        </div>
      </section>

      {/* ─── Agent Lifecycle ─── */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>The agent lifecycle</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 40, alignItems: "start" }}>
            {/* Left steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {lifecycleSteps.map((step, idx) => (
                <button key={step.id} onClick={() => handleLifecycleClick(idx)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px",
                    borderRadius: 12, border: activeLifecycle === idx ? "1px solid #6366f1" : "1px solid transparent",
                    background: activeLifecycle === idx ? "#eef2ff" : "transparent",
                    cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: activeLifecycle === idx ? "#6366f1" : "#9ca3af", marginTop: 2, minWidth: 24 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: activeLifecycle === idx ? "#111827" : "#6b7280" }}>{step.title}</div>
                    {activeLifecycle === idx && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>{step.desc}</div>}
                  </div>
                </button>
              ))}
              <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#6366f1", borderRadius: 10, textDecoration: "none", marginTop: 16, transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#4f46e5")}
                onMouseLeave={e => (e.currentTarget.style.background = "#6366f1")}>
                Create Agent
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
            {/* Right panel */}
            <LifecyclePanel step={lifecycleSteps[activeLifecycle]} />
          </div>
        </div>
      </section>

      {/* ─── Complete Product Suite ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>
              The complete product suite for customer-facing agents.
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Build, deploy and optimize across every channel, on one platform.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }}>
            {/* Left menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {productSuite.map((item, idx) => (
                <ProductCard key={item.title} item={item} isActive={activeProduct === idx} onClick={() => setActiveProduct(idx)} />
              ))}
            </div>
            {/* Right content */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28, minHeight: 320 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>{productSuite[activeProduct].title}</h3>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>{productSuite[activeProduct].desc}</p>

              {activeProduct === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {productSuite[0].items!.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                      <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {activeProduct === 1 && (
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 20, border: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{productSuite[1].example!.pkg}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{productSuite[1].example!.eta}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Status: {productSuite[1].example!.status}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>Updated {productSuite[1].example!.updated}</span>
                  </div>
                </div>
              )}

              {activeProduct === 2 && (
                <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Status</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Requestor</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Issue</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSuite[2].tickets!.map((t, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: t.status === "New" ? "#dbeafe" : "#fef3c7", color: t.status === "New" ? "#2563eb" : "#d97706" }}>{t.status}</span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151", fontWeight: 500 }}>{t.who}</td>
                          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{t.issue}</td>
                          <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{t.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeProduct === 3 && (
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 20, border: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{productSuite[3].prompt}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Completed {productSuite[3].result.completed} actions</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Summary</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {productSuite[3].result.summary.map(s => (
                      <div key={s.topic} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#374151" }}>{s.topic}</span>
                        <span style={{ color: "#9ca3af" }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeProduct === 4 && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {productSuite[4].metrics!.map(m => (
                    <div key={m.label} style={{ flex: "1 0 120px", padding: 16, borderRadius: 10, background: "#f9fafb", border: "1px solid #f3f4f6", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{m.value}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeProduct === 5 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {productSuite[5].logos!.map(l => (
                    <div key={l} style={{ padding: "12px 16px", borderRadius: 10, background: "#f9fafb", border: "1px solid #f3f4f6", fontSize: 13, fontWeight: 500, color: "#374151", textAlign: "center" }}>{l}</div>
                  ))}
                </div>
              )}

              {activeProduct === 6 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {productSuite[6].models!.map(m => (
                    <div key={m} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials Grid ─── */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {testimonials.slice(0, 3).map(t => (
              <div key={t.name} style={{ padding: 28, borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff" }}>
                <blockquote style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.quote}"</blockquote>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{t.role}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginTop: 20 }}>
            {testimonials.slice(3).map(t => (
              <div key={t.name} style={{ padding: 28, borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff" }}>
                <blockquote style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.quote}"</blockquote>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Build Once, Deploy Everywhere ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>Build once and deploy everywhere</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {channels.map((ch, idx) => (
                <button key={ch.label} onClick={() => setActiveChannel(idx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    borderRadius: 10, border: activeChannel === idx ? "1px solid #6366f1" : "1px solid transparent",
                    background: activeChannel === idx ? "#eef2ff" : "transparent",
                    cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                  <span style={{ fontSize: 20 }}>{ch.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: activeChannel === idx ? "#111827" : "#6b7280" }}>{ch.label}</span>
                </button>
              ))}
              <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#6366f1", borderRadius: 10, textDecoration: "none", marginTop: 16, transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#4f46e5")}
                onMouseLeave={e => (e.currentTarget.style.background = "#6366f1")}>
                Create Agent
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
            {/* Right: mock chat */}
            <div style={{ background: "#f9fafb", borderRadius: 16, border: "1px solid #f3f4f6", padding: 24, minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "#111827", color: "#fff", fontSize: 13, maxWidth: "70%" }}>What can you do?</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 4px", background: "#eef2ff", color: "#374151", fontSize: 13, lineHeight: 1.6, maxWidth: "80%" }}>
                    I can build, train, and deploy AI agents across your channels. I handle customer support, sales inquiries, and product guidance — {channels[activeChannel].label.toLowerCase()} included.
                    <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Agent</div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 20, lineHeight: 1.5 }}>{channels[activeChannel].desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trusted by 10,000 brands ─── */}
      <section style={{ padding: "64px 0", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>4.8</div>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill={i <= 4 ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="1"><path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z" /></svg>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 32 }}>Chatbase is committed to delivering the top customer support platform for those who demand excellence.</p>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Trusted by over 10,000 brands.</div>
        </div>
      </section>

      {/* ─── Enterprise Security ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>Enterprise-grade security</h2>
            <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              We follow industry-leading compliance standards and best-in-class encryption protocols to keep your customer data safe.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
            {[
              { badge: "GDPR", title: "GDPR", desc: "Full compliance with EU data protection standards.", bg: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)" },
              { badge: "SOC 2", title: "SOC 2 Type II", desc: "Independently audited for security and reliability.", bg: "linear-gradient(135deg, #1a3c3c 0%, #2a6a5a 100%)" },
              { badge: "HIPAA", title: "HIPAA", desc: "Built to handle protected health information safely.", bg: "linear-gradient(135deg, #2d1b4e 0%, #5b3a8a 100%)" },
            ].map(sec => (
              <div key={sec.badge} style={{ padding: 28, borderRadius: 16, background: sec.bg, color: "#fff", position: "relative", overflow: "hidden", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ position: "absolute", top: 16, right: 16, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.15)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>{sec.badge}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px", fontFamily: "'Inter', sans-serif" }}>{sec.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5, margin: 0 }}>{sec.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { title: "Your data stays yours", desc: "Your data is only accessible to your AI agent and not used to train models." },
              { title: "Data encryption", desc: "Data is encrypted at rest and in transit using standard algorithms." },
              { title: "Secure integrations", desc: "We use verified variables to ensure users access their own data." },
            ].map(f => (
              <div key={f.title} style={{ padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 6px", fontFamily: "'Inter', sans-serif" }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Built for your Industry ─── */}
      <section style={{ padding: "96px 0", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", fontWeight: 700, color: "#111827", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>Built for your industry</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {industries.map((ind, idx) => (
              <div key={ind.name} onClick={() => setActiveIndustry(idx)}
                style={{
                  padding: 24, borderRadius: 16, cursor: "pointer",
                  border: activeIndustry === idx ? "2px solid #6366f1" : "1px solid #e5e7eb",
                  background: activeIndustry === idx ? "#fff" : "#fff",
                  transition: "all 0.25s ease",
                  boxShadow: activeIndustry === idx ? "0 8px 30px rgba(99,102,241,0.1)" : "none",
                }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
                  AI Agent
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>{ind.name}</h3>
                <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section style={{ padding: "96px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 700, color: "#111827", margin: "0 0 16px", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>
            The world's best customer experiences run on SOPRANOVA
          </h2>
          <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 32px", lineHeight: 1.6 }}>
            Join thousands of teams using SOPRANOVA to build AI agents that deliver exceptional support at scale — across chat, email, and voice.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#111827", borderRadius: 10, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1f2937"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#111827"; e.currentTarget.style.transform = ""; }}>
              Create agent
            </Link>
            <Link to="/enterprise" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; }}>
              Get a demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: "1px solid #f3f4f6", padding: "64px 0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(5, 1fr)", gap: 32, marginBottom: 48 }}>
            <div>
              <Logo size={18} showWordmark />
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {["𝕏", "in", "📷", "▶"].map((s, i) => (
                  <a key={i} href="#" style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6b7280", textDecoration: "none", transition: "all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#f3f4f6")}>
                    {s}
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(footerCols).map(([cat, links]) => (
              <div key={cat}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14, fontFamily: "'Inter', sans-serif" }}>{cat}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {links.map(link => (
                    <a key={link} href="#" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 12, color: "#d1d5db" }}>© 2026 SOPRANOVA. All rights reserved.</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#d1d5db" }}>SOPRANOVA</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["GDPR", "SOC 2", "HIPAA"].map(b => (
                  <span key={b} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#f3f4f6", color: "#9ca3af", letterSpacing: "0.04em" }}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
