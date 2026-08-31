import { useState } from "react";
import { Search } from "lucide-react";
import "./Integrations.css";

type Integration = {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  iconColor: string;
  initials: string;
};

const integrations: Integration[] = [
  { id: "slack", name: "Slack", description: "Manage your Slack conversations.", bgColor: "#FEF3C7", iconColor: "#4A154B", initials: "S" },
  { id: "shopify", name: "Shopify", description: "Connect your Shopify store to SOPRANOVA.", bgColor: "#D1FAE5", iconColor: "#16A34A", initials: "S" },
  { id: "twilio", name: "Twilio", description: "Enable inbound phone calls for your AI Agent via Twilio.", bgColor: "#FEE2E2", iconColor: "#DC2626", initials: "T" },
  { id: "calendly", name: "Calendly", description: "Manage your Calendly events.", bgColor: "#DBEAFE", iconColor: "#1D4ED8", initials: "C" },
  { id: "stripe", name: "Stripe", description: "Manage payments, billing, and automate financial operations.", bgColor: "#EDE9FE", iconColor: "#7C3AED", initials: "S" },
  { id: "zendesk", name: "Zendesk", description: "Connect Zendesk so that your AI agent can escalate tickets to humans, draft suggestions or auto-reply to tickets.", bgColor: "#D1FAE5", iconColor: "#16A34A", initials: "Z" },
  { id: "hubspot", name: "HubSpot", description: "Sync contacts and tickets with HubSpot CRM.", bgColor: "#FEE2E2", iconColor: "#DC2626", initials: "H" },
  { id: "salesforce", name: "Salesforce", description: "Connect Salesforce for CRM data sync.", bgColor: "#DBEAFE", iconColor: "#1D4ED8", initials: "S" },
  { id: "intercom", name: "Intercom", description: "Migrate from Intercom and sync data.", bgColor: "#DBEAFE", iconColor: "#1D4ED8", initials: "I" },
  { id: "helpscout", name: "Help Scout", description: "Connect Help Scout for ticket management.", bgColor: "#DBEAFE", iconColor: "#2563EB", initials: "H" },
  { id: "freshdesk", name: "Freshdesk", description: "Connect Freshdesk for ticket management.", bgColor: "#D1FAE5", iconColor: "#16A34A", initials: "F" },
  { id: "cal", name: "Cal.com", description: "Manage your Cal.com bookings.", bgColor: "#0A0A0A", iconColor: "#FFFFFF", initials: "C" },
];

export default function Integrations() {
  const [query, setQuery] = useState("");
  const filtered = integrations.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="integrations">
      <header className="integrations-header">
        <h1>Integrations</h1>
      </header>
      <div className="integrations-search-row">
        <div className="integrations-search">
          <Search size={16} color="#6B7280" />
          <input
            placeholder="Search integrations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="integrations-grid">
        {filtered.map((i) => (
          <div key={i.id} className="integration-card">
            <div className="integration-card-icon" style={{ background: i.bgColor, color: i.iconColor }}>
              <span>{i.initials}</span>
            </div>
            <h3>{i.name}</h3>
            <p>{i.description}</p>
            <button className="integration-card-cta">Start free trial to enable</button>
          </div>
        ))}
      </div>
    </div>
  );
}
