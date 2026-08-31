import { useState } from "react";
import { useLocation } from "wouter";
import { Send, Mail, MessageSquare, Calendar, Zap, ChevronRight } from "lucide-react";
import "../pages/SimplePage.css";

type Campaign = {
  id: number;
  name: string;
  type: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  createdAt: string;
};

const campaignTypes = [
  { id: "email", label: "Email campaigns", icon: Mail, description: "Send personalized emails to your contacts" },
  { id: "sms", label: "SMS campaigns", icon: MessageSquare, description: "Send text messages to your contacts" },
  { id: "scheduled", label: "Scheduled messages", icon: Calendar, description: "Schedule messages to be sent later" },
  { id: "automated", label: "Automated sequences", icon: Zap, description: "Set up automated follow-up sequences" },
];

export default function Outbound() {
  const [, setLocation] = useLocation();
  const [campaigns] = useState<Campaign[]>([]);

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="sp-header-left">
          <h1>Campaigns</h1>
          <span className="sp-count">Outbound messaging</span>
        </div>
      </header>

      <div className="sp-content">
        {campaigns.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon"><Send size={40} /></div>
            <h3>Start your first campaign</h3>
            <p>Reach out to your contacts with personalized outbound messages.</p>

            <div className="sp-card-grid">
              {campaignTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.id} className="sp-card" onClick={() => {}}>
                    <div className="sp-card-icon"><Icon size={20} /></div>
                    <div className="sp-card-body">
                      <h3>{type.label}</h3>
                      <p>{type.description}</p>
                    </div>
                    <ChevronRight size={16} className="sp-card-arrow" />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="sp-cell-name">{c.name}</td>
                    <td>{c.type}</td>
                    <td><span className={`sp-status sp-status--${c.status}`}>{c.status}</span></td>
                    <td>{c.sent}</td>
                    <td>{c.opened}</td>
                    <td>{c.clicked}</td>
                    <td className="sp-cell-date">{new Date(c.createdAt).toLocaleDateString()}</td>
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
