import { useState } from "react";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

const INTEGRATIONS = [
  { id: "slack", name: "Slack", category: "Communication", description: "Send notifications and replies to your Slack channels", available: true, color: "#4A154B" },
  { id: "shopify", name: "Shopify", category: "E-commerce", description: "Connect your store to provide order and product support", available: true, color: "#96BF48" },
  { id: "twilio", name: "Twilio", category: "Communication", description: "Send SMS and make voice calls through Twilio", available: true, color: "#F22F46" },
  { id: "calendly", name: "Calendly", category: "Scheduling", description: "Let your agent book meetings directly into Calendly", available: true, color: "#006BFF" },
  { id: "stripe", name: "Stripe", category: "Payments", description: "Process payments, refunds, and subscription changes", available: true, color: "#635BFF" },
  { id: "zendesk", name: "Zendesk", category: "Support", description: "Sync tickets between your helpdesk and Zendesk", available: false, color: "#03363D" },
  { id: "hubspot", name: "HubSpot", category: "CRM", description: "Sync contacts, deals, and activities with HubSpot CRM", available: false, color: "#FF7A59" },
  { id: "salesforce", name: "Salesforce", category: "CRM", description: "Connect to Salesforce for enterprise CRM workflows", available: false, color: "#00A1E0" },
  { id: "intercom", name: "Intercom", category: "Support", description: "Migrate from Intercom or sync your live chat", available: false, color: "#1F8DED" },
  { id: "help_scout", name: "Help Scout", category: "Support", description: "Sync your Help Scout mailbox and customer data", available: false, color: "#1292EE" },
  { id: "freshdesk", name: "Freshdesk", category: "Support", description: "Sync tickets and contacts with Freshdesk", available: false, color: "#25C16F" },
  { id: "cal_com", name: "Cal.com", category: "Scheduling", description: "Open-source scheduling integration", available: true, color: "#292929" },
];

export default function Integrations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "connected">("all");

  const filtered = INTEGRATIONS.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "available" && !i.available) return false;
    if (filter === "connected") return false; // No connected state in this stub
    return true;
  });

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Integrations</h1>
          <p className="sp-subtitle">Connect your agent to the tools your team already uses</p>
        </div>
      </header>

      <div className="sp-tabs">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
        <button className={filter === "available" ? "active" : ""} onClick={() => setFilter("available")}>Available</button>
        <button className={filter === "connected" ? "active" : ""} onClick={() => setFilter("connected")}>Connected</button>
      </div>

      <div className="sp-search-bar">
        <Search size={16} />
        <input placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="sp-card-grid sp-card-grid--3">
        {filtered.map((i) => (
          <div key={i.id} className={`sp-integration-card ${!i.available ? "sp-integration-card--locked" : ""}`}>
            <div className="sp-integration-icon" style={{ background: i.color }}>{i.name.charAt(0)}</div>
            <h3>{i.name}</h3>
            <span className="sp-muted sp-small">{i.category}</span>
            <p>{i.description}</p>
            <button
              className={`sp-btn sp-btn--${i.available ? "secondary" : "ghost"} sp-btn--full`}
              onClick={() => i.available ? toast.info(`Connect ${i.name} — coming soon`) : toast.info("Upgrade to a paid plan to enable this integration")}
            >
              {i.available ? <><Check size={12} /> Start free trial to enable</> : "Upgrade to enable"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
