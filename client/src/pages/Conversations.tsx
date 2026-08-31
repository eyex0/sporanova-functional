import { MessageSquare, Search } from "lucide-react";

export default function Conversations() {
  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1F3C", margin: 0, letterSpacing: "-0.02em" }}>Conversations</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>View and manage chat conversations</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid #E5E5E5", borderRadius: 8, background: "#fff" }}>
          <Search size={14} color="#6B7280" />
          <input placeholder="Search conversations..." style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", color: "#0A0A0A" }} />
        </div>
      </header>
      <div style={{ textAlign: "center", padding: "64px 24px", color: "#9CA3AF" }}>
        <MessageSquare size={48} />
        <p style={{ margin: "12px 0 0", fontSize: 14 }}>No conversations yet</p>
      </div>
    </div>
  );
}
