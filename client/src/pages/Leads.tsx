import { useState } from "react";
import { Search, Download, Trash2, Plus, Mail, Tag } from "lucide-react";
import "./SimplePage.css";

const mockLeads: Array<{
  id: number; name: string; email: string; source: string;
  status: string; tags: string[]; createdAt: string;
}> = [];

export default function Leads() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = mockLeads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="sp-header-left">
          <h1>Leads</h1>
          <span className="sp-count">{mockLeads.length} leads</span>
        </div>
        <div className="sp-header-right">
          <button className="sp-btn sp-btn--outline"><Download size={14} /> Export</button>
          <button className="sp-btn sp-btn--primary"><Plus size={14} /> Add lead</button>
        </div>
      </header>

      <div className="sp-toolbar">
        <div className="sp-search">
          <Search size={14} />
          <input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sp-filters">
          {["all", "new", "qualified", "converted", "lost"].map((f) => (
            <button key={f} className={`sp-filter-btn ${filter === f ? "sp-filter-btn--active" : ""}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-content">
        {filtered.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon"><Mail size={40} /></div>
            <h3>No leads yet</h3>
            <p>Leads collected from your chatbot conversations will appear here.</p>
            <button className="sp-btn sp-btn--primary"><Plus size={14} /> Add your first lead</button>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Source</th><th>Status</th><th>Tags</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td className="sp-cell-name">{lead.name}</td>
                    <td className="sp-cell-email"><Mail size={12} /> {lead.email}</td>
                    <td>{lead.source}</td>
                    <td><span className={`sp-status sp-status--${lead.status}`}>{lead.status}</span></td>
                    <td className="sp-cell-tags">{lead.tags.map((t) => <span key={t} className="sp-tag"><Tag size={10} /> {t}</span>)}</td>
                    <td className="sp-cell-date">{lead.createdAt}</td>
                    <td><button className="sp-icon-btn"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
