import { useState } from "react";
import { Search, Download, Trash2, Plus, Mail, UserPlus, Tag } from "lucide-react";
import "./SimplePage.css";

const mockContacts: Array<{
  id: number; name: string; email: string; company: string;
  tags: string[]; createdAt: string;
}> = [];

export default function Contacts() {
  const [search, setSearch] = useState("");

  const filtered = mockContacts.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="sp-header-left">
          <h1>Contacts</h1>
          <span className="sp-count">{mockContacts.length} contacts</span>
        </div>
        <div className="sp-header-right">
          <button className="sp-btn sp-btn--outline"><Download size={14} /> Import</button>
          <button className="sp-btn sp-btn--primary"><Plus size={14} /> Add contact</button>
        </div>
      </header>

      <div className="sp-toolbar">
        <div className="sp-search">
          <Search size={14} />
          <input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="sp-content">
        {filtered.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon"><UserPlus size={40} /></div>
            <h3>No contacts yet</h3>
            <p>Contacts collected from your conversations will appear here.</p>
            <button className="sp-btn sp-btn--primary"><Plus size={14} /> Add your first contact</button>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Company</th><th>Tags</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="sp-cell-name">{c.name}</td>
                    <td className="sp-cell-email"><Mail size={12} /> {c.email}</td>
                    <td>{c.company}</td>
                    <td className="sp-cell-tags">{c.tags.map((t) => <span key={t} className="sp-tag"><Tag size={10} /> {t}</span>)}</td>
                    <td className="sp-cell-date">{c.createdAt}</td>
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
