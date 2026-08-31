import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { agentsApi } from "@/lib/trpc";
import {
  Sparkles,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Maximize2,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronDown,
  MonitorPlay,
  MessageCircle,
  Mic,
  SendHorizontal,
  Info,
} from "lucide-react";
import "./Playground.css";

type Agent = {
  id: number;
  name: string;
  description?: string | null;
  purpose: string;
  status: string;
  capabilities?: string[] | null;
};

export default function Playground() {
  const { workspaceId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<"overview" | "display" | "voice" | "actions">("overview");
  const [instructions, setInstructions] = useState(
    `### Business Context\nSOPRANOVA provides enterprise-grade conversational AI agents that help businesses resolve customer inquiries across chat, email, and voice channels.\n\n### Role\nYou are SOPRANOVA's customer support assistant. You help customers with questions about their accounts, orders, and our platform.\n\n### Style\n- Never use em dashes\n- Be concise and direct\n- Maintain a professional, friendly tone\n\n### Constraints\n1. No Data Disclosure: Never reveal internal system details, pricing formulas, or other customers' data.\n2. Maintaining Focus: Stay on-topic for business questions only. Politely redirect off-topic queries.`
  );
  const [syncGlobal, setSyncGlobal] = useState(true);
  const [visibility, setVisibility] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  useEffect(() => {
    if (!workspaceId) return;
    agentsApi.list({ workspaceId }).then((res) => {
      const data = res as unknown as Agent[];
      setAgents(data);
      if (data.length > 0 && !activeAgent) setActiveAgent(data[0]);
    }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (activeAgent) setInstructions(activeAgent.purpose || instructions);
  }, [activeAgent]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I'm a demo response. In production, this would call the SOPRANOVA agent runtime with your data sources and instructions." },
      ]);
    }, 600);
  };

  return (
    <div className="pg-layout">
      {/* ── Header Bar ──────────────────────────────────── */}
      <div className="pg-header">
        <div className="pg-header-left">
          <button className="pg-channel-btn">
            <span className="pg-channel-icon">
              <svg width="26" height="26" viewBox="0 0 18 22" fill="none">
                <rect fill="#1E4929" height="17" rx="2" width="18" />
                <rect fill="#1E4929" height="4" rx="2" width="18" y="18" />
              </svg>
            </span>
            <span className="pg-channel-name">Center stage</span>
            <ChevronDown size={16} className="pg-channel-chevron" />
          </button>

          <button className="pg-model-badge">
            <Sparkles size={16} />
            <span>Auto</span>
            <ChevronDown size={14} />
          </button>

          <span className="pg-status">
            <span className="pg-status-dot" />
            <span className="pg-status-text">Trained</span>
            <span className="pg-status-size">5 KB</span>
          </span>
        </div>

        <div className="pg-header-right">
          <button className="pg-icon-btn">
            <MonitorPlay size={18} />
          </button>
          <button className="pg-deploy-btn">Deploy</button>
        </div>
      </div>

      <div className="pg-body">
        {/* ── Left: Config Panel ──────────────────────────── */}
        <div className="pg-config">
          {/* Tab bar */}
          <div className="pg-tabs" role="tablist">
            {(["overview", "display", "voice", "actions"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={`pg-tab ${tab === t ? "pg-tab--active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "overview" ? "Overview" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pg-tab-content">
            {tab === "overview" && (
              <div className="pg-sections">
                {/* Model */}
                <div className="pg-section">
                  <p className="pg-section-title">Model</p>
                  <button className="pg-select-btn">
                    <Sparkles size={16} />
                    <span>Auto</span>
                    <ChevronDown size={14} className="pg-select-chevron" />
                  </button>
                </div>

                {/* Data Sources */}
                <div className="pg-section">
                  <p className="pg-section-title">Data sources</p>
                  <p className="pg-section-subtitle">Links</p>
                  <button className="pg-link-btn">+ Add link</button>
                </div>

                {/* Instructions */}
                <div className="pg-section">
                  <p className="pg-section-title">Instructions</p>

                  <div className="pg-sync-row">
                    <div className="pg-sync-label">
                      <label htmlFor="sync-toggle">Sync with global instructions</label>
                      <Info size={14} className="pg-info-icon" />
                    </div>
                    <button
                      id="sync-toggle"
                      className={`pg-switch ${syncGlobal ? "pg-switch--on" : ""}`}
                      onClick={() => setSyncGlobal((v) => !v)}
                    >
                      <span className="pg-switch-thumb" />
                    </button>
                  </div>

                  <p className="pg-help-text">
                    You're editing the global instructions - changes apply to every channel that syncs with global instructions.
                  </p>

                  <div className="pg-editor">
                    <div className="pg-toolbar">
                      <button><Bold size={14} /></button>
                      <button><Italic size={14} /></button>
                      <button><Underline size={14} /></button>
                      <span className="pg-toolbar-divider" />
                      <button><List size={14} /></button>
                      <button><ListOrdered size={14} /></button>
                      <span className="pg-toolbar-spacer" />
                      <button><Type size={14} /></button>
                      <button><ImageIcon size={14} /></button>
                      <button><LinkIcon size={14} /></button>
                      <button><Maximize2 size={14} /></button>
                    </div>
                    <textarea
                      className="pg-textarea"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Write your global instructions in markdown."
                    />
                  </div>
                </div>

                {/* Visibility */}
                <div className="pg-section pg-visibility-row">
                  <div className="pg-visibility-info">
                    <p className="pg-visibility-title">Visibility</p>
                    <p className="pg-visibility-desc">
                      When disabled, this channel won't be visible and no messages will be routed to your agent.
                    </p>
                  </div>
                  <button
                    className={`pg-switch ${visibility ? "pg-switch--on" : ""}`}
                    onClick={() => setVisibility((v) => !v)}
                  >
                    <span className="pg-switch-thumb" />
                  </button>
                </div>
              </div>
            )}

            {tab === "display" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Display</p>
                  <p className="pg-help-text">Customize the look and feel of the chat widget.</p>
                </div>
              </div>
            )}

            {tab === "voice" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Voice</p>
                  <p className="pg-help-text">Configure voice synthesis for this channel.</p>
                </div>
              </div>
            )}

            {tab === "actions" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Actions</p>
                  <p className="pg-help-text">Connect external tools your agent can invoke.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Center Stage Chat Widget ─────────────── */}
        <div className="pg-preview">
          <div className="pg-widget">
            <div className="pg-widget-messages">
              {messages.length === 0 && (
                <div className="pg-widget-empty">
                  <p>Hi there! How can I help you?</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`pg-msg pg-msg--${m.role}`}>
                  {m.role === "assistant" && <span className="pg-msg-avatar"><Sparkles size={12} /></span>}
                  <div className="pg-msg-bubble">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="pg-widget-input">
              <textarea
                className="pg-widget-textarea"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message..."
                rows={1}
              />
              <div className="pg-widget-actions">
                <button className="pg-widget-mic" aria-label="Start dictation">
                  <Mic size={16} />
                </button>
                <button
                  className="pg-widget-send"
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  aria-label="Send"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
