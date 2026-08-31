import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { agentsApi } from "@/lib/trpc";
import {
  Eye,
  RefreshCw,
  ArrowUp,
  Headphones,
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
  MoreHorizontal,
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

const SUGGESTED_PROMPTS = [
  "What can you help me with?",
  "Audit my agent's configuration for improvements",
  "Review and improve my agent's instructions",
  "How are my credits being used this month?",
];

export default function Playground() {
  const { user, workspaceId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<"overview" | "display" | "voice" | "actions">("overview");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Hi! What can I help you with?" },
  ]);

  useEffect(() => {
    if (!workspaceId) return;
    agentsApi.list({ workspaceId }).then((res) => {
      const data = res as unknown as Agent[];
      setAgents(data);
      if (data.length > 0 && !activeAgent) setActiveAgent(data[0]);
    }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (activeAgent) setInstructions(activeAgent.purpose);
  }, [activeAgent]);

  const saveInstructions = async () => {
    if (!workspaceId || !activeAgent) return;
    setSaving(true);
    try {
      await agentsApi.create({
        workspaceId,
        name: activeAgent.name,
        purpose: instructions,
        description: instructions.slice(0, 240),
      });
    } catch {
      // best effort
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: inputValue }]);
    setInputValue("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I'm a demo response. In production, this would call the SOPRANOVA agent runtime with your data sources and instructions.",
        },
      ]);
    }, 600);
  };

  return (
    <div className="playground">
      {/* Top bar */}
      <div className="playground-topbar">
        <div className="playground-agent-pill">
          <span className="playground-agent-icon">
            <Headphones size={16} />
          </span>
          <span className="playground-agent-name">{activeAgent?.name ?? "SOPRANOVA"}</span>
          <button className="playground-agent-pill-toggle">
            <MoreHorizontal size={14} />
          </button>
        </div>
        <div className="playground-topbar-actions">
          <button className="playground-btn-secondary">
            <Eye size={14} />
            Preview
          </button>
          <button className="playground-btn-primary">
            Deploy
            <span className="playground-btn-chevron">⌄</span>
          </button>
        </div>
      </div>

      <div className="playground-body">
        {/* Left configuration panel */}
        <div className="playground-config">
          <div className="playground-tabs">
            {(["overview", "display", "voice", "actions"] as const).map((t) => (
              <button
                key={t}
                className={`playground-tab ${tab === t ? "playground-tab--active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "overview" ? "Overview" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="playground-config-body">
              <p className="playground-help-text">
                You're editing the global instructions — changes apply to every channel that syncs with global instructions.
              </p>

              <div className="playground-toolbar">
                <button><Bold size={14} /></button>
                <button><Italic size={14} /></button>
                <button><Underline size={14} /></button>
                <span className="playground-toolbar-divider" />
                <button><List size={14} /></button>
                <button><ListOrdered size={14} /></button>
                <span className="playground-toolbar-spacer" />
                <button><Type size={14} /></button>
                <button><ImageIcon size={14} /></button>
                <button><LinkIcon size={14} /></button>
                <button className="playground-toolbar-fullscreen"><Maximize2 size={14} /></button>
              </div>

              <textarea
                className="playground-textarea"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="### Business Context&#10;SOPRANOVA provides enterprise-grade..."
              />

              <div className="playground-visibility">
                <div>
                  <h4>Visibility</h4>
                  <p>When disabled, this channel won't be visible and no messages will be routed to your agent.</p>
                </div>
                <button
                  className={`playground-toggle ${visibility ? "playground-toggle--on" : ""}`}
                  onClick={() => setVisibility((v) => !v)}
                >
                  <span className="playground-toggle-handle" />
                </button>
              </div>
              <button
                className="playground-btn-primary playground-btn-block"
                onClick={saveInstructions}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save instructions"}
              </button>
            </div>
          )}

          {tab === "display" && (
            <div className="playground-config-body">
              <h3>Display settings</h3>
              <p className="playground-help-text">Customize the look and feel of the chat widget for this channel.</p>
              <div className="playground-field">
                <label>Widget name</label>
                <input type="text" defaultValue={activeAgent?.name ?? "SOPRANOVA"} />
              </div>
              <div className="playground-field">
                <label>Brand color</label>
                <input type="color" defaultValue="#0A0A0A" />
              </div>
              <div className="playground-field">
                <label>Welcome message</label>
                <textarea defaultValue="Hi! What can I help you with?" />
              </div>
            </div>
          )}

          {tab === "voice" && (
            <div className="playground-config-body">
              <h3>Voice</h3>
              <p className="playground-help-text">Configure voice synthesis for this channel.</p>
              <div className="playground-field">
                <label>Voice provider</label>
                <select defaultValue="openai">
                  <option value="openai">OpenAI TTS</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="none">Disabled</option>
                </select>
              </div>
            </div>
          )}

          {tab === "actions" && (
            <div className="playground-config-body">
              <h3>Actions</h3>
              <p className="playground-help-text">Connect external tools your agent can invoke.</p>
              <button className="playground-btn-secondary playground-btn-block">+ Add action</button>
            </div>
          )}
        </div>

        {/* Right preview panel */}
        <div className="playground-preview">
          <div className="playground-preview-card">
            <div className="playground-preview-header">
              <span className="playground-preview-icon">
                <Sparkles size={14} />
              </span>
              <span className="playground-preview-name">{activeAgent?.name ?? "SOPRANOVA"}</span>
              <button className="playground-preview-refresh">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="playground-preview-messages">
              {messages.map((m, i) => (
                <div key={i} className={`playground-message playground-message--${m.role}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="playground-preview-suggestions">
              {SUGGESTED_PROMPTS.slice(2, 4).map((s) => (
                <button key={s} className="playground-suggestion" onClick={() => setInputValue(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="playground-preview-input">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage} className="playground-send-btn">
                <ArrowUp size={16} />
              </button>
            </div>
            <p className="playground-preview-powered">Powered by SOPRANOVA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
