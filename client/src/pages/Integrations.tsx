import { useState } from "react";
import { useLocation } from "wouter";
import { Search, ExternalLink, ArrowRight, Lock } from "lucide-react";
import { IntegrationIcon, getIntegrationColor } from "@/components/IntegrationIcon";
import "./SimplePage.css";

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "available" | "coming_soon";
  channelLink?: string;
};

const INTEGRATIONS: Integration[] = [
  { id: "widget", name: "Chat Bubble", category: "Widgets", description: "Add a chat bubble to your website for real-time AI conversations.", status: "available", channelLink: "/dashboard/channels" },
  { id: "help_page", name: "Help Page", category: "Widgets", description: "Host a help page with built-in AI chat for customer support.", status: "available", channelLink: "/dashboard/channels" },
  { id: "center_stage", name: "Center Stage", category: "Widgets", description: "Full-focus chat overlay for in-context help on your product.", status: "available", channelLink: "/dashboard/channels" },
  { id: "api", name: "REST API", category: "Development", description: "Integrate your agent directly with your applications via REST API.", status: "available", channelLink: "/dashboard/channels" },
  { id: "email", name: "Email", category: "Messaging", description: "Connect your agent to an email address for automated responses via Resend.", status: "available", channelLink: "/dashboard/channels" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", description: "Respond to customers on WhatsApp via the Cloud API.", status: "available", channelLink: "/dashboard/channels" },
  { id: "sms", name: "SMS", category: "Messaging", description: "Send and receive text messages via Twilio.", status: "available", channelLink: "/dashboard/channels" },
  { id: "slack", name: "Slack", category: "Integrations", description: "Connect your agent to Slack channels for team collaboration.", status: "coming_soon" },
  { id: "messenger", name: "Messenger", category: "Messaging", description: "Respond to Facebook Messenger conversations from your AI agent.", status: "coming_soon" },
  { id: "instagram", name: "Instagram", category: "Messaging", description: "Reply to Instagram DMs from your agent. Requires Business account.", status: "coming_soon" },
  { id: "voice", name: "Voice", category: "Messaging", description: "Voice calls via Twilio or Vonage. Let your agent handle phone conversations.", status: "coming_soon" },
  { id: "shopify", name: "Shopify", category: "E-commerce", description: "Connect to Shopify for order tracking, product info, and customer support.", status: "coming_soon" },
  { id: "zendesk", name: "Zendesk", category: "Support", description: "Draft suggestions or auto-reply to Zendesk tickets with your AI agent.", status: "coming_soon" },
  { id: "salesforce", name: "Salesforce", category: "CRM", description: "Draft suggestions or auto-reply to Salesforce cases.", status: "coming_soon" },
  { id: "wordpress", name: "WordPress", category: "Integration", description: "Use the official SOPRANOVA plugin for WordPress to add chat to your site.", status: "coming_soon" },
  { id: "zapier", name: "Zapier", category: "Integration", description: "Connect your agent with thousands of apps using Zapier webhooks.", status: "coming_soon" },
  { id: "android-sdk", name: "Android SDK", category: "Development", description: "Integrate your AI agent into Android apps using the SOPRANOVA SDK.", status: "coming_soon" },
  { id: "ios-sdk", name: "iOS SDK", category: "Development", description: "Integrate your AI agent into iOS apps using the SOPRANOVA SDK.", status: "coming_soon" },
];

const CATEGORIES = ["All", "Widgets", "Messaging", "E-commerce", "Support", "CRM", "Integration", "Development"];

export default function Integrations() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = INTEGRATIONS.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && i.category !== category) return false;
    return true;
  });

  const availableCount = INTEGRATIONS.filter((i) => i.status === "available").length;
  const comingSoonCount = INTEGRATIONS.filter((i) => i.status === "coming_soon").length;

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Integrations</h1>
          <p className="sp-subtitle">
            {availableCount} available &middot; {comingSoonCount} coming soon
          </p>
        </div>
        <div className="sp-header-actions">
          <button className="sp-btn sp-btn--primary" onClick={() => setLocation("/dashboard/channels")}>
            <ExternalLink size={14} /> Open Channels
          </button>
        </div>
      </header>

      <div className="sp-tabs">
        {CATEGORIES.map((cat) => (
          <button key={cat} className={category === cat ? "active" : ""} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div className="sp-search-bar">
        <Search size={16} />
        <input placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="sp-card-grid sp-card-grid--3">
        {filtered.map((i) => {
          const color = getIntegrationColor(i.id);
          const isAvailable = i.status === "available";
          return (
            <div key={i.id} className={`sp-integration-card ${!isAvailable ? "sp-integration-card--locked" : ""}`}>
              <div className="sp-integration-icon" style={{ background: color + "15", color }}>
                <IntegrationIcon type={i.id} size={24} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3>{i.name}</h3>
                {!isAvailable && <Lock size={12} style={{ color: "#9CA3AF" }} />}
              </div>
              <span className="sp-muted sp-small">{i.category}</span>
              <p>{i.description}</p>
              {isAvailable ? (
                <button
                  className="sp-btn sp-btn--secondary sp-btn--full"
                  onClick={() => setLocation(i.channelLink || "/dashboard/channels")}
                >
                  Configure <ArrowRight size={12} />
                </button>
              ) : (
                <div className="sp-btn sp-btn--ghost sp-btn--full" style={{ opacity: 0.5, cursor: "default" }}>
                  Coming Soon
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
