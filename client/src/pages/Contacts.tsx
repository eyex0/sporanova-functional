import { Users } from "lucide-react";

export default function Contacts() {
  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1F3C", margin: 0, letterSpacing: "-0.02em" }}>Contacts</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Manage your contacts</p>
        </div>
      </header>
      <div style={{ textAlign: "center", padding: "64px 24px", color: "#9CA3AF" }}>
        <Users size={48} />
        <p style={{ margin: "12px 0 0", fontSize: 14 }}>No contacts yet</p>
      </div>
    </div>
  );
}
