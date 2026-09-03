import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Headphones,
  MessageCircle,
  Globe,
  Database,
  ShoppingCart,
  Wrench,
  BarChart3,
  Shield,
  Zap,
  Mail,
  Phone,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Settings,
  FileText,
  Truck,
  RotateCcw,
  Lightbulb,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  SendHorizontal,
  Building,
  Wifi,
  Lock,
  Server,
  Webhook,
  Cog,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Star,
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import Logo from "@/components/Logo";
import "./HaierDemo.css";

const conversationSteps = [
  {
    user: "My Haier refrigerator is not cooling properly. The temperature display shows 12°C instead of 4°C.",
    agent: "I understand your Haier refrigerator isn't maintaining the correct temperature. Let me help you resolve this. First, could you tell me the model number? It's usually on a sticker inside the fridge.",
    action: null,
    lang: "en",
  },
  {
    user: "It's a Haier HRF-468IF7.",
    agent: "Thank you. I've pulled up the troubleshooting guide for the HRF-468IF7. Let me check a few things:\n\n1. **Condenser coils** — Are they clean and free of dust?\n2. **Door seal** — Does the door close firmly without gaps?\n3. **Temperature setting** — Has anyone adjusted the control panel recently?",
    action: "Looked up product manual · HRF-468IF7",
    lang: "en",
  },
  {
    user: "The coils look clean and the door seals fine. I think someone might have changed the settings.",
    agent: "That's likely the issue. Here's how to reset the temperature on your HRF-468IF7:\n\n1. Press and hold the **Temp** button for 3 seconds\n2. Use the **+/-** buttons to set to **4°C** for the fridge compartment\n3. Press **Temp** again to confirm\n\nThe display should return to normal within 5 minutes. Would you like me to send these instructions to your email as well?",
    action: "Sent reset instructions · Created support ticket #HAE-4829",
    lang: "en",
  },
];

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
];

const integrationPoints = [
  {
    icon: Database,
    title: "Product Knowledge Base",
    desc: "Full Haier Europe product catalog, manuals, troubleshooting guides, and warranty information — indexed and searchable by the AI agent.",
    status: "Connected",
    type: "data-source",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Platform",
    desc: "Real-time order status, delivery tracking, returns processing, and spare part availability across all Haier online stores.",
    status: "Connected",
    type: "integration",
  },
  {
    icon: Headphones,
    title: "Helpdesk & CRM",
    desc: "Bi-directional sync with Zendesk / Salesforce. Auto-create tickets, attach conversation history, and route escalations to the right team.",
    status: "Connected",
    type: "integration",
  },
  {
    icon: Webhook,
    title: "IoT Device Registry",
    desc: "Connect to Haier's smart home IoT platform to pull device diagnostics, error codes, and usage data for remote troubleshooting.",
    status: "Connected",
    type: "data-source",
  },
  {
    icon: Truck,
    title: "Service & Warranty API",
    desc: "Check warranty status, schedule technician visits, and process claims directly through the AI agent conversation.",
    status: "Connected",
    type: "integration",
  },
  {
    icon: Mail,
    title: "Email Gateway",
    desc: "Auto-respond to inbound support emails across 8 European languages with contextual, product-aware answers.",
    status: "Active",
    type: "channel",
  },
];

const channels = [
  { icon: MessageCircle, name: "Website Chat Widget", desc: "Embedded on haier-europe.com and all regional sites", active: true },
  { icon: Mail, name: "Email Support", desc: "Auto-respond to support@haier-europe.com", active: true },
  { icon: Phone, name: "WhatsApp Business", desc: "WhatsApp Business API for direct customer messaging", active: true },
  { icon: Globe, name: "Help Center", desc: "Public knowledge base with AI-powered search", active: true },
  { icon: Layers, name: "Center Stage", desc: "In-app conversational experience on product pages", active: true },
  { icon: Wifi, name: "Smart Home App", desc: "In-app support within the Haier Smart Home mobile app", active: false },
];

const stats = [
  { value: "8", label: "Languages supported", icon: Globe },
  { value: "72%", label: "First-contact resolution", icon: CheckCircle2 },
  { value: "24/7", label: "Always-on availability", icon: Clock },
  { value: "< 3s", label: "Average response time", icon: Zap },
];

const kpis = [
  { label: "Monthly conversations", value: "124,500", change: "+18%", up: true },
  { label: "Resolution rate", value: "82.4%", change: "+6.2%", up: true },
  { label: "Avg. handle time", value: "3.2 min", change: "−42%", up: true },
  { label: "Customer satisfaction", value: "4.7 / 5", change: "+0.4", up: true },
  { label: "Escalation rate", value: "12.1%", change: "−8.3%", up: true },
  { label: "Cost per conversation", value: "€0.34", change: "−61%", up: true },
];

export default function HaierDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [activeLang, setActiveLang] = useState("en");
  const [activeTab, setActiveTab] = useState<"conversation" | "architecture" | "analytics">("conversation");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (visibleMessages >= conversationSteps.length * 2) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setVisibleMessages((v) => v + 1);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isPlaying, visibleMessages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const handlePlay = () => {
    setVisibleMessages(0);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  return (
    <div className="haier-demo-page">
      <PublicNav />

      {/* Hero */}
      <section className="hd-hero">
        <div className="hd-hero-inner">
          <div className="hd-hero-copy">
            <span className="eyebrow">SOPRANOVA × Haier Europe</span>
            <h1>
              AI-Powered Customer Experience for <em>Every Appliance.</em>
            </h1>
            <p>
              A complete integration simulation showing how SOPRANOVA's AI agent platform connects
              with Haier Europe's product ecosystem, support infrastructure, and multi-market operations.
            </p>
            <div className="hd-hero-stats">
              {stats.map((s) => (
                <div key={s.label} className="hd-stat-pill">
                  <s.icon size={15} />
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hd-hero-visual">
            <div className="hd-orbit">
              <div className="hd-orbit-ring r1" />
              <div className="hd-orbit-ring r2" />
              <div className="hd-orbit-ring r3" />
              <div className="hd-orbit-center">
                <Bot size={28} />
                <span>SOPRANOVA</span>
              </div>
              {integrationPoints.slice(0, 5).map((ip, i) => (
                <div key={ip.title} className={`hd-orbit-node n${i + 1}`}>
                  <ip.icon size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="hd-tabs">
        <div className="hd-tabs-inner">
          {[
            { key: "conversation" as const, label: "Live Simulation", icon: Play },
            { key: "architecture" as const, label: "Integration Architecture", icon: Layers },
            { key: "analytics" as const, label: "Analytics Preview", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`hd-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Live Conversation Simulation */}
      {activeTab === "conversation" && (
        <section className="hd-simulation">
          <div className="hd-sim-layout">
            {/* Left: Context Panel */}
            <div className="hd-sim-sidebar">
              <div className="hd-sim-sidebar-header">
                <Bot size={18} />
                <span>Customer Context</span>
              </div>
              <div className="hd-context-card">
                <div className="hd-context-row">
                  <Users size={14} />
                  <div>
                    <small>Customer</small>
                    <strong>Maria Kowalski</strong>
                  </div>
                </div>
                <div className="hd-context-row">
                  <Building size={14} />
                  <div>
                    <small>Market</small>
                    <strong>Poland 🇵🇱</strong>
                  </div>
                </div>
                <div className="hd-context-row">
                  <ShoppingCart size={14} />
                  <div>
                    <small>Product</small>
                    <strong>Haier HRF-468IF7</strong>
                  </div>
                </div>
                <div className="hd-context-row">
                  <FileText size={14} />
                  <div>
                    <small>Warranty</small>
                    <strong>Active — 14 months left</strong>
                  </div>
                </div>
                <div className="hd-context-row">
                  <Clock size={14} />
                  <div>
                    <small>Purchase Date</small>
                    <strong>Jul 14, 2025</strong>
                  </div>
                </div>
              </div>

              <div className="hd-sim-sidebar-header" style={{ marginTop: 16 }}>
                <Globe size={14} />
                <span>Languages</span>
              </div>
              <div className="hd-lang-grid">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    className={`hd-lang-btn ${activeLang === l.code ? "active" : ""}`}
                    onClick={() => setActiveLang(l.code)}
                  >
                    <span>{l.flag}</span>
                    <small>{l.name}</small>
                  </button>
                ))}
              </div>

              <div className="hd-sim-sidebar-header" style={{ marginTop: 16 }}>
                <Wrench size={14} />
                <span>Agent Capabilities</span>
              </div>
              <div className="hd-cap-list">
                {[
                  { icon: FileText, text: "Product troubleshooting" },
                  { icon: Truck, text: "Order & delivery lookup" },
                  { icon: RotateCcw, text: "Returns processing" },
                  { icon: Shield, text: "Warranty verification" },
                  { icon: Phone, text: "Technician scheduling" },
                  { icon: Mail, text: "Email follow-up" },
                ].map((c) => (
                  <div key={c.text} className="hd-cap-item">
                    <c.icon size={13} />
                    <span>{c.text}</span>
                    <CheckCircle2 size={12} className="hd-cap-check" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Chat Simulation */}
            <div className="hd-sim-main">
              <div className="hd-chat-header">
                <div className="hd-chat-header-left">
                  <div className="hd-chat-avatar">
                    <Bot size={18} />
                  </div>
                  <div>
                    <strong>Haier Support Agent</strong>
                    <span className="hd-chat-status">
                      <i /> Online · SOPRANOVA
                    </span>
                  </div>
                </div>
                <div className="hd-chat-controls">
                  <button onClick={isPlaying ? handlePause : handlePlay} className="hd-play-btn">
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    {isPlaying ? "Pause" : "Play simulation"}
                  </button>
                </div>
              </div>

              <div className="hd-chat-body" ref={chatRef}>
                {conversationSteps.map((step, i) => {
                  const showUser = visibleMessages > i * 2;
                  const showAgent = visibleMessages > i * 2 + 1;
                  return (
                    <div key={i} className="hd-chat-exchange">
                      {showUser && (
                        <div className="hd-msg hd-msg-user">
                          <div className="hd-msg-bubble user">{step.user}</div>
                        </div>
                      )}
                      {showAgent && (
                        <div className="hd-msg hd-msg-agent">
                          <div className="hd-msg-avatar">
                            <Bot size={14} />
                          </div>
                          <div>
                            <div className="hd-msg-bubble agent">
                              {step.agent.split("\n").map((line, j) => (
                                <span key={j}>
                                  {line.startsWith("**") ? (
                                    <strong>{line.replace(/\*\*/g, "")}</strong>
                                  ) : line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") ? (
                                    <span className="hd-msg-step">{line}</span>
                                  ) : (
                                    line
                                  )}
                                  {j < step.agent.split("\n").length - 1 && <br />}
                                </span>
                              ))}
                            </div>
                            {step.action && (
                              <div className="hd-msg-action">
                                <Sparkles size={13} />
                                <span>{step.action}</span>
                                <Check size={13} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleMessages === 0 && (
                  <div className="hd-chat-empty">
                    <Bot size={40} />
                    <h3>Haier Europe Support Agent</h3>
                    <p>Click "Play simulation" to see a live customer interaction</p>
                  </div>
                )}
              </div>

              <div className="hd-chat-input">
                <input placeholder="Simulation only — type in Playground to chat" disabled />
                <button disabled title="Use Playground for live chat">
                  <SendHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Architecture View */}
      {activeTab === "architecture" && (
        <section className="hd-architecture">
          <div className="hd-arch-header">
            <span className="eyebrow">Integration Architecture</span>
            <h2>
              Connected across <em>every touchpoint.</em>
            </h2>
            <p>SOPRANOVA integrates with Haier Europe's existing systems through secure APIs and webhooks.</p>
          </div>

          <div className="hd-arch-grid">
            {integrationPoints.map((ip) => (
              <div key={ip.title} className="hd-arch-card">
                <div className="hd-arch-card-icon">
                  <ip.icon size={22} />
                </div>
                <div className="hd-arch-card-content">
                  <div className="hd-arch-card-top">
                    <h3>{ip.title}</h3>
                    <span className={`hd-status-badge ${ip.status === "Connected" ? "connected" : "active"}`}>
                      <i /> {ip.status}
                    </span>
                  </div>
                  <p>{ip.desc}</p>
                  <div className="hd-arch-card-footer">
                    <span className="hd-arch-type">{ip.type}</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hd-arch-flow">
            <span className="eyebrow">Data Flow</span>
            <div className="hd-flow-diagram">
              <div className="hd-flow-node source">
                <Database size={20} />
                <span>Haier Systems</span>
              </div>
              <div className="hd-flow-arrow"><ArrowRight size={20} /></div>
              <div className="hd-flow-node processing">
                <Cog size={20} />
                <span>SOPRANOVA Engine</span>
              </div>
              <div className="hd-flow-arrow"><ArrowRight size={20} /></div>
              <div className="hd-flow-node output">
                <Bot size={20} />
                <span>AI Agent</span>
              </div>
              <div className="hd-flow-arrow"><ArrowRight size={20} /></div>
              <div className="hd-flow-node channel">
                <MessageCircle size={20} />
                <span>Customer Channels</span>
              </div>
            </div>
          </div>

          <div className="hd-channels-grid">
            <span className="eyebrow">Supported Channels</span>
            <div className="hd-channels-list">
              {channels.map((ch) => (
                <div key={ch.name} className={`hd-channel-card ${ch.active ? "" : "coming-soon"}`}>
                  <ch.icon size={20} />
                  <div>
                    <strong>{ch.name}</strong>
                    <span>{ch.desc}</span>
                  </div>
                  <span className={`hd-status-badge ${ch.active ? "connected" : "coming"}`}>
                    {ch.active ? "Active" : "Coming soon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Analytics Preview */}
      {activeTab === "analytics" && (
        <section className="hd-analytics">
          <div className="hd-analytics-header">
            <span className="eyebrow">Analytics Dashboard</span>
            <h2>
              Measure what <em>matters.</em>
            </h2>
            <p>Real-time insights across all Haier Europe support conversations.</p>
          </div>

          <div className="hd-kpi-grid">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="hd-kpi-card">
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
                <span className={`hd-kpi-change ${kpi.up ? "up" : "down"}`}>
                  <TrendingUp size={12} />
                  {kpi.change}
                </span>
              </div>
            ))}
          </div>

          <div className="hd-analytics-panels">
            <div className="hd-analytics-panel">
              <div className="hd-panel-header">
                <h3>Top Issues This Month</h3>
                <span className="eyebrow">By volume</span>
              </div>
              <div className="hd-bar-chart">
                {[
                  { label: "Temperature issues", pct: 78, count: "24,100" },
                  { label: "Delivery status", pct: 62, count: "19,200" },
                  { label: "Warranty claims", pct: 45, count: "13,900" },
                  { label: "Installation help", pct: 38, count: "11,700" },
                  { label: "Spare parts", pct: 28, count: "8,600" },
                  { label: "Returns / refunds", pct: 22, count: "6,800" },
                ].map((item) => (
                  <div key={item.label} className="hd-bar-row">
                    <span className="hd-bar-label">{item.label}</span>
                    <div className="hd-bar-track">
                      <div className="hd-bar-fill" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="hd-bar-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hd-analytics-panel">
              <div className="hd-panel-header">
                <h3>Sentiment Distribution</h3>
                <span className="eyebrow">Last 30 days</span>
              </div>
              <div className="hd-sentiment-grid">
                {[
                  { label: "Positive", value: "68%", color: "#22c55e", icon: Star },
                  { label: "Neutral", value: "24%", color: "#eab308", icon: Check },
                  { label: "Negative", value: "8%", color: "#ef4444", icon: AlertTriangle },
                ].map((s) => (
                  <div key={s.label} className="hd-sentiment-card">
                    <div className="hd-sentiment-icon" style={{ background: `${s.color}15`, color: s.color }}>
                      <s.icon size={20} />
                    </div>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="hd-panel-header" style={{ marginTop: 24 }}>
                <h3>Languages Breakdown</h3>
              </div>
              <div className="hd-lang-breakdown">
                {[
                  { lang: "🇩🇪 German", pct: 32 },
                  { lang: "🇬🇧 English", pct: 24 },
                  { lang: "🇫🇷 French", pct: 16 },
                  { lang: "🇮🇹 Italian", pct: 12 },
                  { lang: "🇪🇸 Spanish", pct: 8 },
                  { lang: "🇵🇱 Polish", pct: 5 },
                  { lang: "🇳🇱 Dutch", pct: 2 },
                  { lang: "🇹🇷 Turkish", pct: 1 },
                ].map((l) => (
                  <div key={l.lang} className="hd-lang-bar-row">
                    <span>{l.lang}</span>
                    <div className="hd-bar-track small">
                      <div className="hd-bar-fill" style={{ width: `${l.pct}%` }} />
                    </div>
                    <span className="hd-bar-count">{l.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="hd-cta">
        <div className="hd-cta-inner">
          <span className="eyebrow light">Ready to transform Haier's customer experience?</span>
          <h2>
            Let's build this <em>together.</em>
          </h2>
          <p>
            This simulation demonstrates the full integration potential. The actual deployment
            would be customized to Haier Europe's specific systems, brand guidelines, and market requirements.
          </p>
          <div className="hd-cta-actions">
            <button className="hd-cta-primary" disabled title="Coming soon">
              Schedule a technical deep-dive <ArrowRight size={15} />
            </button>
            <button className="hd-cta-secondary" disabled title="Coming soon">
              Download integration spec <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
