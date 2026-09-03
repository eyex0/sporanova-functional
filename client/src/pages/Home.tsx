/**
 * Reference style: SOPRANOVA-inspired editorial SaaS landing page — warm white,
 * black ink, cobalt signal fields, Geist + Proza emphasis, thin product frames.
 */
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Code2,
  Database,
  Ellipsis,
  Mail,
  Menu,
  MessageCircle,
  MousePointer2,
  Phone,
  Play,
  Pause,
  Plus,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import PublicNav from "@/components/PublicNav";
import { customerStories } from "@/data/customerStories";
import { trackFrontendEvent } from "@/lib/frontendEvents";
import "./hero-video-replica.css";
import "./hero-motion-refine.css";
import "./suite-motion.css";
import "./accessible-carousel.css";

import Logo from "@/components/Logo";

const navItems = ["Solutions", "Resources", "Customers", "Enterprise", "Pricing"];

const tickets = [
  ["New", "Jamie R.", "Payment issue", "I was charged twice for my subscription.", "30m", "blue"],
  ["New", "Morgan L.", "Login problem", "I can’t access my account after resetting my password.", "45m", "blue"],
  ["On hold", "Alex T.", "Bug report", "The dashboard freezes when I export a report.", "gray"],
  ["Closed", "Taylor H.", "Account cancellation", "I cancelled last week but received a new invoice.", "gray"],
  ["On you", "Sam P.", "Onboarding question", "How do I invite another member to my workspace?", "black"],
];

const procedures = [
  "Ask for order number and email to locate order.",
  "Use lookup_order to retrieve the order details.",
  "Confirm which item the customer wants to return.",
  "Check the return window eligibility.",
  "Check the customer information.",
  "Use payment_info to retrieve payment details.",
];

const industries = [
  ["Retail & E-commerce", "Shoppers want sizing, shipping, and returns answered instantly. AI agents trained on your catalog and policies keep them moving to checkout."],
  ["Technology", "Your users want help inside the product, not a ticket queue. Embed an identity-verified AI agent in your app, docs, and Slack."],
  ["Travel & Hospitality", "Guests ask about availability, rates, and check-in at every hour. Agents answer across chat, email, and voice."],
  ["Financial Services", "Lost cards, disputed charges, and account changes cannot wait on hold. Give every request a fast, governed path."],
];

function PrimaryButton({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <button onClick={onClick} className={`primary-button ${className}`}>{children}<ArrowRight size={15} strokeWidth={2.1} /></button>;
}

function SectionRule() {
  return <div className="section-rule" aria-hidden="true"><span /></div>;
}

function AgentCard({ label, prompt, response, title, body, tone }: { label: string; prompt: string; response: string; title: string; body: string; tone: string }) {
  return (
    <article className={`agent-card ${tone}`}>
      <div className="agent-bubble user">{prompt}</div>
      <div className="agent-bubble answer"><span className="agent-mini-mark"><Bot size={13} /></span>{response}</div>
      <div className="agent-card-foot"><span className="agent-tag"><Sparkles size={13} /> AI Agent</span><span className="agent-label">{label}</span></div>
      <h3>{title}</h3><p>{body}</p>
    </article>
  );
}

function BuilderMockup({ selected, onSelected }: { selected?: string; onSelected?: (value: string) => void }) {
  const [internalActive, setInternalActive] = useState("Instructions");
  const [switching, setSwitching] = useState(false);
  const active = selected ?? internalActive;
  const selectTab = (tab: string) => { if (tab === active) return; setSwitching(true); window.setTimeout(() => { setInternalActive(tab); onSelected?.(tab); setSwitching(false); }, 160); };
  const tabs = ["Instructions", "Branding", "Model", "Guardrails", "Actions"];
  return (
    <div className="builder-frame reveal-later">
      <div className="frame-topbar"><span className="frame-kicker">Create Agent</span><div className="top-actions"><button aria-label="More options"><Ellipsis size={17} /></button><button aria-label="Close"><X size={16} /></button></div></div>
      <div className="builder-body">
        <aside className="builder-sidebar">{tabs.map((tab) => <button key={tab} onClick={() => selectTab(tab)} className={active === tab ? "active" : ""}>{tab}<ChevronDown size={13} /></button>)}</aside>
        <div className="builder-content">
          <div className="editor-label">{active}</div>
          {switching ? <div className="builder-skeleton" aria-label="Loading workspace preview"><i /><i /><i /><i /></div> : active === "Instructions" ? <>
            <p className="editor-copy">You are an AI agent helping customers with inquiries and requests. Represent the company by providing friendly, efficient service. Listen carefully, understand their needs, and resolve issues with care.</p>
            <div className="editor-divider" />
            <div className="editor-label">Procedure</div>
            <ol className="procedure-mini"><li>Greet customer, ask about return.</li><li>Request order number or email.</li><li>Use <code>lookup_order</code> for details.</li><li>Confirm customer’s return.</li><li>Check return window eligibility.</li></ol>
          </> : <div className="editor-empty"><Sparkles size={22} /><strong>{active} workspace</strong><span>Adjust agent behavior in a single, governed view.</span></div>}
        </div>
      </div>
    </div>
  );
}

function Lifecycle() {
  const stages = [["01", "Build", "Connect your sources, define a role and set guardrails. No code required.", "Instructions"], ["02", "Test", "Run real scenarios before going live and validate every edge case.", "Guardrails"], ["03", "Deploy", "Publish across chat, WhatsApp, email, Slack and more.", "Actions"], ["04", "Optimize", "Track resolution and refine instructions as conversations evolve.", "Branding"]] as const;
  const [activeStage, setActiveStage] = useState(0);
  const activeTab = stages[activeStage][3];
  const syncBuilder = (tab: string) => { const index = stages.findIndex((stage) => stage[3] === tab); if (index >= 0) setActiveStage(index); };
  return <section className="lifecycle-section"><div className="lifecycle-intro"><span className="eyebrow">The agent lifecycle</span><h2>From first instruction<br />to <em>better outcomes.</em></h2><p>Every decision lives in one clean, governed workflow.</p><PrimaryButton onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}>Create Agent</PrimaryButton></div><div className="lifecycle-content"><div className="lifecycle-list" role="tablist" aria-label="Agent lifecycle">{stages.map(([number, title, description], index) => <button key={number} role="tab" aria-selected={activeStage === index} className={activeStage === index ? "active" : ""} onClick={() => setActiveStage(index)}><span>{number}</span><span><h3>{title}</h3><p>{description}</p></span><ArrowRight size={15} /></button>)}</div><BuilderMockup selected={activeTab} onSelected={syncBuilder} /></div></section>;
}

function ProductSuite() {
  const [active, setActive] = useState("Procedures");
  const [paused, setPaused] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tabs = ["Procedures", "Widgets", "Helpdesk", "Backstage", "Analytics", "Integrations", "Playground"];
  const selectTab = (tab: string) => { if (tab === active) return; setSwitching(true); window.setTimeout(() => { setActive(tab); setSwitching(false); }, 170); };
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const sync = () => setReducedMotion(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  useEffect(() => { if (paused || reducedMotion) return; const timer = window.setInterval(() => selectTab(tabs[(tabs.indexOf(active) + 1) % tabs.length]), 5200); return () => window.clearInterval(timer); }, [active, paused, reducedMotion]);
  return (
    <section className="suite-section" id="product" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)}>
      <div className="suite-heading"><span className="eyebrow">The product suite</span><h2>The complete platform for <em>customer-facing</em> agents.</h2><p>Build, deploy and optimize across every channel, on one platform.</p></div>
      <div className="suite-tabs" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} onClick={() => { setPaused(true); selectTab(tab); }} className={active === tab ? "active" : ""}>{tab}</button>)}</div>
      <div className="suite-motion-controls"><span><i className={paused || reducedMotion ? "paused" : ""} />{paused || reducedMotion ? "Auto-play paused" : `Auto-playing ${active}`}</span><button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? "Resume" : "Pause"}</button></div>
      <div className="suite-stage">
        {switching && <div className="suite-skeleton" aria-label="Loading product preview"><i /><i /><i /><i /><i /></div>}
        <div className={`suite-content ${switching ? "is-switching" : ""}`} key={active}>
        {active === "Procedures" && <div className="procedure-screen"><div className="screen-lead"><span className="eyebrow">Procedures</span><h3>Written in plain language,<br />followed step by step.</h3></div><ol className="procedure-list">{procedures.map((item, i) => <li key={item}><span>{i + 1}.</span><p>{item.replace("lookup_order", "")}{item.includes("lookup_order") && <code>lookup_order</code>}</p></li>)}</ol><div className="action-chips"><button>Upgrade plan</button><button>Cancel subscription</button><button>Order status lookup</button></div></div>}
        {active === "Widgets" && <div className="widget-screen"><div><span className="eyebrow">Interactive components</span><h3>Agents answer with <em>useful UI</em>, not just text.</h3><p>Your package is in transit and will arrive in 2 days.</p></div><div className="shipment-card"><div><span>Your package is</span><strong>In-transit</strong><small>Updated 2m ago</small></div><div className="shipment-route"><i /><i /><i /><i /></div><CircleCheck size={25} /></div></div>}
        {active === "Helpdesk" && <Helpdesk />}
        {active === "Backstage" && <div className="backstage-screen"><div className="backstage-copy"><span className="eyebrow">Backstage</span><h3>Ask it about customers,<br />tell it what to fix.</h3><button className="prompt-chip"><Sparkles size={15} /> Summarize issues customers are facing <ArrowUpRight size={15} /></button></div><div className="summary-card"><div className="summary-top"><span>Completed 3 actions</span><CircleCheck size={16} /></div><h4>Summary of customer issues this week.</h4>{[["Pricing and billing", 435], ["Account setup", 312], ["API integration", 302], ["Product features and usage", 248]].map(([name, num]) => <div className="summary-row" key={String(name)}><span>{name}</span><strong>{num}</strong></div>)}</div></div>}
        {active === "Analytics" && <div className="analytics-screen"><div><span className="eyebrow">Analytics</span><h3>Topics, sentiment<br />and trends — <em>legible.</em></h3></div><div className="chart-box"><div className="chart-head"><span><i className="positive-dot" /> Positive</span><strong>713</strong></div><div className="bars">{[35, 46, 32, 63, 47, 72, 58, 90, 70, 100, 76, 94].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div><div className="chart-axis"><span>Jul 5</span><span>Aug 5</span></div></div></div>}
        {active === "Integrations" && <div className="integration-screen"><div><span className="eyebrow">Integrations</span><h3>Connected to the work<br />your team already does.</h3></div><div className="integration-grid">{["CRM", "Email", "Slack", "Calendar", "Catalog", "Payments"].map((x, i) => <div key={x} className={`integration-cell cell-${i}`}><span>{x.slice(0, 1)}</span><small>{x}</small></div>)}</div></div>}
        {active === "Playground" && <div className="playground-screen"><div><span className="eyebrow">Playground</span><h3>Test models and settings<br />before they go live.</h3><p>Choose the right intelligence for the task.</p></div><div className="model-list">{["Claude Fable 5", "Gemini 3.5 Flash", "GPT-5.6 family", "DeepSeek V4-Pro", "Grok 4.5", "Kimi K2.7"].map((x, i) => <button key={x} className={i === 0 ? "selected" : ""}><span className={`model-swatch sw-${i}`} />{x}{i === 0 && <Check size={15} />}</button>)}</div></div>}
        </div>
      </div>
    </section>
  );
}

function Helpdesk() {
  return <div className="helpdesk-screen"><div className="helpdesk-side"><div className="helpdesk-title"><span className="agent-mini-mark"><Bot size={14} /></span><strong>Helpdesk</strong></div><button className="selected-inbox">Inbox <span>7</span></button><button>Assigned to me</button><button>All tickets</button><div className="side-rule" /><button>Views <Plus size={14} /></button></div><div className="ticket-area"><div className="ticket-toolbar"><span>All conversations</span><div><Search size={15} /><Ellipsis size={18} /></div></div><div className="ticket-table">{tickets.map((t) => <div className="ticket-row" key={t[1] as string}><span className={`ticket-status ${t[5]}`}><i />{t[0]}</span><strong>{t[1]}</strong><div><b>{t[2]}</b><p>{t[3]}</p></div><time>{t[4]}</time></div>)}</div></div></div>;
}

function HeroDemo() {
  const [frame, setFrame] = useState(0);
  const frames = ["sources", "procedures", "upgrade-prompt", "upgrade-confirm", "welcome", "meeting-prompt", "meeting-confirm", "integrations"] as const;
  const activeFrame = frames[frame];
  const isPink = ["welcome", "meeting-prompt", "meeting-confirm"].includes(activeFrame);
  const isGreen = activeFrame === "integrations";

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), 4966);
    return () => window.clearInterval(timer);
  }, [frames.length]);

  const Prompt = ({ text = "Ask a question..." }: { text?: string }) => <div className="hero-video-prompt"><span><Plus size={11} /> {text}</span><span className="prompt-voice"><Sparkles size={11} /><b><SendHorizontal size={11} /></b></span></div>;
  return <div className={`hero-art hero-video ${isPink ? "hero-video-pink" : ""} ${isGreen ? "hero-video-green" : ""}`} aria-label="Animated SOPRANOVA product demonstration">
    <div className={`hero-video-panel ${["sources", "procedures"].includes(activeFrame) ? "is-tall" : ""} ${isPink ? "is-chat" : ""}`} key={activeFrame}>
      {activeFrame === "sources" && <><h3 className="hero-video-heading">Data sources</h3><div className="hero-source-list">{[["Acme_Product_Guide.pdf", "4 KB", "File"], ["Acme_Onboarding_Checklist.pdf", "3 KB", "File"], ["https://www.acme.co", "12 KB", "URL"], ["https://www.acme.co/pricing", "8 KB", "URL"]].map(([name, size, type], index) => <div className={`hero-source ${index > 1 ? "entering" : ""}`} style={{ "--delay": `${index * 75}ms` } as React.CSSProperties} key={name}><span><b>{name}</b><small>{size}</small></span><em>{type}</em></div>)}</div><div className="hero-video-add"><Plus size={11} /> Add source</div></>}
      {activeFrame === "procedures" && <div className="hero-procedures"><h3 className="hero-video-heading">Procedures</h3>{[["Order returns & refunds", "#ef7956"], ["Order status lookup", "#5365e7"], ["Upgrade plan", "#e9a342"], ["Cancel subscription", "#7cc1f1"], ["Product exchange", "#ed77c7"]].map(([label, tone], index) => <div className="hero-procedure-row" style={{ "--delay": `${index * 65}ms`, "--mark": tone } as React.CSSProperties} key={label}><i /><b>{label}</b><span className="hero-toggle"><i /></span></div>)}<Prompt /></div>}
      {activeFrame === "upgrade-prompt" && <><div className="hero-question">I want to upgrade to the premium plan</div><Prompt /><span className="hero-plan-pill"><i>✦</i> Upgrade plan</span></>}
      {activeFrame === "upgrade-confirm" && <><div className="hero-question">I want to upgrade to the premium plan</div><span className="hero-agent-label"><i /> AI Agent</span><p className="hero-response">Sure! I’ve just updated your subscription. You’re now on the Premium plan.</p><div className="hero-confirm"><CircleCheck size={14} /><span><b>Plan successfully updated</b><small>Free plan → Premium plan</small></span></div><Prompt /></>}
      {activeFrame === "welcome" && <><div className="hero-chat-welcome">Hi there! How can I help you? <i>◉ AI Agent</i></div><Prompt text="Can I book a meeting with Sales?" /></>}
      {activeFrame === "meeting-prompt" && <><div className="hero-question">Can I book a meeting with Sales?</div><Prompt /></>}
      {activeFrame === "meeting-confirm" && <><div className="hero-question">Can I book a meeting with Sales?</div><p className="hero-response">Call booked successfully!</p><div className="hero-event-card"><CircleCheck size={14} /><span><b>Call booked</b><small>25th March, 2026 at 3:00 PM</small></span></div><Prompt /></>}
      {activeFrame === "integrations" && <div className="hero-integrations"><h3 className="hero-video-heading">Integrate with the tools you already use</h3><div className="hero-logo-grid">{["S", "C", "◉", "✦", "A", "Z", "▰", "G", "↗", "◒", "H", "◈", "P", "◉", "◌"].map((label, index) => <i style={{ "--delay": `${index * 35}ms` } as React.CSSProperties} key={`${label}-${index}`}>{label}</i>)}</div></div>}
    </div>
    <span className={`hero-video-cursor hero-cursor-${activeFrame}`} aria-hidden="true"><MousePointer2 size={19} fill="#fff" /><i /></span>
  </div>;
}

function CustomerStories() {
  if (customerStories.length === 0) return null;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const move = (direction: 1 | -1) => setActive((value) => (value + direction + customerStories.length) % customerStories.length);
  useEffect(() => { if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const timer = window.setInterval(() => move(1), 5800); return () => window.clearInterval(timer); }, [paused]);
  const story = customerStories[active];
  return <section className="story-carousel" aria-roledescription="carousel" aria-label="Customer stories" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); trackFrontendEvent("carousel_navigate", { carousel: "customer_stories", direction: "next", input: "keyboard" }); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); trackFrontendEvent("carousel_navigate", { carousel: "customer_stories", direction: "previous", input: "keyboard" }); move(-1); } }} tabIndex={0}><div className="story-carousel-heading"><span className="eyebrow light">Customer stories</span><span className="story-count">0{active + 1} / 0{customerStories.length}</span></div><article className="story-carousel-card" key={story.company} aria-live="polite"><div><span className="story-company">{story.company}</span><h3>Customer story<br /><em>in context.</em></h3><p>{story.detail}</p><a href={`/customers/${story.slug}`} onClick={() => trackFrontendEvent("story_open", { story: story.slug, origin: "carousel" })}>Read the story <ArrowUpRight size={15} /></a></div><div className="story-visual" aria-hidden="true"><i /><i /><i /><span>AI</span></div></article><div className="carousel-controls"><button type="button" onClick={() => { setPaused(true); trackFrontendEvent("carousel_navigate", { carousel: "customer_stories", direction: "previous", input: "button" }); move(-1); }} aria-label="Previous customer story"><ChevronLeft size={17} /></button><button type="button" onClick={() => { setPaused(true); trackFrontendEvent("carousel_navigate", { carousel: "customer_stories", direction: "next", input: "button" }); move(1); }} aria-label="Next customer story"><ChevronRight size={17} /></button><button type="button" className="carousel-pause" onClick={() => { trackFrontendEvent("carousel_pause", { carousel: "customer_stories", paused: !paused }); setPaused((value) => !value); }} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</button></div></section>;
}

function IndustryCarousel({ onExplore }: { onExplore: (label: string) => void }) {
  const [active, setActive] = useState(0);
  const move = (direction: 1 | -1) => setActive((value) => (value + direction + industries.length) % industries.length);
  const [title, body] = industries[active];
  return <section className="industries-section industry-carousel" id="industries" aria-roledescription="carousel" aria-label="Industries" tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); trackFrontendEvent("carousel_navigate", { carousel: "industry", direction: "next", input: "keyboard" }); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); trackFrontendEvent("carousel_navigate", { carousel: "industry", direction: "previous", input: "keyboard" }); move(-1); } }}><div className="industries-header"><span className="eyebrow">Built for your industry</span><h2>Every industry has<br />its own <em>conversations.</em></h2></div><article className="industry-feature" key={title}><span>0{active + 1}</span><div><h3>{title}</h3><p>{body}</p></div><button onClick={() => { trackFrontendEvent("cta_click", { location: "industry", industry: title }); onExplore(title); }} aria-label={`Explore ${title}`}><ArrowUpRight size={20} /></button></article><div className="industry-controls"><button onClick={() => { trackFrontendEvent("carousel_navigate", { carousel: "industry", direction: "previous", input: "button" }); move(-1); }} aria-label="Previous industry"><ChevronLeft size={17} /></button><div role="tablist" aria-label="Choose an industry">{industries.map(([name], index) => <button key={name} role="tab" aria-selected={active === index} onClick={() => { trackFrontendEvent("carousel_navigate", { carousel: "industry", selection: index, input: "tab" }); setActive(index); }}><span className="sr-only">{name}</span></button>)}</div><button onClick={() => { trackFrontendEvent("carousel_navigate", { carousel: "industry", direction: "next", input: "button" }); move(1); }} aria-label="Next industry"><ChevronRight size={17} /></button></div></section>;
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(true);
  const [, setLocation] = useLocation();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const notice = (label: string) => toast(`${label}`, { description: "Coming soon." });

  return (
    <div className="site-shell site-shell-public">
      <PublicNav />

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy"><div className="trust-line"><span className="small-rosette">✳</span><span className="starline">Enterprise-grade</span><i /><span>Built for scale from day one</span></div><h1>Conversational<br /><em>agents for customer</em><br />experience</h1><p>AI agents that meet customers at every stage of their journey, across chat, email, and voice, to resolve issues end to end and increase revenue.</p><div className="hero-actions"><PrimaryButton onClick={() => { trackFrontendEvent("cta_click", { location: "hero", action: "start_trial" }); setLocation("/auth/signup"); }}>Start free trial</PrimaryButton><button className="secondary-button" onClick={() => { trackFrontendEvent("cta_click", { location: "hero", action: "get_demo" }); setLocation("/enterprise"); }}>Get a demo <ArrowUpRight size={14} /></button></div></div>
          <HeroDemo />
        </section>

        <section className="logo-strip" aria-label="Platform overview"><span>Built for the conversations that move business forward.</span><div className="logo-cells">{["Support", "Sales", "Guidance", "Email", "Voice", "Chat"].map((item, i) => <div key={item}><i className={`logo-shape shape-${i}`} />{item}</div>)}</div></section>

        <section className="stats-band" aria-label="Key metrics"><div className="stats-grid"><article><strong>Multi-channel</strong><span>Chat, email, voice — one agent, every touchpoint</span></article><article><strong>Sub-second</strong><span>Response times powered by edge infrastructure</span></article><article><strong>SOC 2 ready</strong><span>Enterprise-grade security with row-level isolation</span></article><article><strong>Open stack</strong><span>Built on Postgres, tRPC, and open standards</span></article></div></section>

        <section className="agents-section" id="agents"><div className="agents-lead"><span className="eyebrow">One platform. Every interaction.</span><h2>One agent for every<br />customer <em>conversation.</em></h2><p>Runs support, sales, and product guidance around the clock without losing the context that matters.</p></div><div className="agent-grid"><AgentCard tone="support" label="Support agent" prompt="My order arrived damaged — can you help?" response="So sorry about that — a free replacement is on its way and arrives Thursday." title="Resolve complex support queries." body="Accurately handle live chat, email, phone, Slack, and more." /><AgentCard tone="sales" label="Sales agent" prompt="Is Pro worth it for my team?" response="For a team, yes — Pro adds five seats, and yearly billing saves you 20%." title="Turn questions into confidence." body="Engage prospects and guide conversations toward revenue." /><AgentCard tone="guidance" label="Product guidance agent" prompt="What’s your brand about?" response="We make gear built to last — for people who love the outdoors." title="Keep product knowledge close." body="Help customers find answers in a clear, on-brand voice." /></div></section>

        <SectionRule />
        <Lifecycle />

        <CustomerStories />

        <ProductSuite />

        <section className="channels-section"><div className="channels-visual"><div className="channels-abstract" aria-hidden="true"><div className="orbit-ring ring-1" /><div className="orbit-ring ring-2" /><div className="orbit-ring ring-3" /><div className="orbit-center"><MessageCircle size={22} /><span>AI Agent</span></div></div><div className="channel-chip chat"><MessageCircle size={16} /> Chat</div><div className="channel-chip mail"><Mail size={16} /> Email</div><div className="channel-chip voice"><Phone size={16} /> Voice</div></div><div className="channels-copy"><span className="eyebrow">Everywhere your customers are</span><h2>Build once and<br />deploy <em>everywhere.</em></h2><p>Give customers a consistent answer across their preferred channels — and give your team one view of the whole story.</p><div className="channel-list"><article><MessageCircle size={19} /><div><h3>Chat</h3><p>Website, social and messaging conversations, all connected.</p></div></article><article><Mail size={19} /><div><h3>Email</h3><p>Resolve inbound support requests around the clock.</p></div></article><article><Phone size={19} /><div><h3>Voice</h3><p>Natural conversations with the same guardrails in place.</p></div></article></div></div></section>

        <section className="security-section"><div className="security-heading"><span className="eyebrow">Designed for trust</span><h2>Enterprise-grade security,<br /><em>without the drag.</em></h2><p>High standards aren’t a feature set. They are the baseline for every agent, conversation and integration.</p></div><div className="security-grid"><article><div className="security-icon"><ShieldCheck size={19} /></div><h3>Your data stays yours</h3><p>Customer data is accessible only to your AI agent, and never used to train models.</p></article><article><div className="security-icon"><LockIcon size={19} /></div><h3>Data encryption</h3><p>Data is encrypted at rest and in transit using standard algorithms.</p></article><article><div className="security-icon"><CheckShield size={19} /></div><h3>Secure integrations</h3><p>Verified credentials ensure each user sees only the data they should.</p></article><article><div className="security-icon"><Code2 size={19} /></div><h3>Built with guardrails</h3><p>Procedures and boundaries make every action deliberate and reviewable.</p></article></div></section>

        <IndustryCarousel onExplore={() => setLocation("/solutions")} />

        <section className="final-cta" id="cta"><div className="cta-blue"><span className="eyebrow light">The next conversation is already waiting</span><h2>The world's best customer experiences run on <em>SOPRANOVA.</em></h2><p>Build AI agents that deliver exceptional support at scale — across chat, email and voice.</p><div><PrimaryButton onClick={() => setLocation("/auth/signup")}>Create agent</PrimaryButton><button className="light-secondary" onClick={() => setLocation("/enterprise")}>Get a demo <ArrowUpRight size={14} /></button></div></div><div className="cta-visual" aria-hidden="true"><div className="cta-orbit"><div className="cta-orbit-ring r1" /><div className="cta-orbit-ring r2" /><div className="cta-orbit-dot d1" /><div className="cta-orbit-dot d2" /><div className="cta-orbit-dot d3" /></div></div></section>
      </main>

      <footer className="site-footer"><a className="brand footer-brand" href="#top"><Logo size={23} /><span>SOPRANOVA</span></a><p>Conversational agents for customer experience.</p><div><button onClick={() => notice("Privacy")}>Privacy</button><button onClick={() => notice("Terms")}>Terms</button><span>© 2026</span></div></footer>

      <div className={`chat-widget ${chatOpen ? "is-open" : ""}`}><div className="chat-popover"><button onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={14} /></button><p>Hey! <span>👋</span> Ask me anything about SOPRANOVA.</p></div><button className="chat-launch" onClick={() => setChatOpen(!chatOpen)}><span className="chat-launch-icon"><MessageCircle size={18} /></span>Chat with us</button></div>
    </div>
  );
}

function LockIcon({ size = 19 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="10" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>; }
function CheckShield({ size = 19 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.4-2.9 8.4-7 10-4.1-1.6-7-5.6-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>; }
