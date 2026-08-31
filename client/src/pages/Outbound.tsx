import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { outboundApi } from "@/lib/trpc";
import { Plus, Mail, MessageSquare, Calendar, Zap, Play, Pause, Trash2, Send, Download } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

type Campaign = {
  id: number;
  name: string;
  type: "email" | "sms" | "scheduled" | "automated";
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  subject: string | null;
  body: string | null;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  scheduledAt: string | null;
  createdAt: string;
};

const CAMPAIGN_TYPES: Array<{ type: Campaign["type"]; label: string; description: string; icon: React.ReactNode; tone: string }> = [
  { type: "email", label: "Email", description: "Send personalized emails to contacts and leads", icon: <Mail size={20} />, tone: "blue" },
  { type: "sms", label: "SMS", description: "Reach customers on their mobile devices", icon: <MessageSquare size={20} />, tone: "green" },
  { type: "scheduled", label: "Scheduled", description: "Pre-schedule campaigns to send at a specific time", icon: <Calendar size={20} />, tone: "orange" },
  { type: "automated", label: "Automated", description: "Trigger campaigns based on customer behavior", icon: <Zap size={20} />, tone: "purple" },
];

export default function Outbound() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ name: string; type: Campaign["type"]; subject: string; body: string; recipientCount: number }>({ name: "", type: "email", subject: "", body: "", recipientCount: 0 });

  const { data: stats } = useQuery({
    queryKey: ["outbound.stats", workspaceId],
    queryFn: () => outboundApi.campaignStats({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["outbound.campaigns", workspaceId],
    queryFn: () => outboundApi.listCampaigns({ workspaceId: workspaceId! }) as Promise<{ items: Campaign[]; total: number }>,
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: outboundApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound.campaigns"] });
      toast.success("Campaign created");
      setShowCreate(false);
      setForm({ name: "", type: "email", subject: "", body: "", recipientCount: 0 });
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const send = useMutation({
    mutationFn: outboundApi.sendCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound.campaigns"] });
      toast.success("Campaign sending");
    },
    onError: () => toast.error("Failed to send campaign"),
  });

  const remove = useMutation({
    mutationFn: outboundApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound.campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const campaigns = data?.items ?? [];

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    create.mutate({ workspaceId, ...form });
  };

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Outbound</h1>
          <p className="sp-subtitle">Send targeted campaigns to your audience</p>
        </div>
        <div className="sp-header-actions">
          <button className="sp-btn sp-btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New campaign
          </button>
        </div>
      </header>

      <div className="sp-stats">
        <div className="sp-stat-card">
          <span className="sp-stat-label">Total campaigns</span>
          <strong className="sp-stat-value">{(stats as any)?.totalCampaigns ?? 0}</strong>
        </div>
        <div className="sp-stat-card">
          <span className="sp-stat-label">Recipients</span>
          <strong className="sp-stat-value">{(stats as any)?.totalRecipients?.toLocaleString() ?? 0}</strong>
        </div>
        <div className="sp-stat-card">
          <span className="sp-stat-label">Delivered</span>
          <strong className="sp-stat-value">{(stats as any)?.totalDelivered?.toLocaleString() ?? 0}</strong>
        </div>
        <div className="sp-stat-card">
          <span className="sp-stat-label">Opened</span>
          <strong className="sp-stat-value">{(stats as any)?.totalOpened?.toLocaleString() ?? 0}</strong>
        </div>
      </div>

      <div className="sp-card-grid">
        {CAMPAIGN_TYPES.map((ct) => (
          <button key={ct.type} className={`sp-type-card sp-type-card--${ct.tone}`} onClick={() => { setForm({ name: "", type: ct.type, subject: "", body: "", recipientCount: 0 }); setShowCreate(true); }}>
            {ct.icon}
            <h3>{ct.label}</h3>
            <p>{ct.description}</p>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 32 }}>Recent campaigns</h2>

      {showCreate && (
        <div className="sp-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New campaign</h2>
            <div className="sp-form">
              <div className="sp-form-row">
                <label>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spring promotion" />
              </div>
              <div className="sp-form-row">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Campaign["type"] })}>
                  {CAMPAIGN_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </div>
              <div className="sp-form-row">
                <label>Subject</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Email subject line" />
              </div>
              <div className="sp-form-row">
                <label>Body</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Campaign message body" />
              </div>
              <div className="sp-form-row">
                <label>Recipients</label>
                <input type="number" min="0" value={form.recipientCount} onChange={(e) => setForm({ ...form, recipientCount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn--secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="sp-btn sp-btn--primary" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sp-table-wrap">
        {isLoading ? (
          <div className="sp-empty">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="sp-empty">
            <Send size={40} />
            <h3>No campaigns yet</h3>
            <p>Create your first campaign to start reaching customers.</p>
          </div>
        ) : (
          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong>{c.subject && <div className="sp-muted sp-small">{c.subject}</div>}</td>
                  <td><span className="sp-tag sp-tag--neutral">{c.type}</span></td>
                  <td><span className={`sp-tag sp-tag--${c.status}`}>{c.status}</span></td>
                  <td>{c.recipientCount.toLocaleString()}</td>
                  <td>{c.sentCount.toLocaleString()}</td>
                  <td className="sp-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="sp-row-actions">
                      {c.status === "draft" && <button className="sp-btn sp-btn--ghost" onClick={() => send.mutate({ workspaceId, campaignId: c.id })}><Send size={12} /> Send</button>}
                      <button className="sp-icon-btn" onClick={() => { if (confirm(`Delete ${c.name}?`)) remove.mutate({ workspaceId, campaignId: c.id }); }} aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
