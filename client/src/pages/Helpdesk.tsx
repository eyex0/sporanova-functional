import { Plus, Search } from "lucide-react";
import "./SimplePage.css";

export default function Helpdesk() {
  return (
    <div className="simple-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="simple-page-btn-secondary">
          <Plus size={14} /> New ticket
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid #E5E5E5", borderRadius: 8, background: "#FFFFFF" }}>
          <Search size={14} color="#6B7280" />
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 32, width: 220 }}>
        {["My inbox", "Mentions", "All", "Unassigned", "Solved", "Conversations"].map((item) => (
          <a key={item} href="#" onClick={(e) => e.preventDefault()} style={{ padding: "8px 12px", borderRadius: 6, fontSize: 14, color: "#0A0A0A", textDecoration: "none" }}>
            {item}
          </a>
        ))}
      </nav>

      <div className="simple-page-empty-card">
        <h3>Start a free trial to use this feature</h3>
        <p>Unlock Helpdesk by upgrading your plan</p>
        <button className="simple-page-btn-primary">Start 7-day trial</button>
      </div>
    </div>
  );
}
