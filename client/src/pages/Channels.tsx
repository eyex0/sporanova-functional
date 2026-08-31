import { useState } from "react";
import { Search, BookOpen, MessageSquare, Sparkles, ExternalLink, BookMarked } from "lucide-react";
import "./Channels.css";

type Channel = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  bgColor: string;
  textColor?: string;
  available: boolean;
};

const channels: Channel[] = [
  {
    id: "chat_bubble",
    title: "Chat bubble",
    description: "Add a chat bubble to your website and AI Agent will chat with visitors.",
    icon: MessageSquare,
    bgColor: "#2563EB",
    available: true,
  },
  {
    id: "help_page",
    title: "Help page",
    description: "Host your own help page and let users chat directly from it.",
    icon: BookOpen,
    bgColor: "#DB2777",
    available: true,
  },
  {
    id: "center_stage",
    title: "Center Stage",
    description: "Open a full-focus chat that opens centered over your site, perfect for in-context help.",
    icon: Sparkles,
    bgColor: "#16A34A",
    available: true,
  },
  {
    id: "messenger",
    title: "Messenger",
    description: "Reach customers on Facebook Messenger.",
    icon: MessageSquare,
    bgColor: "#1E40AF",
    available: false,
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Connect your WhatsApp Business account.",
    icon: MessageSquare,
    bgColor: "#16A34A",
    available: false,
  },
  {
    id: "instagram",
    title: "Instagram",
    description: "Reply to DMs on Instagram automatically.",
    icon: MessageSquare,
    bgColor: "#DB2777",
    available: false,
  },
  {
    id: "slack",
    title: "Slack",
    description: "Bring your agent into Slack channels.",
    icon: MessageSquare,
    bgColor: "#4A154B",
    available: false,
  },
  {
    id: "email",
    title: "Email",
    description: "Auto-reply to incoming email inquiries.",
    icon: MessageSquare,
    bgColor: "#0A0A0A",
    available: false,
  },
];

export default function Channels() {
  const [query, setQuery] = useState("");
  const filtered = channels.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="channels">
      <header className="channels-header">
        <h1>Channels</h1>
      </header>
      <div className="channels-search-row">
        <div className="channels-search">
          <Search size={16} color="#6B7280" />
          <input
            placeholder="Search channels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="channels-grid">
        {filtered.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.id} className="channels-card">
              <div
                className="channels-card-preview"
                style={{
                  background: c.bgColor,
                  backgroundImage: c.bgColor.startsWith("#")
                    ? `linear-gradient(135deg, ${c.bgColor} 0%, ${c.bgColor}CC 100%)`
                    : c.bgColor,
                }}
              >
                <div className="channels-card-preview-inner">
                  <div className="channels-card-preview-widget">
                    <div className="channels-card-preview-header">
                      <div className="channels-card-preview-avatar">
                        <Icon size={14} color={c.bgColor} />
                      </div>
                      <div className="channels-card-preview-bars">
                        <div className="channels-card-preview-bar" style={{ width: "60%" }} />
                        <div className="channels-card-preview-bar" style={{ width: "40%" }} />
                      </div>
                    </div>
                    <div className="channels-card-preview-content">
                      <p>Ask a question...</p>
                    </div>
                    <div className="channels-card-preview-actions">
                      <span>🎤</span>
                      <span>↑</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="channels-card-body">
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className="channels-card-actions">
                  <button className="channels-card-icon-btn">
                    <BookMarked size={14} />
                  </button>
                  <button className="channels-card-manage-btn">
                    {c.available ? "Manage" : "Start free trial to enable"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
