import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Paperclip, ArrowUp, Sparkles, MessageSquare, Mail, Plus, X } from "lucide-react";
import "./Backstage.css";

const SUGGESTED = [
  "What can you help me with?",
  "Audit my agent's configuration for improvements",
  "Review and improve my agent's instructions",
  "How are my credits being used this month?",
];

export default function Backstage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [input, setInput] = useState("");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I'm a demo Backstage agent. In production, this would call the SOPRANOVA runtime to perform tasks across your data sources, agents, and channels." },
      ]);
    }, 600);
  };

  return (
    <div className="backstage">
      <header className="backstage-header">
        <h1>Backstage</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="backstage-btn-secondary">
            <MessageSquare size={14} color="#16A34A" />
            <Mail size={14} color="#2563EB" />
            <span>Controllers</span>
          </button>
          <button className="backstage-btn-icon">
            <Plus size={14} />
          </button>
        </div>
      </header>

      <div className="backstage-banner">
        <div className="backstage-banner-content">
          <strong>Meet SOPRANOVA Backstage, your agent's AI-powered operations center.</strong>
          <span>Manage agents through conversation.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="backstage-btn-secondary">▶ Watch video</button>
          <button className="backstage-btn-icon">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="backstage-body">
        <h2 className="backstage-greeting">{greeting}</h2>

        <div className="backstage-chat">
          {messages.length === 0 ? (
            <div className="backstage-chat-empty">
              <p>Ask anything. Or tell me what you want done.</p>
            </div>
          ) : (
            <div className="backstage-chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`backstage-message backstage-message--${m.role}`}>
                  {m.text}
                </div>
              ))}
            </div>
          )}

          <div className="backstage-input">
            <button className="backstage-input-attach">
              <Paperclip size={16} />
            </button>
            <input
              placeholder="Ask anything. Or tell me what you want done."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="backstage-input-send" onClick={send}>
              <ArrowUp size={16} />
            </button>
          </div>

          <div className="backstage-cta">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={16} color="#16A34A" />
              <Mail size={16} color="#2563EB" />
              <span>Connect backstage to your iMessage or Slack</span>
            </div>
            <button className="backstage-btn-secondary">Connect</button>
            <button className="backstage-btn-icon">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="backstage-suggestions">
          {SUGGESTED.map((s) => (
            <button key={s} className="backstage-suggestion" onClick={() => setInput(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
