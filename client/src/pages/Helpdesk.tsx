import { useState } from "react";
import { Inbox, Search, Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Tag } from "lucide-react";
import "../pages/SimplePage.css";

type Ticket = {
  id: number;
  subject: string;
  status: string;
  priority: string;
  assignee?: string;
  createdAt: string;
  lastReply?: string;
};

const inboxItems = [
  { id: "my", label: "My inbox", icon: Inbox, count: 0 },
  { id: "mentions", label: "Mentions", icon: Tag, count: 0 },
  { id: "all", label: "All", icon: MessageSquare, count: 0 },
  { id: "unassigned", label: "Unassigned", icon: AlertCircle, count: 0 },
  { id: "solved", label: "Solved", icon: CheckCircle, count: 0 },
  { id: "conversations", label: "Conversations", icon: MessageSquare, count: 0 },
];

export default function Helpdesk() {
  const [activeInbox, setActiveInbox] = useState("my");
  const [search, setSearch] = useState("");
  const [tickets] = useState<Ticket[]>([]);

  return (
    <div className="sp-page sp-page--split">
      {/* Sidebar */}
      <aside className="sp-sidebar">
        <div className="sp-sidebar-header">
          <h2>Helpdesk</h2>
          <button className="sp-btn sp-btn--primary sp-btn--sm"><Plus size={14} /> New ticket</button>
        </div>
        <div className="sp-sidebar-search">
          <Search size={14} />
          <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <nav className="sp-sidebar-nav">
          {inboxItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`sp-sidebar-item ${activeInbox === item.id ? "sp-sidebar-item--active" : ""}`}
                onClick={() => setActiveInbox(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                <span className="sp-sidebar-count">{item.count}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="sp-main">
        {tickets.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon"><Inbox size={40} /></div>
            <h3>No tickets yet</h3>
            <p>Customer support tickets will appear here. Start a free trial to use the helpdesk.</p>
            <button className="sp-btn sp-btn--primary">Start 7-day trial</button>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Last reply</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="sp-cell-name">{ticket.subject}</td>
                    <td><span className={`sp-status sp-status--${ticket.status}`}>{ticket.status}</span></td>
                    <td>{ticket.priority}</td>
                    <td>{ticket.assignee || "—"}</td>
                    <td>{ticket.lastReply || "—"}</td>
                    <td className="sp-cell-date">{new Date(ticket.createdAt).toLocaleDateString()}</td>
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
