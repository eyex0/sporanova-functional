import { useParams, Link } from "react-router";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const tabs = ["Overview", "Display", "Voice", "Actions"];

export default function Playground() {
  const { agentId } = useParams();
  const { workspaceId } = useWorkspace();
  const [activeTab, setActiveTab] = useState("Overview");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");

  const agents = trpc.agents.list.useQuery({ workspaceId: workspaceId ?? 0 }, { enabled: Boolean(workspaceId) });
  const agent = agents.data?.find(a => a.id === Number(agentId));

  const run = trpc.agents.runNow.useMutation({
    onSuccess: (result) => {
      setMessages(prev => [...prev, { role: "ai", text: result.content }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || !workspaceId || !agentId) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    run.mutate({ workspaceId, agentId: Number(agentId), instruction: userMsg });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 76px)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f3f4f6", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "#22c55e" }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827", fontFamily: "'Inter', sans-serif" }}>
            {agent?.name || "Center stage"}
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#9ca3af" }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><path d="M6 6h4M6 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            Preview
          </button>
          <button style={{ padding: "7px 14px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Deploy
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden" }}>
        {/* Left: Config panel */}
        <div style={{ borderRight: "1px solid #f3f4f6", overflowY: "auto", padding: "0 24px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f3f4f6", margin: "0 -24px", padding: "0 24px" }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 16px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                  background: "none", fontFamily: "'Inter', sans-serif",
                  color: activeTab === tab ? "#111827" : "#9ca3af",
                  borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 0" }}>
            {/* Model */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>Model</h3>
              <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4 4.5.7-3.25 3.2.75 4.6L8 12.1l-4 2.4.75-4.6L1.5 6.7 6 6l2-4z" fill="#6366f1" /></svg>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Auto</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            {/* Upgrade banner */}
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f9fafb", border: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Upgrade for attachments & advanced models</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button style={{ padding: "5px 10px", borderRadius: 6, background: "#6366f1", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Start free trial
                </button>
                <button style={{ width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>

            {/* Data sources */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>Data sources</h3>
              <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Trained</span>
                </div>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>5 KB</span>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3H4a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="#9ca3af" strokeWidth="1.2" /></svg>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Links</span>
                </div>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>1</span>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>Instructions</h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Sync with global instructions</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: "#6366f1", position: "relative", cursor: "pointer" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 10px", lineHeight: 1.5 }}>You're editing the global instructions — changes apply to every channel that syncs with global instructions.</p>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderRadius: "10px 10px 0 0", border: "1px solid #e5e7eb", borderBottom: "none", background: "#f9fafb" }}>
                {["B", "I", "U", "—", "≡", "elled"].map((btn, i) => (
                  <button key={i} style={{ width: 28, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: btn === "B" ? 700 : 400, color: "#6b7280", fontStyle: btn === "I" ? "italic" : "normal", textDecoration: btn === "U" ? "underline" : "none" }}>
                    {btn}
                  </button>
                ))}
                <button style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 12l8-8M8 4h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              <textarea
                readOnly
                style={{
                  width: "100%", minHeight: 180, padding: "12px 14px", borderRadius: "0 0 10px 10px", border: "1px solid #e5e7eb", fontSize: 13, lineHeight: 1.6, color: "#374151", outline: "none", resize: "vertical", fontFamily: "'Inter', sans-serif",
                }}
                defaultValue={`### Business Context\nSOPRANOVA provides enterprise-grade conversational AI agents for customer experience across chat, email, and voice. Its no-code platform helps businesses build, test, deploy, and optimize agents for support, sales, and product guidance, with sub-second responses, persistent context, 200+ integrations, data isolation, and SOC 2 compliance. The platform is trusted by over 10,000 businesses worldwide.`}
              />
            </div>
          </div>
        </div>

        {/* Right: Chat preview */}
        <div style={{ display: "flex", flexDirection: "column", background: "#f9fafb" }}>
          {/* Chat header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "'Inter', sans-serif" }}>AI Agent</span>
            </div>
            <button style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1112 0 6 6 0 01-12 0z" stroke="currentColor" strokeWidth="1.2" /><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 16, color: "#9ca3af", fontFamily: "'Inter', sans-serif" }}>What can I help you with today?</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                  {msg.role === "ai" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
                    borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: msg.role === "user" ? "#111827" : "#fff",
                    color: msg.role === "user" ? "#fff" : "#374151",
                    border: msg.role === "ai" ? "1px solid #e5e7eb" : "none",
                  }}>
                    {msg.text}
                    {msg.role === "ai" && (
                      <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Agent</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {run.isPending && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 4px", background: "#fff", border: "1px solid #e5e7eb", fontSize: 13, color: "#9ca3af" }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Message..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "'Inter', sans-serif", background: "transparent", color: "#111827" }}
              />
              <button style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || run.isPending}
                style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: input.trim() ? "#6366f1" : "#e5e7eb", border: "none", cursor: input.trim() ? "pointer" : "default", color: input.trim() ? "#fff" : "#9ca3af" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
