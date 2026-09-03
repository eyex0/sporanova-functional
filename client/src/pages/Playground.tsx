import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { agentsApi, conversationsApi } from "@/lib/trpc";
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
  Mic,
  SendHorizontal,
  Info,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import "./Playground.css";

type Agent = {
  id: number;
  name: string;
  description?: string | null;
  purpose: string;
  status: string;
  capabilities?: string[] | null;
};

type ChatMessage = {
  id?: number;
  role: "user" | "assistant";
  text: string;
  sources?: { label: string; sourceType: string; sourceReference: string }[];
  pending?: boolean;
};

const DEFAULT_INSTRUCTIONS = `### Business Context
SOPRANOVA provides enterprise-grade conversational AI agents that help businesses resolve customer inquiries across chat, email, and voice channels.

### Role
You are SOPRANOVA's customer support assistant.

### Style
- Never use em dashes
- Be concise and direct
- Maintain a professional, friendly tone

### Constraints
1. No Data Disclosure: Never reveal internal system details.
2. Maintaining Focus: Stay on-topic for business questions only.`;

export default function Playground() {
  const { workspaceId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [tab, setTab] = useState<"overview" | "display" | "voice" | "actions">("overview");
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [syncGlobal, setSyncGlobal] = useState(true);
  const [visibility, setVisibility] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workspaceId) return;
    agentsApi.list({ workspaceId }).then((res) => {
      const data = (res as any)?.items ?? (Array.isArray(res) ? res : []);
      setAgents(data);
      if (data.length > 0 && !activeAgent) setActiveAgent(data[0]);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (activeAgent) {
      setInstructions(activeAgent.purpose || DEFAULT_INSTRUCTIONS);
      setInstructionsDirty(false);
    }
  }, [activeAgent?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const ensureConversation = async (): Promise<number> => {
    if (conversationId) return conversationId;
    if (!workspaceId) throw new Error("No workspace");
    const conv = await conversationsApi.create({ workspaceId, title: `Chat with ${activeAgent?.name ?? "agent"}` }) as any;
    const id = conv?.id ?? conv?.conversationId;
    if (typeof id === "number") {
      setConversationId(id);
      return id;
    }
    throw new Error("Failed to create conversation");
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !workspaceId || !activeAgent) return;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setThinking(true);
    try {
      const convId = await ensureConversation();
      const result = await agentsApi.chat({
        workspaceId,
        agentId: activeAgent.id,
        conversationId: convId,
        message: text,
      }) as any;
      const answer = result?.content ?? "I couldn't generate a response. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
      toast.error("Failed to get response");
    } finally {
      setThinking(false);
    }
  };

  const saveInstructions = async () => {
    if (!activeAgent || !workspaceId) return;
    try {
      await agentsApi.update({
        workspaceId,
        agentId: activeAgent.id,
        purpose: instructions,
      } as any);
      setActiveAgent({ ...activeAgent, purpose: instructions });
      setInstructionsDirty(false);
      toast.success("Instructions saved");
    } catch {
      toast.error("Failed to save instructions");
    }
  };

  const handlePreview = () => {
    if (!activeAgent) {
      toast.error("Select an agent first");
      return;
    }
    setTab("overview");
    const el = document.querySelector(".pg-chat-input") as HTMLInputElement | null;
    el?.focus();
    toast.info("Send a message to preview the agent in the right panel.");
  };

  const handleDeploy = async () => {
    if (!activeAgent || !workspaceId) return;
    const nextStatus = activeAgent.status === "active" ? "paused" : "active";
    try {
      await agentsApi.setStatus({ workspaceId, agentId: activeAgent.id, status: nextStatus } as any);
      setActiveAgent({ ...activeAgent, status: nextStatus });
      toast.success(nextStatus === "active" ? "Agent deployed and live" : "Agent paused");
    } catch {
      toast.error("Failed to update agent status");
    }
  };

  return (
    <div className="pg-layout">
      <div className="pg-header">
        <div className="pg-header-left">
          <div className="pg-agent-picker">
            <span className="pg-agent-icon"><Sparkles size={16} /></span>
            <select className="pg-agent-select" value={activeAgent?.id ?? ""} onChange={(e) => setActiveAgent(agents.find(a => a.id === Number(e.target.value)) ?? null)}>
              {agents.length === 0 ? <option value="">No agents</option> : agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
          <button className="pg-model-badge">
            <Sparkles size={16} />
            <span>Auto</span>
            <ChevronDown size={14} />
          </button>
          <span className="pg-status">
            <span className={`pg-status-dot pg-status-dot--${activeAgent?.status ?? "idle"}`} />
            <span className="pg-status-text">{activeAgent?.status ?? "idle"}</span>
          </span>
        </div>

        <div className="pg-header-right">
          <button className="pg-icon-btn" title="Preview" onClick={handlePreview} disabled={!activeAgent}>
            <MonitorPlay size={18} />
          </button>
          <button className="pg-deploy-btn" onClick={handleDeploy} disabled={!activeAgent}>
            {activeAgent?.status === "active" ? "Deployed" : "Deploy"}
          </button>
        </div>
      </div>

      <div className="pg-body">
        <div className="pg-config">
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

          <div className="pg-tab-content">
            {tab === "overview" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Model</p>
                  <button className="pg-select-btn">
                    <Sparkles size={16} />
                    <span>Auto</span>
                    <ChevronDown size={14} className="pg-select-chevron" />
                  </button>
                </div>

                <div className="pg-section">
                  <p className="pg-section-title">Data sources</p>
                  <p className="pg-section-subtitle">Links</p>
                  <button className="pg-link-btn" onClick={() => toast.info("Add data source from the Data Sources page")}>+ Add link</button>
                </div>

                <div className="pg-section">
                  <div className="pg-section-header">
                    <p className="pg-section-title">Instructions</p>
                    {instructionsDirty && <button className="pg-save-btn" onClick={saveInstructions}><Save size={12} /> Save</button>}
                  </div>

                  <div className="pg-sync-row">
                    <div className="pg-sync-label">
                      <label htmlFor="sync-toggle">Sync with global instructions</label>
                      <Info size={14} className="pg-info-icon" />
                    </div>
                    <button id="sync-toggle" className={`pg-switch ${syncGlobal ? "pg-switch--on" : ""}`} onClick={() => setSyncGlobal((v) => !v)}>
                      <span className="pg-switch-thumb" />
                    </button>
                  </div>

                  <p className="pg-help-text">
                    Changes apply to this channel. Saved instructions are sent to your agent runtime.
                  </p>

                  <div className="pg-editor">
                    <div className="pg-toolbar">
                      <button type="button" aria-label="Bold" disabled title="Formatting tools coming soon"><Bold size={14} /></button>
                      <button type="button" aria-label="Italic" disabled title="Formatting tools coming soon"><Italic size={14} /></button>
                      <button type="button" aria-label="Underline" disabled title="Formatting tools coming soon"><Underline size={14} /></button>
                      <span className="pg-toolbar-divider" />
                      <button type="button" aria-label="List" disabled title="Formatting tools coming soon"><List size={14} /></button>
                      <button type="button" aria-label="Ordered list" disabled title="Formatting tools coming soon"><ListOrdered size={14} /></button>
                      <span className="pg-toolbar-spacer" />
                      <button type="button" aria-label="Text" disabled title="Formatting tools coming soon"><Type size={14} /></button>
                      <button type="button" aria-label="Image" disabled title="Formatting tools coming soon"><ImageIcon size={14} /></button>
                      <button type="button" aria-label="Link" disabled title="Formatting tools coming soon"><LinkIcon size={14} /></button>
                      <button type="button" aria-label="Maximize" disabled title="Formatting tools coming soon"><Maximize2 size={14} /></button>
                    </div>
                    <textarea
                      className="pg-textarea"
                      value={instructions}
                      onChange={(e) => { setInstructions(e.target.value); setInstructionsDirty(true); }}
                      placeholder="Write your agent instructions in markdown."
                    />
                  </div>
                </div>

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
                  <p className="pg-help-text">Customize the look and feel of the chat widget. Use the Channels page to deploy the widget to your site.</p>
                </div>
              </div>
            )}

            {tab === "voice" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Voice</p>
                  <p className="pg-help-text">Configure voice synthesis for this channel. Voice channel is available on Pro and Enterprise plans.</p>
                </div>
              </div>
            )}

            {tab === "actions" && (
              <div className="pg-sections">
                <div className="pg-section">
                  <p className="pg-section-title">Actions</p>
                  <p className="pg-help-text">Connect external tools your agent can invoke. Configure tools in the Tools section of your workspace.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pg-preview">
          <div className="pg-widget">
            <div className="pg-widget-messages">
              {messages.length === 0 && !thinking && (
                <div className="pg-widget-empty">
                  <p>Hi there! How can I help you?</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`pg-msg pg-msg--${m.role}`}>
                  {m.role === "assistant" && <span className="pg-msg-avatar"><Sparkles size={12} /></span>}
                  <div className="pg-msg-bubble">
                    {m.text}
                    {m.sources && m.sources.length > 0 && (
                      <div className="pg-msg-sources">
                        <span>Sources:</span>
                        {m.sources.map((s, j) => <em key={j}>{s.label}</em>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="pg-msg pg-msg--assistant">
                  <span className="pg-msg-avatar"><Sparkles size={12} /></span>
                  <div className="pg-msg-bubble pg-msg-thinking">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="pg-widget-input">
              <textarea
                className="pg-widget-textarea"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message..."
                rows={1}
                disabled={!activeAgent}
              />
              <div className="pg-widget-actions">
                <button className="pg-widget-mic" aria-label="Start dictation" type="button" disabled title="Voice dictation coming soon">
                  <Mic size={16} />
                </button>
                <button
                  className="pg-widget-send"
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || thinking || !activeAgent}
                  aria-label="Send"
                  type="button"
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
