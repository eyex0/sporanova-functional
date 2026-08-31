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
  { title: "Procedures", desc: "Written in plain language, followed step by step with actions built in.", items: ["Ask for order number and email to locate order.", "Use lookup_order to retrieve the order details.", "Confirm which item the customer wants to return.", "Check the return window eligibility.", "Check the customer information.", "Use payment_info to retrieve payment details."] },
  { title: "Widgets", desc: "Agents respond with interactive components, not just text.", example: { pkg: "Your package is in transit", eta: "Will arrive in 2 days", status: "In-transit", updated: "2m ago" } },
  { title: "Helpdesk", desc: "Built for AI and humans working from the same conversation.", tickets: [
    { status: "New", who: "Jane Doe", issue: "Payment issue", detail: "I was charged twice for my subscription this month.", time: "30m" },
    { status: "New", who: "John Smith", issue: "Login problem", detail: "I can't log in even after resetting my password twice.", time: "45m" },
    { status: "On hold", who: "Alice Jones", issue: "Bug report", detail: "The dashboard freezes every time I try to export a report.", time: "50m" },
  ]},
  { title: "Backstage", desc: "Your agent, offstage. Ask it about customers, tell it what to fix.", prompt: "Summarize issues customers are facing", result: { completed: 3, summary: [{ topic: "Pricing and billing", count: 12 }, { topic: "Account setup", count: 8 }, { topic: "API integration", count: 5 }, { topic: "Product features", count: 18 }, { topic: "Bug reports", count: 3 }] } },
  { title: "Analytics", desc: "Topics, sentiment, and trends at a glance.", metrics: [{ label: "Positive", value: 713 }, { label: "Jul 5", value: 541 }] },
  { title: "Integrations", desc: "Connect to CRMs, helpdesks, and more with a single click.", logos: ["Slack", "HubSpot", "Salesforce", "Zendesk", "Intercom", "Notion"] },
  { title: "Playground", desc: "Test models and settings before going live.", models: ["Claude Sonnet 4.6", "GPT-5.6", "Gemini 3.5 Flash", "DeepSeek V4-Pro", "Grok 4.5"] },
];

const testimonials = [
  { quote: "SOPRANOVA gave us a powerful, flexible way to launch our AI chatbot without the complexity we saw in other platforms. Guests report strong satisfaction, and the system has been easy for our team to maintain. The customization options let us match our brand voice, and the platform continues to scale with us.", name: "Mark Kupferman", role: "CMO, Chuck E Cheese", company: "CHUCK E. CHEESE" },
  { quote: "Before using SOPRANOVA, user inquiries were handled entirely through manual channels such as emails and text-based responses. Since implementing SOPRANOVA, we've achieved more consistent responses and reduced repetitive inquiries, allowing our team to focus on higher-value analytical and operational tasks.", name: "Michael Igo", role: "Assistant Director, Dept. of Statistics Malaysia", company: "DEPT. OF STATISTICS" },
  { quote: "The chatbots are user-friendly, easy to customize, and have been effectively serving our customers for nearly two years.", name: "Ann Donie", role: "Product Owner, Sage", company: "SAGE" },
  { quote: "SOPRANOVA is an excellent AI chat solution for businesses. Onboarding is fast, and training the bot is easy even with a lot of information. For our end users, the experience is smooth, the answers are accurate, and it significantly reduces friction. It's been a practical, scalable tool that we highly recommend.", name: "Jesús Franco", role: "CTO, Synergym", company: "SYNERGYM" },
  { quote: "This has been one of the single best things we have done. Introducing a chatbot to our website gave us significantly more insight into the questions our customers actually had.", name: "Brent Nathan", role: "Head Of Technology, Les Mills", company: "LES MILLS" },
];

const channels = [
  { icon: "chat", label: "Chat", desc: "Your customers can talk to your agent on your Website, Meta Apps, Slack and more!" },
  { icon: "email", label: "Email", desc: "Handle inbound support emails automatically. Your agent reads, responds, and resolves — around the clock, without a queue." },
  { icon: "voice", label: "Voice", desc: "Let customers call and get instant answers. Your agent handles questions over voice with natural, conversational responses." },
];

const industries = [
  { name: "Retail & E-commerce", desc: "Shoppers want sizing, shipping, and returns answered instantly. AI agents trained on your catalog and policies keep them moving to checkout." },
  { name: "Technology", desc: "Your users want help inside the product, not a ticket queue. Embed an identity-verified AI agent in your app, docs, and Slack." },
  { name: "Travel & Hospitality", desc: "Guests ask about availability, rates, and check-in at every hour. AI agents answer across chat, email, and voice, connected to your PMS and booking engine." },
  { name: "Financial Services", desc: "Lost cards, disputed charges, and account changes cannot wait on hold. AI agents resolve them across every channel, inside the guardrails you set." },
];

const footerCols = {
  Product: ["Security", "SOPRANOVA Experts", "Hire an Expert", "Affiliates"],
  Features: ["Product overview", "Helpdesk"],
  Compare: ["Competitor"],
  Resources: ["Customers", "Blog", "Pricing", "Docs", "Changelog", "Guide", "Contact us"],
  Company: ["Trust", "Enterprise", "Careers"],
  Policy: ["Privacy Policy", "Terms & conditions", "DPA", "Cookie Policy"],
};

const videoStories = [
  { company: "OPAL", quote: "Figuring out what to automate and what needs a human — SOPRANOVA has been a great partner.", name: "Kenneth Schlenker, CEO" },
  { company: "TESTICULAR CANCER FOUNDATION", quote: "A genuinely capable clinical tool, deployed without an engineering team.", name: "Kenny Kane, CEO" },
  { company: "THOTIS MEDIA", quote: "SOPRANOVA really enables us to control AI without letting AI control us.", name: "Pierre, Data Director at Thotis Media" },
];

/* ─── Diamond Divider ─── */

function DiamondDivider() {
  return (
    <div className="relative flex items-center justify-center py-16 lg:py-20">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />
      <div className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}

/* ─── Components ─── */

function ChannelIcon({ type }: { type: string }) {
  if (type === "chat") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
  if (type === "email") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  );
}

function LifecyclePanel({ step }: { step: typeof lifecycleSteps[0] }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] h-full flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
      <div className="relative p-6 flex flex-col gap-4">
        {step.id === "build" && (
          <>
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-1.5">Instructions</div>
              <div className="text-[13px] text-[var(--foreground)] bg-[var(--surface-raised)] p-3 rounded-lg leading-relaxed">You are an AI agent helping customers with inquiries and requests. Provide friendly, efficient service.</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-1.5">Model</div>
                <div className="text-[13px] text-[var(--foreground)] bg-[var(--surface-raised)] p-2.5 rounded-lg">Claude Sonnet 4.6</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-1.5">Branding</div>
                <div className="flex gap-2 items-center">
                  <div className="w-5 h-5 rounded bg-[var(--cobalt)]" />
                  <span className="text-[13px] text-[var(--foreground)]">Accent color</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-1.5">Procedure</div>
              <div className="text-[13px] text-[var(--foreground)] bg-[var(--surface-raised)] p-3 rounded-lg leading-relaxed">
                1. Greet customer, ask about return.<br/>
                2. Request order number or email.<br/>
                3. Use lookup_order for details.<br/>
                4. Confirm customer's return.<br/>
                5. Check return window eligibility.
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-1.5">Actions</div>
              <div className="flex gap-2 flex-wrap">
                {["Get invoices", "Get slots", "Retrieve products"].map(a => (
                  <span key={a} className="text-[11px] px-2.5 py-1 rounded-md bg-blue-50 text-[var(--cobalt)] font-medium">{a}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {step.id === "test" && (
          <div className="flex flex-col gap-3 flex-1">
            <div className="text-[13px] font-semibold text-[var(--foreground)]">Playground</div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex justify-end">
                <div className="px-3 py-2 rounded-[10px_10px_2px_10px] bg-[var(--foreground)] text-white text-[13px]">How do I return an item?</div>
              </div>
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-[10px_10px_10px_2px] bg-blue-50 text-[var(--foreground)] text-[13px]">I can help with that! Could you share your order number or the email you used to place it?</div>
              </div>
              <div className="flex justify-end">
                <div className="px-3 py-2 rounded-[10px_10px_2px_10px] bg-[var(--foreground)] text-white text-[13px]">It's order #45892</div>
              </div>
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-[10px_10px_10px_2px] bg-blue-50 text-[var(--foreground)] text-[13px]">Found it! You're within the 30-day return window. I've initiated a return — you'll receive a prepaid label by email. ✅</div>
              </div>
            </div>
            <div className="flex gap-3 text-[12px]">
              <span className="text-green-600 font-semibold">✓ Accuracy: 98%</span>
              <span className="text-green-600 font-semibold">✓ Brand voice: Good</span>
              <span className="text-green-600 font-semibold">✓ Edge cases: Passed</span>
            </div>
          </div>
        )}
        {step.id === "deploy" && (
          <div className="flex flex-col gap-4">
            <div className="text-[13px] font-semibold text-[var(--foreground)]">Publish to channels</div>
            <div className="grid grid-cols-2 gap-2.5">
              {["💬 Web Widget", "📱 WhatsApp", "📧 Email", "💼 Slack", "📱 Messenger", "📞 Voice"].map(ch => (
                <div key={ch} className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[13px] text-[var(--foreground)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {ch}
                </div>
              ))}
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-green-50 text-green-700 text-[13px] font-medium">
              ✓ Agent is live on all channels
            </div>
          </div>
        )}
        {step.id === "optimize" && (
          <div className="flex flex-col gap-3.5">
            <div className="text-[13px] font-semibold text-[var(--foreground)]">Performance</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Resolution Rate", value: "94%" },
                { label: "Satisfaction", value: "4.8/5" },
                { label: "Response Time", value: "<2s" },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-xl font-bold text-[var(--foreground)]">{m.value}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-1">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {[
                { topic: "Pricing and billing", count: 12, pct: 40 },
                { topic: "Account setup", count: 8, pct: 27 },
                { topic: "API integration", count: 5, pct: 17 },
                { topic: "Product features", count: 18, pct: 60 },
                { topic: "Bug reports", count: 3, pct: 10 },
              ].map(t => (
                <div key={t.topic}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] text-[var(--muted)]">{t.topic}</span>
                    <span className="text-[12px] text-[var(--foreground)] font-semibold">{t.count}</span>
                  </div>
                  <div className="h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--cobalt)] rounded-full" style={{ width: `${t.pct}%` }} />
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

/* ─── Main ─── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLifecycle, setActiveLifecycle] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [activeChannel, setActiveChannel] = useState(0);
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const lifecycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    lifecycleTimer.current = setInterval(() => setActiveLifecycle(p => (p + 1) % lifecycleSteps.length), 6000);
    return () => { if (lifecycleTimer.current) clearInterval(lifecycleTimer.current); };
  }, []);

  const handleLifecycleClick = (idx: number) => {
    setActiveLifecycle(idx);
    if (lifecycleTimer.current) clearInterval(lifecycleTimer.current);
    lifecycleTimer.current = setInterval(() => setActiveLifecycle(p => (p + 1) % lifecycleSteps.length), 6000);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── Nav ─── */}
      <header
        className="fixed inset-x-0 top-0 z-45 transition-colors duration-400 ease-in-out h-16"
        style={{
          background: scrolled ? "rgba(253,252,251,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
        }}
      >
        <nav className="relative mx-auto flex h-full w-full max-w-[1240px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center"><Logo size={20} showWordmark /></Link>
            <ul className="hidden lg:flex items-center gap-1">
              {["Solutions", "Resources", "Customers", "Enterprise", "Pricing"].map(link => (
                <li key={link}>
                  <Link to={link === "Pricing" ? "/pricing" : "#"} className="px-3 py-2 text-[14px] font-medium text-[var(--foreground)] hover:text-black rounded-md transition-colors inline-flex items-center gap-1">
                    {link}
                    {["Solutions", "Resources"].includes(link) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-[14px] font-medium text-[var(--foreground)] hover:text-black rounded-md transition-colors">Log in</Link>
            <Link to="/signup" className="px-4 py-2 text-[14px] font-semibold text-white bg-[var(--foreground)] rounded-lg hover:bg-gray-800 transition-all">Start free trial</Link>
          </div>
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[var(--border)] px-6 py-4 space-y-2">
            {["Solutions", "Resources", "Customers", "Enterprise", "Pricing"].map(link => (
              <Link key={link} to="#" className="block py-2 text-[14px] font-medium text-[var(--foreground)]" onClick={() => setMobileMenuOpen(false)}>{link}</Link>
            ))}
            <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-2">
              <Link to="/login" className="py-2 text-[14px] font-medium text-[var(--foreground)]">Log in</Link>
              <Link to="/signup" className="py-2.5 text-[14px] font-semibold text-white bg-[var(--foreground)] rounded-lg text-center">Start free trial</Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible">
        <div className="mx-auto max-w-[1240px] border-x border-b border-[var(--border)]">
          <div className="lg:flex">
            {/* Left column */}
            <div className="flex flex-1 flex-col items-start justify-center px-6 pt-11 pb-6 text-left lg:min-h-[720px] lg:px-20 lg:py-20">
              <div className="flex flex-row items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">G</span>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="14" height="14" viewBox="0 0 16 16" fill={i <= 4 ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="1">
                      <path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-[14px] font-medium text-[var(--foreground)] ml-1">4.8</span>
                <div className="h-4 w-px bg-[var(--border)] mx-1" />
                <span className="text-[14px] font-medium text-[var(--muted)]">The leading AI agent for CX</span>
              </div>

              <h1 className="mt-5 max-w-[519px] text-balance text-[32px] leading-[1.1] font-semibold text-[var(--foreground)] tracking-tight lg:text-[56px] lg:max-w-none">
                Conversational <span className="italic">agents</span> for <span className="italic">customer</span> experience
              </h1>

              <p className="mt-5 max-w-[497px] text-[16px] leading-relaxed text-[var(--muted-foreground)] lg:text-[18px]">
                AI agents that meet customers at every stage of their journey, across chat, email, and voice, to resolve issues end to end and increase revenue.
              </p>

              <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link to="/signup" className="h-12 px-5 py-3 bg-[var(--foreground)] text-white rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-gray-800 transition-all hover:-translate-y-0.5">
                  Start free trial
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
                <Link to="/enterprise" className="h-12 px-5 py-3 bg-[var(--surface-raised)] text-[var(--foreground)] border border-[var(--border)] rounded-lg font-semibold text-[15px] flex items-center justify-center hover:border-gray-400 transition-all hover:-translate-y-0.5">
                  Get a demo
                </Link>
              </div>
            </div>

            {/* Right column - Hero visual */}
            <div className="relative w-full overflow-hidden bg-[#2c41b3] lg:h-[720px] lg:w-[528px] lg:shrink-0 lg:border-l border-[var(--border)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[90%] h-[85%] rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden shadow-2xl">
                  <div className="h-8 bg-white/10 flex items-center gap-1.5 px-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <div className="flex-1 text-center text-[10px] text-white/60 font-medium">sopranova.com/dashboard</div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-32 bg-white/20 rounded" />
                    <div className="h-3 w-48 bg-white/10 rounded" />
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="h-20 bg-white/10 rounded-lg" />
                      <div className="h-20 bg-white/10 rounded-lg" />
                      <div className="h-20 bg-white/10 rounded-lg" />
                    </div>
                    <div className="h-3 w-40 bg-white/10 rounded mt-3" />
                    <div className="h-16 bg-white/10 rounded-lg mt-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Logo Grid ─── */}
      <section className="flex justify-center px-6 py-11 lg:px-20 lg:py-20">
        <div className="w-full max-w-[1080px] border-t border-l border-[var(--border)] hidden lg:block">
          {[logos.slice(0, 6), logos.slice(6, 12), [...logos.slice(12), ...logos.slice(0, Math.max(0, 6 - logos.length + 12))]].filter(row => row.length > 0).slice(0, 2).map((row, ri) => (
            <div key={ri} className="flex">
              {row.slice(0, 6).map((name, i) => (
                <div key={i} className="flex h-20 flex-1 items-center justify-center border-r border-b border-[var(--border)] hover:bg-white transition-colors cursor-pointer group">
                  <span className="text-[13px] font-bold text-gray-300 tracking-[0.1em] group-hover:text-gray-500 transition-colors select-none whitespace-nowrap">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Mobile logo marquee */}
        <div className="lg:hidden overflow-hidden w-full">
          <div className="flex gap-12 w-max animate-[scroll-logos_40s_linear_infinite]">
            {[...logos, ...logos].map((name, i) => (
              <span key={i} className="text-[13px] font-bold text-gray-300 tracking-[0.1em] whitespace-nowrap select-none">{name}</span>
            ))}
          </div>
          <style>{`@keyframes scroll-logos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
        </div>
      </section>

      {/* ─── One Agent for Every Interaction ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <h2 className="max-w-[734px] text-[24px] font-semibold text-[var(--foreground)] lg:text-[32px]">
              One agent for every customer interaction, <span className="text-[var(--muted-foreground)]">runs support, sales, and product guidance 24/7</span>
            </h2>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-5">
              {agents.map((agent, idx) => (
                <div key={agent.label} className="group flex-1 cursor-pointer">
                  <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden p-5 transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3.5 py-2.5 rounded-[12px_12px_4px_12px] bg-[var(--foreground)] text-white text-[13px] leading-relaxed">{agent.userMsg}</div>
                      </div>
                      <div className="flex justify-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--cobalt)] flex items-center justify-center shrink-0 mt-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        </div>
                        <div className="max-w-[80%] px-3.5 py-2.5 rounded-[12px_12px_12px_4px] bg-blue-50 text-[var(--foreground)] text-[13px] leading-relaxed">
                          {agent.aiMsg}
                          <div className="text-[10px] text-[var(--cobalt)] font-semibold mt-2 uppercase tracking-wider">AI Agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-[14px] flex items-center justify-center" style={{ background: agent.color }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">{agent.label}</h3>
                    <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">{agent.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Marc Manara testimonial */}
            <div className="flex justify-between gap-8 border-t border-[var(--border)] pt-11 lg:pt-16 lg:px-0 lg:py-16">
              <div className="max-w-[611px]">
                <blockquote className="text-[18px] text-[var(--foreground)] leading-relaxed lg:text-[20px]">
                  "SOPRANOVA is a strong signal of how customer support will evolve. It is an early adopter of the agentic approach, which will become increasingly effective, trusted, and prominent."
                </blockquote>
                <p className="mt-5 text-[14px] text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">Marc Manara,</span> <span className="font-medium">Head of Startups</span>
                </p>
              </div>
              <div className="hidden md:flex w-[289px] h-[289px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl items-center justify-center border border-[var(--border)]">
                <div className="text-center p-6">
                  <div className="text-[40px] mb-2">👋</div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">Marc Manara</div>
                  <div className="text-[12px] text-[var(--muted-foreground)]">OpenAI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Agent Lifecycle ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="hidden flex-row lg:flex lg:h-[699px]">
            {/* Left column */}
            <div className="flex w-1/2 flex-col gap-16 px-20 py-20">
              <h2 className="text-balance text-[32px] font-semibold text-[var(--foreground)]">The agent lifecycle</h2>

              <div className="flex flex-col gap-8 border-l-2 border-transparent">
                {lifecycleSteps.map((step, idx) => (
                  <button key={step.id} onClick={() => handleLifecycleClick(idx)}
                    className="flex items-start gap-3.5 pl-4 text-left transition-all">
                    <div className="flex flex-col items-center">
                      <div className={`text-[11px] font-bold min-w-[24px] ${activeLifecycle === idx ? "text-[var(--pink)]" : "text-[var(--muted)]"}`}>{step.num}</div>
                      {idx < lifecycleSteps.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-2 ${activeLifecycle > idx ? "bg-[var(--pink)]" : "bg-[var(--border)]"}`} />
                      )}
                    </div>
                    <div>
                      <div className={`text-[15px] font-semibold transition-colors ${activeLifecycle === idx ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{step.title}</div>
                      <div className={`overflow-hidden transition-all duration-300 ${activeLifecycle === idx ? "max-h-40 mt-1.5 opacity-100" : "max-h-0 opacity-0"}`}>
                        <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-white bg-[var(--cobalt)] rounded-lg w-fit hover:bg-blue-700 transition-all mt-2">
                Create Agent
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>

            {/* Right column - Visual */}
            <div className="flex w-1/2 border-l border-[var(--border)]">
              <div className="relative w-full overflow-hidden bg-[#2c41b3]">
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <LifecyclePanel step={lifecycleSteps[activeLifecycle]} />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile lifecycle */}
          <div className="lg:hidden flex flex-col gap-11 px-6 py-11">
            <h2 className="text-balance text-[24px] font-semibold text-[var(--foreground)]">The agent lifecycle</h2>
            <div className="flex flex-col gap-4">
              {lifecycleSteps.map((step, idx) => (
                <button key={step.id} onClick={() => handleLifecycleClick(idx)} className="text-left p-4 rounded-xl border border-[var(--border)] transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold ${activeLifecycle === idx ? "text-[var(--pink)]" : "text-[var(--muted)]"}`}>{step.num}</span>
                    <span className={`text-[15px] font-semibold ${activeLifecycle === idx ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{step.title}</span>
                  </div>
                  {activeLifecycle === idx && <p className="text-[13px] text-[var(--muted-foreground)] mt-2 leading-relaxed">{step.desc}</p>}
                </button>
              ))}
            </div>
            <LifecyclePanel step={lifecycleSteps[activeLifecycle]} />
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Complete Product Suite ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <div>
              <h2 className="text-balance text-[24px] font-semibold text-[var(--foreground)] lg:text-[32px]">
                The complete product suite for customer-facing agents. <span className="text-[var(--muted-foreground)]">Build, deploy and optimize across every channel, on one platform.</span>
              </h2>
            </div>

            <div className="border-t border-l border-[var(--border)] grid grid-cols-1 md:grid-cols-2">
              {/* Procedures */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Procedures</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Written in plain language, followed step by step with actions built in.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {productSuite[0].items!.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--foreground)] leading-relaxed">
                      <span className="text-[var(--cobalt)] font-bold text-[12px] min-w-[18px]">{i + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Widgets */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Widgets</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Agents respond with interactive components, not just text.</p>
                </div>
                <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border)]">
                  <div className="text-[13px] text-[var(--foreground)] mb-2">{productSuite[1].example!.pkg} and will arrive in 2 days.</div>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-[var(--border)]">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[12px] font-medium text-[var(--foreground)]">Status: {productSuite[1].example!.status}</span>
                    <span className="text-[11px] text-[var(--muted)] ml-auto">Updated {productSuite[1].example!.updated}</span>
                  </div>
                </div>
              </div>

              {/* Helpdesk */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Helpdesk</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Built for AI and humans working from the same conversation.</p>
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[var(--surface-raised)] text-left">
                        <th className="px-3 py-2 font-semibold text-[var(--muted-foreground)]">Status</th>
                        <th className="px-3 py-2 font-semibold text-[var(--muted-foreground)]">Requestor</th>
                        <th className="px-3 py-2 font-semibold text-[var(--muted-foreground)]">Issue</th>
                        <th className="px-3 py-2 font-semibold text-[var(--muted-foreground)]">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSuite[2].tickets!.map((t, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${t.status === "New" ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"}`}>{t.status}</span>
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground)] font-medium">{t.who}</td>
                          <td className="px-3 py-2 text-[var(--muted-foreground)]">{t.issue}</td>
                          <td className="px-3 py-2 text-[var(--muted)]">{t.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Backstage */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Backstage</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Your agent, offstage. Ask it about customers, tell it what to fix.</p>
                </div>
                <div className="bg-[var(--surface-raised)] rounded-xl p-5 border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[var(--cobalt)] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--foreground)]">{productSuite[3].prompt}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">Completed {productSuite[3].result.completed} actions</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">Summary</div>
                  <div className="flex flex-col gap-1.5">
                    {productSuite[3].result.summary.map(s => (
                      <div key={s.topic} className="flex justify-between text-[12px]">
                        <span className="text-[var(--foreground)]">{s.topic}</span>
                        <span className="text-[var(--muted)]">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8 md:border-b-0">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Analytics</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Topics, sentiment, and trends at a glance.</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  {productSuite[4].metrics!.map(m => (
                    <div key={m.label} className="flex-1 min-w-[120px] p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
                      <div className="text-xl font-bold text-[var(--foreground)]">{m.value}</div>
                      <div className="text-[12px] text-[var(--muted)] mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8 md:border-b-0">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Integrations</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Connect to CRMs, helpdesks, and more with a single click.</p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {productSuite[5].logos!.map(l => (
                    <div key={l} className="px-3 py-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)] text-center">{l}</div>
                  ))}
                </div>
              </div>

              {/* Playground */}
              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Playground</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Test models and settings before going live.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {productSuite[6].models!.map(m => (
                    <div key={m} className="px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white text-[13px] text-[var(--foreground)] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--cobalt)]" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6 overflow-hidden border-r border-b border-[var(--border)] p-6 lg:p-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Playground</h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">Test models and settings before going live.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {["Claude Sonnet 4.6", "GPT-5.6", "Gemini 3.5 Flash", "DeepSeek V4-Pro", "Grok 4.5"].map(m => (
                    <div key={m} className="px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-white text-[13px] text-[var(--foreground)] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--cobalt)]" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Testimonials stacked */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-[520px]">
                {testimonials.map((t, i) => (
                  <div key={t.name} className={`p-8 rounded-2xl border border-[var(--border)] bg-white ${i === testimonialIdx ? "relative z-10" : "absolute inset-0 z-0"}`}
                    style={{ display: i === testimonialIdx ? "block" : "none" }}>
                    <blockquote className="text-[14px] text-[var(--foreground)] leading-relaxed mb-5 italic">
                      "{t.quote}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-bold text-gray-500">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--foreground)]">{t.name}</div>
                        <div className="text-[12px] text-[var(--muted-foreground)]">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${testimonialIdx === i ? "bg-[var(--foreground)]" : "bg-gray-300"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Build Once, Deploy Everywhere ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="hidden lg:flex lg:h-[699px]">
            {/* Left - Visual */}
            <div className="flex w-1/2 border-r border-[var(--border)]">
              <div className="relative w-full overflow-hidden bg-[#2c41b3]">
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="w-[85%] rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 shadow-2xl">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end">
                        <div className="px-3.5 py-2.5 rounded-[12px_12px_4px_12px] bg-white text-gray-800 text-[13px]">What can you do?</div>
                      </div>
                      <div className="flex justify-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--cobalt)] flex items-center justify-center shrink-0 mt-0.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        </div>
                        <div className="px-3.5 py-2.5 rounded-[12px_12px_12px_4px] bg-white/90 text-gray-800 text-[13px] leading-relaxed">
                          I can build, train, and deploy AI agents across your channels. I handle customer support, sales inquiries, and product guidance — {channels[activeChannel].label.toLowerCase()} included.
                          <div className="text-[10px] text-[var(--cobalt)] font-semibold mt-2 uppercase tracking-wider">AI Agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex w-1/2 flex-col gap-10 px-20 py-20">
              <h2 className="text-balance text-[32px] font-semibold text-[var(--foreground)]">Build once and deploy everywhere</h2>

              <div className="flex flex-col gap-6 border-l-2 border-transparent">
                {channels.map((ch, idx) => (
                  <button key={ch.label} onClick={() => setActiveChannel(idx)}
                    className="flex items-start gap-3.5 pl-4 text-left transition-all">
                    <div className={`w-5 h-5 mt-0.5 ${activeChannel === idx ? "text-[var(--cobalt)]" : "text-[var(--muted)]"}`}>
                      <ChannelIcon type={ch.icon} />
                    </div>
                    <div>
                      <div className={`text-[15px] font-semibold transition-colors ${activeChannel === idx ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{ch.label}</div>
                      <div className={`overflow-hidden transition-all duration-300 ${activeChannel === idx ? "max-h-40 mt-1.5 opacity-100" : "max-h-0 opacity-0"}`}>
                        <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">{ch.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-white bg-[var(--cobalt)] rounded-lg w-fit hover:bg-blue-700 transition-all mt-2">
                Create Agent
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col gap-11 px-6 py-11">
            <h2 className="text-balance text-[24px] font-semibold text-[var(--foreground)]">Build once and deploy everywhere</h2>
            <div className="bg-[#2c41b3] rounded-xl p-6 min-h-[240px]">
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="px-3.5 py-2.5 rounded-[12px_12px_4px_12px] bg-white text-gray-800 text-[13px]">What can you do?</div>
                </div>
                <div className="flex justify-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--cobalt)] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-[12px_12px_12px_4px] bg-white/90 text-gray-800 text-[13px] leading-relaxed">
                    I can build, train, and deploy AI agents across your channels.
                    <div className="text-[10px] text-[var(--cobalt)] font-semibold mt-2 uppercase">AI Agent</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {channels.map((ch, idx) => (
                <button key={ch.label} onClick={() => setActiveChannel(idx)} className="text-left p-4 rounded-xl border border-[var(--border)] transition-all">
                  <div className="flex items-center gap-3">
                    <div className={activeChannel === idx ? "text-[var(--cobalt)]" : "text-[var(--muted)]"}><ChannelIcon type={ch.icon} /></div>
                    <span className={`text-[15px] font-semibold ${activeChannel === idx ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{ch.label}</span>
                  </div>
                  {activeChannel === idx && <p className="text-[13px] text-[var(--muted-foreground)] mt-2 leading-relaxed">{ch.desc}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Trusted by over 10,000 brands ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <h2 className="text-[24px] font-semibold text-[var(--foreground)] lg:text-center lg:text-[32px]">Trusted by over 10,000 brands.</h2>

            {/* Video carousel */}
            <div className="overflow-hidden">
              <div className="flex gap-5">
                {videoStories.map((story, i) => (
                  <div key={i} className="min-w-0 shrink-0 grow-0 basis-full lg:basis-[88%] rounded-2xl overflow-hidden border border-[var(--border)] bg-gray-100 relative group cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/50 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <blockquote className="text-white text-[14px] leading-relaxed mb-2">"{story.quote}"</blockquote>
                      <p className="text-white/80 text-[13px]">{story.name}</p>
                      <Link to="#" className="text-white text-[13px] mt-2 inline-flex items-center gap-1 hover:underline">
                        Read customer story <span className="text-pink-400">&gt;</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* G2 Rating */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-bold text-[var(--foreground)]">4.8</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill={i <= 4 ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="1">
                      <path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-[16px] text-[var(--foreground)] max-w-[600px]">SOPRANOVA is committed to delivering the top customer support platform for those who demand excellence.</p>
              <div className="mt-4 px-6 py-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
                <div className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">G2 Awards</div>
                <div className="flex gap-3 mt-2">
                  {["Momentum Leader", "Easiest Setup", "High Performer"].map(badge => (
                    <span key={badge} className="text-[11px] font-medium text-[var(--foreground)] px-2 py-1 bg-white rounded border border-[var(--border)]">{badge}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Enterprise Security (Dark) ─── */}
      <section className="w-full bg-[var(--foreground)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-gray-700">
          <div className="flex flex-col gap-10 px-6 py-11 lg:gap-12 lg:px-20 lg:py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-[24px] font-semibold text-white lg:text-[32px]">Enterprise-grade security</h2>
              <p className="text-[15px] text-gray-400 max-w-[615px] leading-relaxed">
                We follow industry-leading compliance standards and best-in-class encryption protocols to keep your customer data safe.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {[
                { badge: "GDPR", title: "GDPR", desc: "Full compliance with EU data protection standards.", gradient: "from-blue-900 to-blue-700" },
                { badge: "SOC 2", title: "SOC 2 Type II", desc: "Independently audited for security and reliability.", gradient: "from-teal-900 to-teal-700" },
                { badge: "HIPAA", title: "HIPAA", desc: "Built to handle protected health information safely.", gradient: "from-purple-900 to-purple-700" },
              ].map(sec => (
                <div key={sec.badge} className={`flex flex-col border border-gray-700 rounded-xl overflow-hidden`}>
                  <div className={`h-32 bg-gradient-to-br ${sec.gradient} flex items-center justify-center`}>
                    <span className="text-white/30 text-[48px] font-bold">{sec.badge}</span>
                  </div>
                  <div className="p-6 bg-gray-900">
                    <h3 className="text-[18px] font-semibold text-white mb-1">{sec.title}</h3>
                    <p className="text-[13px] text-gray-400 leading-relaxed">{sec.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-700 pt-8">
              {[
                { title: "Your data stays yours", desc: "Your data is only accessible to your AI agent and not used to train models.", iconColor: "text-blue-400", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                { title: "Data encryption", desc: "Data is encrypted at rest and in transit using standard algorithms.", iconColor: "text-orange-400", icon: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" },
                { title: "Secure integrations", desc: "We use verified variables to ensure users access their own data.", iconColor: "text-green-400", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
              ].map(f => (
                <div key={f.title} className="flex flex-col gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={f.iconColor}>
                    <path d={f.icon}/>
                  </svg>
                  <h4 className="text-[14px] font-semibold text-white">{f.title}</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Built for your Industry ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)]">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)]">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <div className="flex items-center justify-between gap-6">
              <h2 className="text-[24px] font-semibold text-[var(--foreground)] lg:text-[32px]">Built for your industry</h2>
              <div className="hidden lg:flex gap-2">
                <button onClick={() => setActiveIndustry(Math.max(0, activeIndustry - 1))} className="w-16 h-16 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-raised)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button onClick={() => setActiveIndustry(Math.min(industries.length - 1, activeIndustry + 1))} className="w-16 h-16 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-raised)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>

            <div className="hidden lg:flex gap-5" style={{ minHeight: 560 }}>
              {industries.map((ind, idx) => {
                const isActive = activeIndustry === idx;
                return (
                  <Link key={ind.name} to="#" onClick={(e) => { e.preventDefault(); setActiveIndustry(idx); }}
                    className={`relative isolate min-w-0 overflow-hidden border border-[var(--border)] rounded-xl transition-all duration-500 cursor-pointer flex flex-col justify-end ${isActive ? "flex-[5] shadow-xl" : "flex-[1] hover:flex-[2]"}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#20349F] via-[#20349F]/60 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-600" />
                    <div className="relative z-20 p-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[11px] font-semibold text-white mb-3">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        AI Agent
                      </div>
                      <h3 className="text-[16px] font-semibold text-white mb-1">{ind.name}</h3>
                      <p className={`text-[13px] text-white/80 leading-relaxed transition-all duration-500 ${isActive ? "opacity-100 max-h-40" : "opacity-0 max-h-0 overflow-hidden"}`}>{ind.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex flex-col gap-4">
              {industries.map((ind, idx) => (
                <button key={ind.name} onClick={() => setActiveIndustry(idx)} className="text-left p-5 rounded-xl border border-[var(--border)] transition-all">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-[var(--cobalt)] mb-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                    AI Agent
                  </div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">{ind.name}</h3>
                  {activeIndustry === idx && <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">{ind.desc}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="w-full bg-[var(--surface)] overflow-visible border-y border-[var(--border)] border-b-0 px-6 lg:px-0 mt-8 lg:mt-0">
        <div className="mx-auto max-w-[1240px] border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="flex flex-col items-center p-6 md:px-10 md:py-20 lg:px-20 lg:py-30">
            <h1 className="text-balance text-[32px] font-semibold text-[var(--foreground)] lg:text-[56px]">
              The world's best <span className="italic">customer</span> <span className="italic">experiences</span> run on SOPRANOVA
            </h1>
            <p className="mt-4 text-[16px] text-[var(--muted-foreground)] max-w-[601px] text-center lg:text-[18px]">
              Join thousands of teams using SOPRANOVA to build AI agents that deliver exceptional support at scale — across chat, email, and voice.
            </p>
            <div className="mt-6 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row md:mt-8">
              <Link to="/signup" className="h-12 px-5 py-3 bg-[var(--foreground)] text-white rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
                Create agent
              </Link>
              <Link to="/enterprise" className="h-12 px-5 py-3 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-lg font-semibold text-[15px] flex items-center justify-center hover:border-gray-400 transition-all">
                Get a demo
              </Link>
            </div>

            {/* Diamond pattern divider */}
            <div className="w-full mt-12 border-t border-[var(--border)] pt-8 flex justify-center">
              <svg width="120" height="20" viewBox="0 0 120 20" fill="none">
                {[0,20,40,60,80,100].map(x => (
                  <rect key={x} x={x + 8} y="4" width="8" height="8" rx="1" transform="rotate(45 12 8)" stroke="var(--border)" fill="none" strokeWidth="1"/>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer (Blue) ─── */}
      <footer className="relative isolate bg-[#3446df]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 mx-auto hidden max-w-[1240px] border-x border-b border-white/10 bg-[var(--surface-raised)] lg:block">
          <div className="px-20 pt-20 pb-12">
            <div className="flex flex-row gap-12">
              {/* Left */}
              <div className="w-[290px] shrink-0">
                <Logo size={20} showWordmark />
                <div className="flex items-center gap-3 mt-4">
                  {["𝕏", "in", "📷", "▶"].map((s, i) => (
                    <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[13px] text-white/60 hover:bg-white/20 transition-colors">
                      {s}
                    </a>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-1 flex-col gap-8">
                <div className="grid grid-cols-4 gap-12">
                  {(["Product", "Features", "Compare", "Resources"] as const).map(cat => (
                    <div key={cat}>
                      <div className="text-[13px] font-semibold text-[var(--foreground)] mb-4">{cat}</div>
                      <div className="flex flex-col gap-2.5">
                        {footerCols[cat].map(link => (
                          <a key={link} href="#" className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">{link}</a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-12">
                  {(["Company", "Policy"] as const).map(cat => (
                    <div key={cat}>
                      <div className="text-[13px] font-semibold text-[var(--foreground)] mb-4">{cat}</div>
                      <div className="flex flex-col gap-2.5">
                        {footerCols[cat].map(link => (
                          <a key={link} href="#" className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">{link}</a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 border-t border-[var(--border)] pt-6 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Logo size={14} showWordmark />
                <div className="flex gap-1.5">
                  {["GDPR", "SOC 2", "HIPAA"].map(b => (
                    <span key={b} className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--surface-raised)] text-[var(--muted-foreground)] tracking-wide border border-[var(--border)]">{b}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[12px] text-[var(--muted-foreground)]">All systems operational</span>
              </div>
              <div className="text-[12px] text-[var(--muted-foreground)]">© 2026 SOPRANOVA. All rights reserved.</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
