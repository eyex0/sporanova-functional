import { Settings as SettingsIcon, Plus, Search } from "lucide-react";
import "./SimplePage.css";

export default function Contacts() {
  return (
    <div className="simple-page">
      <header className="simple-page-header">
        <h1>Contacts</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="simple-page-btn-secondary">
            <SettingsIcon size={14} /> Manage attributes
          </button>
          <button className="simple-page-btn-secondary">
            ↑ Import
          </button>
          <button className="simple-page-btn-primary" style={{ background: "#0A0A0A", color: "#FFFFFF" }}>
            <Plus size={14} /> Add contact
          </button>
        </div>
      </header>
      <p className="simple-page-subtitle">0 items</p>

      <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid #E5E5E5", borderRadius: 8, width: 280 }}>
            <Search size={14} color="#6B7280" />
            <input placeholder="Search" style={{ border: "none", outline: "none", flex: 1, fontSize: 14 }} />
          </div>
          <button className="simple-page-btn-secondary">⊞ Columns</button>
        </div>
        <div className="simple-page-list-empty">
          <h3>No contacts yet</h3>
          <p>Add contacts manually or import a CSV to get started.</p>
        </div>
      </div>
    </div>
  );
}
