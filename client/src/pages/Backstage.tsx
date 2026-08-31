import { useState } from "react";
import { Sparkles, Paperclip, Send } from "lucide-react";

const SUGGESTIONS = [
  "What can you help me with?",
  "Show me recent conversations",
  "What topics are customers asking about?",
];

export default function Backstage() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [input, setInput] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: "I can help you with that. This is a demo response — in production I'd use your data sources and instructions." }]);
    }, 600);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "32px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1F3C", margin: 0, letterSpacing: "-0.02em" }}>Backstage</h1>
          <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E5E5", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Controllers</button>
        </div>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>{greeting}. What would you like to do?</p>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1 }} />
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.4,
                background: m.role === "user" ? "#F5F5F4" : "#F0F9FF", color: "#0A0A0A",
                borderBottomRightRadius: m.role === "user" ? 4 : 14,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
              }}>{m.text}</div>
            </div>
          ))
        )}
      </div>

      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 32px 12px" }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setInput(s)} style={{ border: "1px solid #E5E5E5", borderRadius: 999, padding: "6px 12px", fontSize: 12, background: "#fff", cursor: "pointer", color: "#0A0A0A", fontFamily: "inherit" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "12px 32px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px solid #E5E5E5", borderRadius: 999, background: "#fff" }}>
          <Paperclip size={16} color="#6B7280" style={{ cursor: "pointer", flexShrink: 0 }} />
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask a question..." style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", color: "#0A0A0A" }} />
          <button onClick={send} style={{ width: 32, height: 32, borderRadius: "50%", background: "#0A0A0A", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
