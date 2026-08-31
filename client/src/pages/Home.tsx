import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";

/* ─── Data ─── */

const logos: { name: string; mono: string; color: string; href?: string }[] = [
  { name: "Dolby", mono: "/assets/logos/dolby-mono.0jjlrc-3tqqmj.svg", color: "/assets/logos/dolby.07u0y3thqr9ha.svg" },
  { name: "Pearson", mono: "/assets/logos/pearson-mono.12ct-g1-6ect5.svg", color: "/assets/logos/pearson.0i5ekpihyezwi.svg" },
  { name: "Opal", mono: "/assets/logos/opal-mono.3bq0yl41qkeyt.svg", color: "/assets/logos/opal.0gla976v21ueh.svg", href: "/customers/opal" },
  { name: "Siae", mono: "/assets/logos/siae-mono.30-qcl4o2x7tf.svg", color: "/assets/logos/siae.3u1ofaub6ifyb.svg" },
  { name: "EF Education First", mono: "/assets/logos/ef-education-first-mono.2br9po8xrw44u.svg", color: "/assets/logos/ef-education-first.2m6768hth3_zg.svg" },
  { name: "Thotis", mono: "/assets/logos/thotis-mono.0nbsavymavuv4.svg", color: "/assets/logos/thotis.17cjlfyq7apcl.svg", href: "/customers/thotis-media" },
  { name: "Aplazo", mono: "/assets/logos/aplazo-mono.1atbomff72tk2.svg", color: "/assets/logos/aplazo.0v5hbwqiyye9o.svg", href: "/customers/aplazo" },
  { name: "Roche", mono: "/assets/logos/roche-mono.27ldfsorg4nvk.svg", color: "/assets/logos/roche.2hjc_h5_6_pch.svg" },
  { name: "F45", mono: "/assets/logos/f45-mono.29rd9s7at3z24.svg", color: "/assets/logos/f45.25j1ldrldi5sy.svg" },
  { name: "Bridgestone", mono: "/assets/logos/bridgestone-mono.1kp6_-h6pltmv.svg", color: "/assets/logos/bridgestone.2xfl9t2ekfci2.svg" },
  { name: "Chuck E. Cheese", mono: "/assets/logos/chuck-e-cheese-mono.1_2rmzo2x8wmw.svg", color: "/assets/logos/chuck-e-cheese.2y0weoipyn18m.svg" },
  { name: "Sage", mono: "/assets/logos/sage-mono.1zp8nnmnr-13q.svg", color: "/assets/logos/sage.127tkp_uokj61.svg" },
  { name: "Jumia", mono: "/assets/logos/jumia-mono.2g0j8qyxwauaj.svg", color: "/assets/logos/jumia.14vdyr43u4s1h.svg", href: "/customers/jumia" },
  { name: "National Grid", mono: "/assets/logos/national-grid-mono.2k4rbehyydgq-.svg", color: "/assets/logos/national-grid.0ihlxlrxb76_k.svg" },
  { name: "Alpian", mono: "/assets/logos/alpian-mono.1mz-d0ig_oe50.svg", color: "/assets/logos/alpian.0k12_w6yxoykq.svg" },
];

const lifecycleSteps = [
  { num: "01", title: "Build", desc: "Connect your data sources, define your agent's role, and set guardrails. No code required — ready in minutes." },
  { num: "02", title: "Test", desc: "Run real customer scenarios before going live. Validate accuracy, brand consistency, and edge case handling across every channel." },
  { num: "03", title: "Deploy", desc: "Publish your agent across chat, WhatsApp, email, Slack, and more with a single click. Goes live instantly." },
  { num: "04", title: "Optimize", desc: "Track resolution rates, review escalations, and refine instructions. Your agent improves with every conversation." },
];

const channels = [
  { icon: "chat", label: "Chat", desc: "Your customers can talk to your agent on your Website, Meta Apps, Slack and more!" },
  { icon: "email", label: "Email", desc: "Handle inbound support emails automatically. Your agent reads, responds, and resolves — around the clock, without a queue." },
  { icon: "voice", label: "Voice", desc: "Let customers call and get instant answers. Your agent handles questions over voice with natural, conversational responses." },
];

const industries = [
  { name: "Retail & E-commerce", desc: "Shoppers want sizing, shipping, and returns answered instantly. AI agents trained on your catalog and policies keep them moving to checkout.", gradient: "linear-gradient(to top, #20349F 0%, #20349F00 88.438%)" },
  { name: "Technology", desc: "Your users want help inside the product, not a ticket queue. Embed an identity-verified AI agent in your app, docs, and Slack.", gradient: "linear-gradient(to top, #1E4929 0%, #1E492900 88.438%)" },
  { name: "Travel & Hospitality", desc: "Guests ask about availability, rates, and check-in at every hour. AI agents answer across chat, email, and voice, connected to your PMS and booking engine.", gradient: "linear-gradient(to top, #C24722 0%, #C2472200 88.438%)" },
  { name: "Financial Services", desc: "Lost cards, disputed charges, and account changes cannot wait on hold. AI agents resolve them across every channel, inside the guardrails you set.", gradient: "linear-gradient(to top, #8C1061 0%, #8C106100 88.438%)" },
];

const videoStories = [
  { company: "OPAL", quote: "Figuring out what to automate and what needs a human — SOPRANOVA has been a great partner.", name: "Kenneth Schlenker, CEO", link: "/customers/opal", thumbnail: "https://img.youtube.com/vi/Ifkqr_9sZwI/maxresdefault.jpg" },
  { company: "TESTICULAR CANCER FOUNDATION", quote: "A genuinely capable clinical tool, deployed without an engineering team.", name: "Kenny Kane, CEO", link: "/customers/testicular-cancer-foundation", thumbnail: "https://img.youtube.com/vi/wUW8i-8POnM/maxresdefault.jpg" },
  { company: "THOTIS MEDIA", quote: "SOPRANOVA really enables us to control AI without letting AI control us.", name: "Pierre, Data Director at Thotis Media", link: "/customers/thotis-media", thumbnail: "https://img.youtube.com/vi/W-zq6g9lM7A/maxresdefault.jpg" },
];

const footerCols = {
  Product: ["Security", "SOPRANOVA Experts", "Hire an Expert", "Affiliates"],
  Features: ["Product overview", "Helpdesk"],
  Compare: ["Decagon"],
  Resources: ["Customers", "Blog", "Pricing", "Docs", "Changelog", "Guide", "Contact us"],
  Company: ["Trust", "Enterprise", "Careers"],
  Policy: ["Privacy Policy", "Terms & conditions", "DPA", "Cookie Policy"],
};

/* ─── Icons ─── */

const ChatbaseWordmark = () => (
  <svg viewBox="0 0 663 130" className="h-6 w-auto fill-current" aria-label="SOPRANOVA">
    <text x="0" y="100" fontFamily="Geist, Inter, sans-serif" fontWeight="600" fontSize="100" letterSpacing="-3">SOPRANOVA</text>
  </svg>
);

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "#52525C" : "none"} stroke="#52525C" strokeWidth="1">
    <path d="M8 0l2.47 5.01L16 5.81l-4 3.9.94 5.49L8 12.49l-4.94 2.7L4 9.71 0 5.81l5.53-.8z"/>
  </svg>
);

const G2Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
    <circle cx="12" cy="12" r="12" fill="#FF492C"/>
    <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif" fill="white">G</text>
  </svg>
);

const ChannelIcon = ({ type }: { type: string }) => {
  if (type === "chat") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
  if (type === "email") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  );
};

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const KeyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeft = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ArrowRightLg = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

/* ─── Diamond divider ─── */

const DiamondDivider = () => (
  <div className="relative flex items-center justify-center h-16 lg:h-20">
    <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle-v2" />
    <div className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-border-subtle-v2 bg-bg-surface-v2" />
  </div>
);

/* ─── Lifecycle Visual Panel (right side) ─── */

function LifecyclePanel({ step }: { step: typeof lifecycleSteps[0] }) {
  return (
    <div className="relative w-full max-w-[480px] rounded-2xl border border-border-subtle-v2 bg-bg-surface-raised-v2 overflow-hidden shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-subtle-v2 bg-bg-surface-raised-v2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="flex-1 text-center text-[10px] text-text-paragraph-5 font-medium">sopranova.com/dashboard</div>
      </div>
      <div className="p-5 space-y-3.5">
        {step.id !== "build" && step.id !== "test" && step.id !== "deploy" && step.id !== "optimize" && null}
        {step.num === "01" && (
          <>
            <div>
              <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Instructions</div>
              <div className="text-[12px] text-text-heading-v2 bg-bg-surface-v2 p-2.5 rounded-md leading-relaxed">You are an AI agent helping customers with inquiries and requests. Represent the company by providing friendly, efficient service.</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Model</div>
                <div className="text-[12px] text-text-heading-v2 bg-bg-surface-v2 p-2 rounded-md">Claude Sonnet 4.6</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Branding</div>
                <div className="flex gap-2 items-center">
                  <div className="w-4 h-4 rounded bg-blue-lighter-v2" />
                  <span className="text-[12px] text-text-heading-v2">Accent color</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Procedure</div>
              <div className="text-[12px] text-text-heading-v2 bg-bg-surface-v2 p-2.5 rounded-md leading-relaxed">
                1. Greet customer, ask about return.<br/>2. Request order number or email.<br/>3. Use lookup_order for details.<br/>4. Confirm customer's return.<br/>5. Check return window eligibility.
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Actions</div>
              <div className="flex gap-1.5 flex-wrap">
                {["Get invoices", "Get slots", "Retrieve products"].map(a => (
                  <span key={a} className="text-[10px] px-2 py-1 rounded-md bg-blue-lighter-v2/10 text-blue-lighter-v2 font-medium">{a}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {step.num === "02" && (
          <div className="space-y-2.5">
            <div className="text-[12px] font-semibold text-text-heading-v2">Playground</div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <div className="px-2.5 py-1.5 rounded-[10px_10px_2px_10px] bg-bg-inverse-v2 text-text-inverse-v2 text-[12px]">How do I return an item?</div>
              </div>
              <div className="flex justify-start">
                <div className="px-2.5 py-1.5 rounded-[10px_10px_10px_2px] bg-bg-surface-v2 text-text-heading-v2 text-[12px]">I can help! Could you share your order number?</div>
              </div>
              <div className="flex justify-end">
                <div className="px-2.5 py-1.5 rounded-[10px_10px_2px_10px] bg-bg-inverse-v2 text-text-inverse-v2 text-[12px]">It's order #45892</div>
              </div>
              <div className="flex justify-start">
                <div className="px-2.5 py-1.5 rounded-[10px_10px_10px_2px] bg-bg-surface-v2 text-text-heading-v2 text-[12px]">Found it! Return initiated. Prepaid label by email. ✓</div>
              </div>
            </div>
          </div>
        )}
        {step.num === "03" && (
          <div className="space-y-3">
            <div className="text-[12px] font-semibold text-text-heading-v2">Publish to channels</div>
            <div className="grid grid-cols-2 gap-2">
              {["💬 Web Widget", "📱 WhatsApp", "📧 Email", "💼 Slack", "📱 Messenger", "📞 Voice"].map(ch => (
                <div key={ch} className="px-2.5 py-2 rounded-md border border-border-subtle-v2 bg-bg-surface-v2 text-[12px] text-text-heading-v2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {ch}
                </div>
              ))}
            </div>
            <div className="px-3 py-2 rounded-md bg-green-50 text-green-700 text-[12px] font-medium">✓ Agent is live on all channels</div>
          </div>
        )}
        {step.num === "04" && (
          <div className="space-y-3">
            <div className="text-[12px] font-semibold text-text-heading-v2">Performance</div>
            <div className="grid grid-cols-3 gap-2.5">
              {[{l:"Resolution",v:"94%"},{l:"Satisfaction",v:"4.8/5"},{l:"Response",v:"<2s"}].map(m => (
                <div key={m.l} className="text-center">
                  <div className="text-lg font-bold text-text-heading-v2">{m.v}</div>
                  <div className="text-[10px] text-text-paragraph-4-v2 mt-0.5">{m.l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[{t:"Pricing and billing",c:12,p:60},{t:"Account setup",c:8,p:40},{t:"API integration",c:5,p:25},{t:"Product features",c:18,p:90},{t:"Bug reports",c:3,p:15}].map(x => (
                <div key={x.t}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-text-paragraph-4-v2">{x.t}</span>
                    <span className="text-[11px] text-text-heading-v2 font-semibold">{x.c}</span>
                  </div>
                  <div className="h-1 bg-bg-surface-v2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-lighter-v2 rounded-full" style={{ width: `${x.p}%` }} />
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

/* ─── Logo cell ─── */

function LogoCell({ logo }: { logo: typeof logos[0] }) {
  const inner = (
    <div className="group/cell relative flex h-20 flex-1 items-center justify-center border-border-subtle-v2 border-r border-b transition-colors duration-200 ease-out hover:bg-white min-w-0 overflow-hidden">
      <img src={logo.mono} alt={logo.name} loading="lazy" decoding="async" className="max-h-6 max-w-[80%] object-contain transition-opacity duration-200 group-hover/cell:opacity-0" />
      <img src={logo.color} alt={logo.name} loading="lazy" decoding="async" className="absolute max-h-6 max-w-[80%] object-contain opacity-0 transition-opacity duration-200 group-hover/cell:opacity-100" />
      {logo.href && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-pink-400 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
          <span className="text-white text-[10px] font-bold leading-none">+</span>
        </div>
      )}
    </div>
  );
  if (logo.href) return <a href={logo.href} className="flex flex-1">{inner}</a>;
  return inner;
}

/* ─── Main ─── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLifecycle, setActiveLifecycle] = useState(0);
  const [activeChannel, setActiveChannel] = useState(0);
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-bg-surface-v2 text-text-heading-v2">
      {/* ─── Nav ─── */}
      <header
        className="fixed inset-x-0 top-0 z-45 transition-colors duration-400 ease-in-out h-[var(--navbar-height)] bg-bg-surface-v2 text-black"
        style={scrolled ? { background: "rgba(250,250,250,0.92)", backdropFilter: "blur(14px)" } : {}}
      >
        <nav className="relative mx-auto flex h-full w-full max-w-[1240px] items-center justify-between px-6 py-3" aria-label="Main navigation">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center shrink-0">
              <ChatbaseWordmark />
            </Link>
            <ul className="hidden flex-1 items-center justify-center lg:flex" data-slot="navigation-menu-list">
              {[
                { label: "Solutions", hasMenu: true },
                { label: "Resources", hasMenu: true },
                { label: "Customers", href: "/customers" },
                { label: "Enterprise", href: "/enterprise" },
                { label: "Pricing", href: "/pricing" },
              ].map(item => (
                <li key={item.label} data-slot="navigation-menu-item" className="list-none">
                  <button
                    data-slot="navigation-menu-trigger"
                    data-state="closed"
                    className="flex items-center gap-1 px-3 py-2 text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-heading-v2 rounded-md hover:bg-muted transition-colors"
                  >
                    {item.label}
                    {item.hasMenu && <ChevronDown />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            <Link to="/login" className="px-3 py-2 text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-heading-v2 rounded-md hover:bg-muted transition-colors">Log in</Link>
            <Link to="/signup" className="ml-2 inline-flex items-center justify-center h-10 px-4 rounded-md bg-bg-inverse-v2 text-text-inverse-v2 text-mobile-body-s-medium lg:text-desktop-body-s-medium font-medium hover:opacity-90 transition-opacity">
              Start free trial
            </Link>
          </div>
          <button className="lg:hidden p-2 -mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="lg:hidden bg-bg-surface-raised-v2 border-t border-border-subtle-v2 px-6 py-4 space-y-1">
            {["Solutions", "Resources", "Customers", "Enterprise", "Pricing"].map(link => (
              <Link key={link} to="#" className="block py-2.5 text-mobile-body-m-medium text-text-heading-v2" onClick={() => setMobileMenuOpen(false)}>{link}</Link>
            ))}
            <div className="pt-3 mt-2 border-t border-border-subtle-v2 flex flex-col gap-2">
              <Link to="/login" className="py-2.5 text-mobile-body-m-medium text-text-heading-v2">Log in</Link>
              <Link to="/signup" className="py-2.5 text-mobile-body-m-medium text-text-inverse-v2 bg-bg-inverse-v2 rounded-md text-center">Start free trial</Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible pt-16">
        <div className="mx-auto max-w-[1240px] lg:border-x lg:border-b border-border-subtle-v2">
          <div className="lg:flex">
            {/* Left */}
            <div className="flex flex-1 flex-col items-start justify-center px-6 pt-11 pb-6 text-left lg:min-h-[720px] lg:px-20 lg:py-20">
              <div className="flex flex-row items-center gap-1.5 flex-wrap">
                <G2Logo />
                <div className="flex gap-0.5">
                  <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon filled={false} />
                </div>
                <span className="text-mobile-body-m-medium lg:text-desktop-body-m-medium text-text-heading-v2 ml-1 font-semibold">4.8</span>
                <div className="h-4 w-px bg-border-subtle-v2 mx-1.5" />
                <span className="text-mobile-body-m-medium lg:text-desktop-body-m-medium text-text-paragraph-4-v2">The leading AI agent for CX</span>
              </div>
              <h1 className="mt-5 max-w-[519px] text-mobile-h1-medium lg:text-desktop-h1-medium text-text-heading-v2 text-balance">
                Conversational <span className="text-mobile-h1-italic lg:text-desktop-h1-italic">agents</span> for <span className="text-mobile-h1-italic lg:text-desktop-h1-italic">customer</span> experience
              </h1>
              <p className="mt-5 max-w-[497px] text-mobile-body-l-medium lg:text-desktop-h7-medium text-text-heading-description-v2">
                AI agents that meet customers at every stage of their journey, across chat, email, and voice, to resolve issues end to end and increase revenue.
              </p>
              <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link to="/signup" className="h-12 px-5 py-3 bg-bg-inverse-v2 text-text-inverse-v2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" style={{ backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.048) 100%)" }}>
                  Start free trial
                  <ArrowRight />
                </Link>
                <Link to="/enterprise" className="h-12 px-5 py-3 bg-bg-surface-raised-v2 text-text-heading-v2 border border-border-subtle-v2 rounded-md font-medium flex items-center justify-center hover:border-text-paragraph-4-v2 transition-colors">
                  Get a demo
                </Link>
              </div>
            </div>
            {/* Right - hero visual */}
            <div className="relative aspect-[1056/1080] w-full overflow-hidden bg-blue-lighter-v2 lg:aspect-auto lg:h-[720px] lg:w-[528px] lg:shrink-0 lg:border-l lg:border-border-subtle-v2">
              <img src="/assets/images/hero-bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
              <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-10">
                <div className="w-full max-w-[420px] rounded-xl bg-white/10 backdrop-blur-[20px] border border-white/20 p-5 shadow-2xl">
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-2.5 w-20 bg-white/30 rounded" />
                    <div className="h-2 w-32 bg-white/15 rounded" />
                    <div className="grid grid-cols-3 gap-1.5 mt-3">
                      <div className="h-12 bg-white/10 rounded-md" />
                      <div className="h-12 bg-white/10 rounded-md" />
                      <div className="h-12 bg-white/10 rounded-md" />
                    </div>
                    <div className="h-2 w-28 bg-white/15 rounded mt-2" />
                    <div className="h-10 bg-white/10 rounded-md mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Logo grid ─── */}
      <section className="flex justify-center px-6 py-11 lg:px-20 lg:py-20">
        <div className="w-full max-w-[1080px]">
          <div className="relative hidden overflow-hidden border-border-subtle-v2 border-t border-l lg:block">
            <div className="flex">
              {logos.slice(0, 5).map(logo => <LogoCell key={logo.name} logo={logo} />)}
            </div>
            <div className="flex">
              {logos.slice(5, 10).map(logo => <LogoCell key={logo.name} logo={logo} />)}
            </div>
            <div className="flex">
              {logos.slice(10, 15).map(logo => <LogoCell key={logo.name} logo={logo} />)}
            </div>
          </div>
          {/* Mobile marquee */}
          <div className="lg:hidden overflow-hidden flex">
            <div className="flex gap-12 animate-[scroll_30s_linear_infinite]">
              {[...logos, ...logos].map((l, i) => (
                <img key={i} src={l.color} alt={l.name} className="h-6 object-contain opacity-50" loading="lazy" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── One Agent for Every Interaction ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <h2 className="max-w-[734px] text-mobile-h2-medium lg:text-desktop-h3-medium text-text-heading-v2">
              One agent for every customer interaction, <span className="text-text-paragraph-4-v2">runs support, sales, and product guidance 24/7</span>
            </h2>

            <div className="flex flex-col gap-6 md:gap-5 lg:flex-row lg:gap-5">
              {[
                { title: "Support agent", desc: "Resolve complex support queries accurately across live chat, email, phone, Slack, and more.", img: "/assets/images/feature-ai-native.webp", userMsg: "My order arrived damaged — can you help?", aiMsg: "So sorry about that — a free replacement is on its way and arrives Thursday." },
                { title: "Sales agent", desc: "Engage prospects, answer product questions, and guide conversations toward revenue.", img: "/assets/images/feature-omnichannel.webp", userMsg: "Is Pro worth it for my team?", aiMsg: "For a team, yes — Pro adds five seats, and yearly billing saves you 20%." },
                { title: "Product guidance agent", desc: "Help customers find info and understand your products with a clear, on-brand voice.", img: "/assets/images/feature-smarter.webp", userMsg: "What's your brand about?", aiMsg: "We make gear built to last — for people who love the outdoors." },
              ].map((card, idx) => (
                <div key={card.title} className="flex w-full flex-col gap-6 md:flex-row-reverse md:items-center md:gap-8 md:border md:border-border-subtle-v2 md:p-8 lg:w-auto lg:flex-1 lg:flex-col lg:items-stretch lg:gap-6 lg:border-0 lg:p-0">
                  <div className="flex-1 relative aspect-[4/3] md:aspect-auto md:h-48 lg:h-56 rounded-xl overflow-hidden border border-border-subtle-v2 bg-bg-surface-raised-v2">
                    <img src={card.img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2 p-4 md:p-0 bg-bg-surface-raised-v2 md:bg-transparent rounded-xl md:rounded-none border border-border-subtle-v2 md:border-0">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-[12px_12px_4px_12px] bg-bg-inverse-v2 text-text-inverse-v2 text-[12px] leading-relaxed">{card.userMsg}</div>
                      </div>
                      <div className="flex justify-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-lighter-v2 flex items-center justify-center shrink-0 mt-0.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        </div>
                        <div className="max-w-[85%] px-3 py-2 rounded-[12px_12px_12px_4px] bg-bg-surface-v2 text-text-heading-v2 text-[12px] leading-relaxed">
                          {card.aiMsg}
                          <div className="text-[10px] text-blue-lighter-v2 font-semibold mt-1.5 uppercase tracking-wider">AI Agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="md:flex-1 lg:flex-none">
                    <h3 className="text-mobile-body-l-medium lg:text-desktop-h6-medium text-text-heading-v2 mb-1">{card.title}</h3>
                    <p className="text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-paragraph-4-v2 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Marc Manara testimonial */}
            <div className="flex flex-col items-start justify-between gap-8 px-0 py-0 border-t border-border-subtle-v2 pt-11 md:flex-row md:gap-16 lg:px-0 lg:pt-16">
              <div className="max-w-[611px]">
                <blockquote className="text-mobile-body-l-medium lg:text-desktop-h6-medium text-text-heading-v2 leading-relaxed">
                  "SOPRANOVA is a strong signal of how customer support will evolve. It is an early adopter of the agentic approach, which will become increasingly effective, trusted, and prominent."
                </blockquote>
                <p className="mt-4 text-mobile-body-m-medium lg:text-desktop-body-m-medium text-text-paragraph-4-v2">
                  <span className="font-semibold text-text-heading-v2">Marc Manara,</span> <span className="font-medium">Head of Startups</span>
                </p>
              </div>
              <div className="md:hidden lg:block w-full md:w-[289px] md:h-[289px] rounded-2xl overflow-hidden border border-border-subtle-v2 shrink-0">
                <img src="/assets/images/testimonial-grid.webp" alt="Marc Manara testimonial" loading="lazy" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Agent Lifecycle ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="hidden flex-row lg:flex lg:h-[699px]">
            <div className="flex w-1/2 flex-col gap-12 px-20 py-20">
              <h2 className="text-balance text-mobile-h2-medium lg:text-desktop-h3-medium text-text-heading-v2">The agent lifecycle</h2>
              <div className="flex flex-col gap-8 border-transparent border-l-[1px]">
                {lifecycleSteps.map((step, idx) => (
                  <button key={step.num} onClick={() => handleLifecycleClick(idx)} className="flex items-start gap-3.5 pl-4 text-left transition-all relative" data-state={activeLifecycle === idx ? "open" : "closed"}>
                    <div className="flex flex-col items-center -ml-4">
                      <div className={`text-[11px] font-bold min-w-[24px] ${activeLifecycle === idx ? "text-blue-lighter-v2" : "text-text-paragraph-5-v2"}`}>{step.num}</div>
                      {idx < lifecycleSteps.length - 1 && (
                        <div className={`w-px flex-1 mt-2 min-h-[24px] ${activeLifecycle > idx ? "bg-blue-lighter-v2" : "bg-border-subtle-v2"}`} />
                      )}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <div className={`text-mobile-body-m-medium lg:text-desktop-h7-medium transition-colors ${activeLifecycle === idx ? "text-text-heading-v2" : "text-text-paragraph-4-v2"}`}>{step.title}</div>
                      <div className={`grid transition-all duration-300 ${activeLifecycle === idx ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <p className="text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-paragraph-4-v2 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-5 py-3 text-mobile-body-m-medium lg:text-desktop-body-m-medium font-medium text-text-inverse-v2 bg-blue-lighter-v2 rounded-md w-fit hover:opacity-90 transition-opacity mt-2">
                Create Agent
                <ArrowRight />
              </Link>
            </div>
            <div className="relative w-1/2 overflow-hidden border-border-subtle-v2 border-l bg-pink-lighter-v2">
              <div className="absolute inset-0 opacity-30 mix-blend-color-dodge pointer-events-none" style={{ backgroundImage: "url(/assets/images/grain.webp)", backgroundSize: "150px 150px" }} />
              <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: "url(/assets/images/pattern.svg)", backgroundSize: "200px" }} />
              <div className="relative w-full h-full flex items-center justify-center p-8">
                <LifecyclePanel step={{ ...lifecycleSteps[activeLifecycle], id: "step" } as any} />
              </div>
            </div>
          </div>
          {/* Mobile */}
          <div className="lg:hidden flex flex-col gap-11 px-6 py-11">
            <h2 className="text-balance text-mobile-h2-medium text-text-heading-v2">The agent lifecycle</h2>
            <div className="flex flex-col gap-3">
              {lifecycleSteps.map((step, idx) => (
                <button key={step.num} onClick={() => handleLifecycleClick(idx)} className="text-left p-4 rounded-xl border border-border-subtle-v2 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold ${activeLifecycle === idx ? "text-blue-lighter-v2" : "text-text-paragraph-5-v2"}`}>{step.num}</span>
                    <span className={`text-mobile-body-m-medium ${activeLifecycle === idx ? "text-text-heading-v2" : "text-text-paragraph-4-v2"}`}>{step.title}</span>
                  </div>
                  {activeLifecycle === idx && <p className="text-mobile-body-s-medium text-text-paragraph-4-v2 mt-2 leading-relaxed">{step.desc}</p>}
                </button>
              ))}
            </div>
            <LifecyclePanel step={{ ...lifecycleSteps[activeLifecycle], id: "step" } as any} />
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Complete Product Suite ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <h2 className="max-w-[900px] text-mobile-h2-medium lg:text-desktop-h3-medium text-text-heading-v2 text-balance">
              The complete product suite for customer-facing agents. <span className="text-text-paragraph-4-v2">Build, deploy and optimize across every channel, on one platform.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 border-border-subtle-v2 border-t border-l">
              {[
                { title: "Procedures", body: "Written in plain language, followed step by step with actions built in.", visual: "procedures" },
                { title: "Widgets", body: "Agents respond with interactive components, not just text.", visual: "widgets" },
                { title: "Helpdesk", body: "Built for AI and humans working from the same conversation.", visual: "helpdesk" },
                { title: "Backstage", body: "Your agent, offstage. Ask it about customers, tell it what to fix.", visual: "backstage" },
                { title: "Analytics", body: "Topics, sentiment, and trends at a glance.", visual: "analytics" },
                { title: "Integrations", body: "Connect to CRMs, helpdesks, and more with a single click.", visual: "integrations" },
                { title: "Playground", body: "Test models and settings before going live.", visual: "playground" },
                { title: "Security", body: "Enterprise-grade compliance and data protection.", visual: "security" },
              ].map((card) => (
                <div key={card.title} className="js-card-hover flex flex-col gap-6 overflow-hidden border-border-subtle-v2 border-r border-b p-6 lg:p-8 transition-colors hover:bg-bg-surface-raised-v2">
                  <p className="flex-1 text-mobile-body-l-medium lg:text-desktop-h7-medium text-text-heading-v2 leading-[1.3]">
                    <span className="font-semibold">{card.title}</span> {card.body}
                  </p>
                  <div className="mt-auto min-h-[180px]">
                    {card.visual === "procedures" && (
                      <div className="space-y-1.5">
                        {["Ask for order number and email to locate order.","Use lookup_order to retrieve the order details.","Confirm which item the customer wants to return.","Check the return window eligibility.","Check the customer information.","Use payment_info to retrieve payment details."].map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-[12px] text-text-heading-v2 leading-relaxed">
                            <span className="text-blue-lighter-v2 font-bold text-[11px] min-w-[16px]">{i+1}.</span>
                            <span>{s}</span>
                          </div>
                        ))}
                        <div className="flex gap-1.5 flex-wrap mt-3">
                          {["Upgrade plan","Cancel subscription","Order status lookup"].map(a => <span key={a} className="text-[10px] px-2 py-1 rounded-md bg-blue-lighter-v2/10 text-blue-lighter-v2 font-medium">{a}</span>)}
                        </div>
                      </div>
                    )}
                    {card.visual === "widgets" && (
                      <div className="bg-bg-surface-raised-v2 rounded-xl p-4 border border-border-subtle-v2">
                        <div className="text-[12px] text-text-heading-v2 mb-1.5">Your package is in transit and will arrive in 2 days.</div>
                        <div className="flex items-center gap-2 px-2.5 py-2 bg-bg-surface-v2 rounded-md border border-border-subtle-v2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-[11px] font-medium text-text-heading-v2">Status: In-transit</span>
                          <span className="text-[10px] text-text-paragraph-4-v2 ml-auto">Updated 2m ago</span>
                        </div>
                      </div>
                    )}
                    {card.visual === "helpdesk" && (
                      <div className="rounded-lg border border-border-subtle-v2 overflow-hidden text-[11px]">
                        <div className="grid grid-cols-4 bg-bg-surface-raised-v2 text-text-paragraph-4-v2 font-semibold">
                          <div className="px-2 py-1.5">Status</div><div className="px-2 py-1.5">Requestor</div><div className="px-2 py-1.5">Issue</div><div className="px-2 py-1.5">Time</div>
                        </div>
                        {[
                          { s: "New", w: "Jane Doe", i: "Payment issue", t: "30m" },
                          { s: "New", w: "John Smith", i: "Login problem", t: "45m" },
                          { s: "Hold", w: "Alice Jones", i: "Bug report", t: "50m" },
                        ].map((row, i) => (
                          <div key={i} className="grid grid-cols-4 border-t border-border-subtle-v2">
                            <div className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.s === "New" ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-700"}`}>{row.s}</span></div>
                            <div className="px-2 py-1.5 text-text-heading-v2 font-medium">{row.w}</div>
                            <div className="px-2 py-1.5 text-text-paragraph-4-v2">{row.i}</div>
                            <div className="px-2 py-1.5 text-text-paragraph-5-v2">{row.t}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {card.visual === "backstage" && (
                      <div className="bg-bg-surface-raised-v2 rounded-xl p-4 border border-border-subtle-v2 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-lighter-v2 flex items-center justify-center shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-text-heading-v2">Summarize issues customers are facing</div>
                            <div className="text-[10px] text-text-paragraph-4-v2">Completed 3 actions</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-text-paragraph-4-v2 uppercase tracking-widest mb-1.5">Summary</div>
                          <div className="space-y-1">
                            {[{t:"Pricing and billing",c:12},{t:"Account setup",c:8},{t:"API integration",c:5},{t:"Product features",c:18},{t:"Bug reports",c:3}].map(s => (
                              <div key={s.t} className="flex justify-between text-[11px]">
                                <span className="text-text-heading-v2">{s.t}</span>
                                <span className="text-text-paragraph-4-v2">{s.c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {card.visual === "analytics" && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-lg bg-bg-surface-raised-v2 border border-border-subtle-v2 text-center">
                          <div className="text-lg font-bold text-text-heading-v2">713</div>
                          <div className="text-[10px] text-text-paragraph-4-v2 mt-0.5">Positive</div>
                        </div>
                        <div className="p-3 rounded-lg bg-bg-surface-raised-v2 border border-border-subtle-v2 text-center">
                          <div className="text-lg font-bold text-text-heading-v2">541</div>
                          <div className="text-[10px] text-text-paragraph-4-v2 mt-0.5">Jul 5</div>
                        </div>
                      </div>
                    )}
                    {card.visual === "integrations" && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {["Slack","HubSpot","Salesforce","Zendesk","Intercom","Notion"].map(l => (
                          <div key={l} className="px-2 py-2 rounded-md bg-bg-surface-raised-v2 border border-border-subtle-v2 text-[11px] font-medium text-text-heading-v2 text-center">{l}</div>
                        ))}
                      </div>
                    )}
                    {card.visual === "playground" && (
                      <div className="space-y-1.5">
                        {["Claude Sonnet 4.6","GPT-5.6","Gemini 3.5 Flash","DeepSeek V4-Pro","Grok 4.5"].map(m => (
                          <div key={m} className="px-3 py-2 rounded-md border border-border-subtle-v2 bg-bg-surface-raised-v2 text-[12px] text-text-heading-v2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-lighter-v2" />
                            {m}
                          </div>
                        ))}
                      </div>
                    )}
                    {card.visual === "security" && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {["GDPR","SOC 2","HIPAA"].map(b => (
                          <div key={b} className="px-2 py-3 rounded-md bg-bg-surface-raised-v2 border border-border-subtle-v2 text-[10px] font-bold text-text-heading-v2 text-center tracking-wider">{b}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Build Once, Deploy Everywhere ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="hidden lg:flex lg:h-[699px]">
            <div className="flex w-1/2 border-r border-border-subtle-v2">
              <div className="relative w-full overflow-hidden bg-blue-lighter-v2">
                <div className="absolute inset-0 opacity-30 mix-blend-color-dodge pointer-events-none" style={{ backgroundImage: "url(/assets/images/grain.webp)", backgroundSize: "150px 150px" }} />
                <div className="relative w-full h-full flex items-center justify-center p-10">
                  <div className="w-full max-w-[440px] rounded-xl bg-white/95 shadow-2xl p-5">
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="px-3 py-2 rounded-[12px_12px_4px_12px] bg-bg-inverse-v2 text-text-inverse-v2 text-[13px]">What can you do?</div>
                      </div>
                      <div className="flex justify-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-lighter-v2 flex items-center justify-center shrink-0 mt-0.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        </div>
                        <div className="px-3 py-2 rounded-[12px_12px_12px_4px] bg-bg-surface-v2 text-text-heading-v2 text-[13px] leading-relaxed">
                          I can build, train, and deploy AI agents across your channels. I handle customer support, sales inquiries, and product guidance — {channels[activeChannel].label.toLowerCase()} included.
                          <div className="text-[10px] text-blue-lighter-v2 font-semibold mt-1.5 uppercase tracking-wider">AI Agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-1/2 flex-col gap-10 px-20 py-20">
              <h2 className="text-balance text-mobile-h2-medium lg:text-desktop-h3-medium text-text-heading-v2">Build once and deploy everywhere</h2>
              <div className="flex flex-col gap-6 border-transparent border-l-[1px]">
                {channels.map((ch, idx) => (
                  <button key={ch.label} onClick={() => setActiveChannel(idx)} className="flex items-start gap-3.5 pl-4 text-left transition-all" data-state={activeChannel === idx ? "open" : "closed"}>
                    <div className={`w-5 h-5 mt-0.5 ${activeChannel === idx ? "text-blue-lighter-v2" : "text-text-paragraph-4-v2"}`}>
                      <ChannelIcon type={ch.icon} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-mobile-body-m-medium lg:text-desktop-h7-medium transition-colors ${activeChannel === idx ? "text-text-heading-v2" : "text-text-paragraph-4-v2"}`}>{ch.label}</div>
                      <div className={`grid transition-all duration-300 ${activeChannel === idx ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <p className="text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-paragraph-4-v2 leading-relaxed">{ch.desc}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-5 py-3 text-mobile-body-m-medium lg:text-desktop-body-m-medium font-medium text-text-inverse-v2 bg-blue-lighter-v2 rounded-md w-fit hover:opacity-90 transition-opacity mt-2">
                Create Agent
                <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="lg:hidden flex flex-col gap-11 px-6 py-11">
            <h2 className="text-balance text-mobile-h2-medium text-text-heading-v2">Build once and deploy everywhere</h2>
            <div className="bg-blue-lighter-v2 rounded-xl p-6 min-h-[200px] flex items-center justify-center">
              <div className="w-full max-w-[360px] bg-white rounded-lg p-4 shadow-xl">
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className="px-2.5 py-1.5 rounded-[10px_10px_2px_10px] bg-bg-inverse-v2 text-text-inverse-v2 text-[12px]">What can you do?</div>
                  </div>
                  <div className="flex justify-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-lighter-v2 shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-[10px_10px_10px_2px] bg-bg-surface-v2 text-[12px]">I can build, train, and deploy AI agents.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {channels.map((ch, idx) => (
                <button key={ch.label} onClick={() => setActiveChannel(idx)} className="text-left p-4 rounded-xl border border-border-subtle-v2">
                  <div className="flex items-center gap-3">
                    <div className={activeChannel === idx ? "text-blue-lighter-v2" : "text-text-paragraph-4-v2"}><ChannelIcon type={ch.icon} /></div>
                    <span className={`text-mobile-body-m-medium ${activeChannel === idx ? "text-text-heading-v2" : "text-text-paragraph-4-v2"}`}>{ch.label}</span>
                  </div>
                  {activeChannel === idx && <p className="text-mobile-body-s-medium text-text-paragraph-4-v2 mt-2 leading-relaxed">{ch.desc}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Trusted by 10,000 brands ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="flex flex-col gap-10 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <h2 className="text-mobile-h2-medium lg:text-center lg:text-desktop-h3-medium text-text-heading-v2">Trusted by over 10,000 brands.</h2>

            <div className="overflow-hidden" role="region" aria-roledescription="carousel">
              <div className="flex -ml-4 transition-transform duration-500" style={{ transform: `translateX(-${activeStory * 100}%)` }}>
                {videoStories.map((story, i) => (
                  <div key={i} className="min-w-0 shrink-0 grow-0 basis-full pl-4 lg:basis-[88%]" role="group" aria-roledescription="slide">
                    <a href={story.link} className="relative block aspect-[16/9] rounded-2xl overflow-hidden border border-border-subtle-v2 bg-gray-200 group">
                      <img src={story.thumbnail} alt={`${story.company} customer story`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="8 5 19 12 8 19 8 5"/></svg>
                        </div>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-5 lg:p-7">
                        <blockquote className="text-white text-[14px] lg:text-[16px] leading-relaxed mb-2 max-w-xl">"{story.quote}"</blockquote>
                        <p className="text-white/80 text-[12px] lg:text-[13px]">{story.name}</p>
                        <span className="text-white text-[12px] lg:text-[13px] mt-2 inline-flex items-center gap-1 hover:underline">Read customer story <span className="text-pink-400">→</span></span>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              {videoStories.map((_, i) => (
                <button key={i} onClick={() => setActiveStory(i)} className={`w-2 h-2 rounded-full transition-colors ${activeStory === i ? "bg-text-heading-v2" : "bg-border-subtle-v2"}`} aria-label={`Story ${i+1}`} />
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 text-center border-t border-border-subtle-v2 pt-10 lg:pt-16">
              <div className="flex items-center gap-2">
                <G2Logo />
                <div className="flex gap-0.5">
                  <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon filled={false} />
                </div>
                <span className="text-[18px] font-bold text-text-heading-v2 ml-1">4.8</span>
              </div>
              <p className="text-mobile-body-l-medium lg:text-desktop-h6-medium text-text-heading-v2 max-w-[540px] lg:text-left">
                SOPRANOVA is committed to delivering the top customer support platform for those who demand excellence.
              </p>
              <img src="/assets/images/award-badges.webp" alt="G2 awards: Momentum Leader, Easiest Setup, and High Performer — Spring 2026" loading="lazy" className="max-w-[400px] mt-2" />
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Enterprise Security (Dark) ─── */}
      <section className="w-full bg-bg-inverse-v2 overflow-visible border-y border-border-subtle-v2 text-text-inverse-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-bolder-v2">
          <div className="flex flex-col gap-10 px-6 py-11 lg:gap-12 lg:px-20 lg:py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-mobile-h2-medium lg:text-desktop-h3-medium text-text-inverse-v2">Enterprise-grade security</h2>
              <p className="text-mobile-body-l-medium lg:text-desktop-h7-medium text-text-paragraph-5-v2 max-w-[615px]">
                We follow industry-leading compliance standards and best-in-class encryption protocols to keep your customer data safe.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {[
                { title: "GDPR", desc: "Full compliance with EU data protection standards.", bg: "from-blue-700 to-blue-900", img: "card-gdpr-visual" },
                { title: "SOC 2 Type II", desc: "Independently audited for security and reliability.", bg: "from-teal-700 to-teal-900", img: "card-soc2-visual" },
                { title: "HIPAA", desc: "Built to handle protected health information safely.", bg: "from-purple-700 to-purple-900", img: "card-hipaa-visual" },
              ].map(card => (
                <div key={card.title} className="flex flex-col border border-border-bolder-v2 rounded-xl overflow-hidden">
                  <div className={`h-44 bg-gradient-to-br ${card.bg} flex items-center justify-center relative`}>
                    <div className="text-white/30 text-[64px] font-bold tracking-tighter">{card.title.split(" ")[0]}</div>
                  </div>
                  <div className="p-6 bg-bg-inverse-v2">
                    <h3 className="text-mobile-body-l-medium lg:text-desktop-h6-medium text-text-inverse-v2 mb-1">{card.title}</h3>
                    <p className="text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-paragraph-5-v2 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border-bolder-v2 pt-8">
              {[
                { title: "Your data stays yours", desc: "Your data is only accessible to your AI agent and not used to train models.", icon: <ShieldIcon />, color: "text-blue-lighter-v2" },
                { title: "Data encryption", desc: "Data is encrypted at rest and in transit using standard algorithms.", icon: <LockIcon />, color: "text-orange-lighter-v2" },
                { title: "Secure integrations", desc: "We use verified variables to ensure users access their own data.", icon: <KeyIcon />, color: "text-blue-lighter-v2" },
              ].map(f => (
                <div key={f.title} className="flex flex-col gap-3">
                  <div className={f.color}>{f.icon}</div>
                  <h4 className="text-mobile-body-m-medium lg:text-desktop-h7-medium text-text-inverse-v2">{f.title}</h4>
                  <p className="text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-paragraph-5-v2 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider />

      {/* ─── Built for your Industry ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2">
        <div className="mx-auto max-w-[1240px] lg:border border-border-subtle-v2">
          <div className="flex flex-col gap-11 px-6 py-11 lg:gap-16 lg:px-20 lg:py-20">
            <div className="flex items-center justify-between gap-6">
              <h2 className="text-mobile-h2-medium lg:text-desktop-h3-medium text-text-heading-v2">Built for your industry</h2>
              <div className="hidden lg:flex gap-2">
                <button onClick={() => setActiveIndustry(Math.max(0, activeIndustry - 1))} className="w-16 h-16 rounded-full border border-border-subtle-v2 flex items-center justify-center hover:bg-bg-surface-raised-v2 transition-colors" aria-label="Previous"><ArrowLeft /></button>
                <button onClick={() => setActiveIndustry(Math.min(industries.length - 1, activeIndustry + 1))} className="w-16 h-16 rounded-full border border-border-subtle-v2 flex items-center justify-center hover:bg-bg-surface-raised-v2 transition-colors" aria-label="Next"><ArrowRightLg /></button>
              </div>
            </div>
            <div className="hidden lg:flex gap-5" style={{ minHeight: 560 }}>
              {industries.map((ind, idx) => {
                const isActive = activeIndustry === idx;
                return (
                  <button key={ind.name} onClick={() => setActiveIndustry(idx)} className={`relative isolate min-w-0 overflow-hidden border border-border-subtle-v2 rounded-xl transition-all duration-500 cursor-pointer flex flex-col justify-end text-left ${isActive ? "flex-[5] shadow-xl" : "flex-1 hover:flex-[2]"}`} style={{ background: isActive ? ind.gradient : "linear-gradient(to top, #1a1a1a 0%, #1a1a1a00 88.438%)" }}>
                    <div className="absolute inset-0 opacity-30 mix-blend-color-dodge pointer-events-none" style={{ backgroundImage: "url(/assets/images/grain.webp)", backgroundSize: "150px 150px" }} />
                    <div className="absolute inset-0" style={{ background: isActive ? "transparent" : "linear-gradient(to top, #1a1a1a 0%, #1a1a1a00 88.438%)" }} />
                    <div className="relative z-10 p-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-semibold text-text-inverse-v2 mb-3">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        AI Agent
                      </div>
                      <h3 className="text-mobile-body-l-medium lg:text-desktop-h6-medium text-text-inverse-v2 mb-1">{ind.name}</h3>
                      <p className={`text-mobile-body-s-medium lg:text-desktop-body-s-medium text-text-inverse-v2/80 leading-relaxed transition-all duration-500 ${isActive ? "opacity-100 max-h-40" : "opacity-0 max-h-0 overflow-hidden"}`}>{ind.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="lg:hidden flex flex-col gap-3">
              {industries.map((ind, idx) => (
                <button key={ind.name} onClick={() => setActiveIndustry(idx)} className="text-left p-4 rounded-xl border border-border-subtle-v2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-lighter-v2/10 text-[11px] font-semibold text-blue-lighter-v2 mb-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                    AI Agent
                  </div>
                  <h3 className="text-mobile-body-m-medium text-text-heading-v2 mb-1">{ind.name}</h3>
                  {activeIndustry === idx && <p className="text-mobile-body-s-medium text-text-paragraph-4-v2 leading-relaxed">{ind.desc}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="w-full bg-bg-surface-v2 overflow-visible border-y border-border-subtle-v2 border-b-0 px-6 lg:px-0">
        <div className="mx-auto max-w-[1240px] border border-border-subtle-v2 mt-8 bg-bg-surface-raised-v2 lg:mt-0">
          <div className="flex flex-col items-center p-6 md:px-10 md:py-20 lg:px-20 lg:py-30">
            <h1 className="text-balance text-mobile-h1-medium lg:text-desktop-h1-medium text-text-heading-v2 text-center">
              The world's best <span className="text-mobile-h1-italic lg:text-desktop-h1-italic">customer</span> <span className="text-mobile-h1-italic lg:text-desktop-h1-italic">experiences</span> run on SOPRANOVA
            </h1>
            <p className="mt-4 text-mobile-body-l-medium md:max-w-[601px] md:text-center md:mt-6 md:text-desktop-h7-regular text-text-paragraph-4-v2">
              Join thousands of teams using SOPRANOVA to build AI agents that deliver exceptional support at scale — across chat, email, and voice.
            </p>
            <div className="mt-6 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row md:mt-8">
              <Link to="/signup" className="h-12 px-5 py-3 bg-bg-inverse-v2 text-text-inverse-v2 rounded-md font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" style={{ backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.048) 100%)" }}>
                Create agent
                <ArrowRight />
              </Link>
              <Link to="/enterprise" className="h-12 px-5 py-3 bg-bg-surface-raised-v2 text-text-heading-v2 border border-border-subtle-v2 rounded-md font-medium flex items-center justify-center hover:border-text-paragraph-4-v2 transition-colors">
                Get a demo
              </Link>
            </div>
            <div className="w-full mt-12 border-t border-border-subtle-v2 pt-8 flex justify-center">
              <svg width="240" height="24" viewBox="0 0 240 24" fill="none" className="text-border-subtle-v2">
                {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                  <rect key={i} x={i*20 + 8} y="4" width="8" height="8" rx="1" transform={`rotate(45 ${i*20+12} 8)`} stroke="currentColor" fill="none" strokeWidth="1" />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer (Blue) ─── */}
      <footer className="relative isolate bg-blue-lighter-v2">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-color-dodge" style={{ backgroundImage: "url(/assets/images/grain.webp)", backgroundSize: "150px 150px" }} />
        <div className="relative z-10 mx-auto hidden max-w-[1240px] border-border-subtle-v2 border-x border-b bg-bg-surface-raised-v2 lg:block">
          <div className="px-20 pt-20 pb-12">
            <div className="flex flex-row gap-12">
              <div className="w-[290px] shrink-0">
                <ChatbaseWordmark />
                <div className="flex items-center gap-3 mt-6">
                  {[
                    { l: "X", h: "https://x.com/chatbase" },
                    { l: "in", h: "https://www.linkedin.com/company/chatbase-co/" },
                    { l: "Ig", h: "https://www.instagram.com/chatbase_co/" },
                    { l: "Yt", h: "https://www.youtube.com/@chatbase_" },
                  ].map(s => (
                    <a key={s.l} href={s.h} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-border-subtle-v2 flex items-center justify-center text-[12px] text-text-paragraph-4-v2 hover:bg-bg-surface-v2 transition-colors">{s.l}</a>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-8">
                <div className="grid grid-cols-4 gap-12">
                  {(["Product","Features","Compare","Resources"] as const).map(cat => (
                    <div key={cat}>
                      <h3 className="text-mobile-body-s-strong text-text-heading-v2 mb-4">{cat}</h3>
                      <ul className="space-y-2.5">
                        {footerCols[cat].map(link => (
                          <li key={link}><a href="#" className="text-mobile-body-s-medium text-text-paragraph-4-v2 hover:text-text-heading-v2 transition-colors">{link}</a></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-12">
                  {(["Company","Policy"] as const).map(cat => (
                    <div key={cat}>
                      <h3 className="text-mobile-body-s-strong text-text-heading-v2 mb-4">{cat}</h3>
                      <ul className="space-y-2.5">
                        {footerCols[cat].map(link => (
                          <li key={link}><a href="#" className="text-mobile-body-s-medium text-text-paragraph-4-v2 hover:text-text-heading-v2 transition-colors">{link}</a></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-12 border-t border-border-subtle-v2 px-0 py-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <img src="/assets/images/chatbase-wordmark.svg" alt="SOPRANOVA" className="h-4" />
                <div className="flex gap-1.5">
                  {["GDPR","SOC 2","HIPAA"].map(b => <span key={b} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-bg-surface-raised-v2 text-text-paragraph-4-v2 tracking-wider border border-border-subtle-v2">{b}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-4 text-mobile-body-s-medium text-text-paragraph-4-v2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  All systems operational
                </div>
              </div>
              <div className="text-mobile-body-s-medium text-text-paragraph-4-v2">© 2026 SOPRANOVA. All rights reserved.</div>
            </div>
          </div>
        </div>
        {/* Mobile footer */}
        <div className="lg:hidden bg-bg-surface-raised-v2 border-x border-b border-border-subtle-v2 px-6 py-10 text-mobile-body-m-medium">
          <ChatbaseWordmark />
          <div className="mt-6 space-y-4">
            {Object.entries(footerCols).map(([cat, links]) => (
              <details key={cat} className="border-b border-border-subtle-v2 pb-3">
                <summary className="font-semibold text-text-heading-v2 py-2 cursor-pointer">{cat}</summary>
                <ul className="mt-2 space-y-2 pl-2">
                  {links.map(l => <li key={l}><a href="#" className="text-text-paragraph-4-v2">{l}</a></li>)}
                </ul>
              </details>
            ))}
          </div>
          <div className="mt-6 text-[12px] text-text-paragraph-4-v2">© 2026 SOPRANOVA. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
