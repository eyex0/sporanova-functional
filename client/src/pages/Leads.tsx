import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { leadsApi } from "@/lib/trpc";
import { Search, Plus, Download, Trash2, ArrowRight, Target, Mail, Phone, Building } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  value: number;
  notes: string | null;
  createdAt: string;
};

const STATUSES: Array<Lead["status"]> = ["new", "contacted", "qualified", "converted", "lost"];

export default function Leads() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | Lead["status"]>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "manual", value: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["leads.list", workspaceId, search, activeStatus],
    queryFn: () => leadsApi.list({ workspaceId: workspaceId!, search: search || undefined, status: activeStatus === "all" ? undefined : activeStatus }) as Promise<{ items: Lead[]; total: number }>,
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads.list"] });
      toast.success("Lead created");
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", company: "", source: "manual", value: 0 });
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const update = useMutation({
    mutationFn: leadsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads.list"] });
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const remove = useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads.list"] });
      toast.success("Lead deleted");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const convert = useMutation({
    mutationFn: leadsApi.convert,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["leads.list"] });
      toast.success(`Converted to contact #${result.contactId}`);
    },
    onError: () => toast.error("Failed to convert lead"),
  });

  const handleExport = async () => {
    try {
      const result = await leadsApi.export({ workspaceId: workspaceId! }) as { csv: string; count: number };
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} leads`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    create.mutate({ workspaceId, ...form });
  };

  const handleStatusChange = (lead: Lead, newStatus: Lead["status"]) => {
    if (newStatus === "converted") {
      convert.mutate({ workspaceId, leadId: lead.id });
      return;
    }
    update.mutate({ workspaceId, leadId: lead.id, status: newStatus });
  };

  const leads = data?.items ?? [];

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Leads</h1>
          <p className="sp-subtitle">{data?.total ?? 0} lead{(data?.total ?? 0) !== 1 ? "s" : ""} in your pipeline</p>
        </div>
        <div className="sp-header-actions">
          <button className="sp-btn sp-btn--secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button className="sp-btn sp-btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add lead
          </button>
        </div>
      </header>

      <div className="sp-tabs">
        <button className={activeStatus === "all" ? "active" : ""} onClick={() => setActiveStatus("all")}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={activeStatus === s ? "active" : ""} onClick={() => setActiveStatus(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="sp-search-bar">
        <Search size={16} />
        <input placeholder="Search by name, email, or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showAdd && (
        <div className="sp-modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add lead</h2>
            <div className="sp-form">
              <div className="sp-form-row">
                <label>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="sp-form-row">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
              </div>
              <div className="sp-form-row">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </div>
              <div className="sp-form-row">
                <label>Company</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
              </div>
              <div className="sp-form-row">
                <label>Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="campaign">Campaign</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div className="sp-form-row">
                <label>Estimated value (USD)</label>
                <input type="number" min="0" step="100" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="sp-btn sp-btn--primary" onClick={handleAdd} disabled={create.isPending}>
                {create.isPending ? "Adding..." : "Add lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sp-table-wrap">
        {isLoading ? (
          <div className="sp-empty">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="sp-empty">
            <Target size={40} />
            <h3>No leads yet</h3>
            <p>Start building your pipeline by adding your first lead.</p>
            <button className="sp-btn sp-btn--primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add your first lead
            </button>
          </div>
        ) : (
          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td><strong>{lead.name}</strong></td>
                  <td>{lead.email ?? <span className="sp-muted">—</span>}</td>
                  <td>{lead.company ?? <span className="sp-muted">—</span>}</td>
                  <td>${lead.value.toLocaleString()}</td>
                  <td>
                    <select className={`sp-status-select sp-status-select--${lead.status}`} value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value as Lead["status"])}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td>
                    {lead.status !== "converted" && (
                      <button className="sp-btn sp-btn--ghost" onClick={() => handleStatusChange(lead, "converted")}>
                        Convert <ArrowRight size={12} />
                      </button>
                    )}
                  </td>
                  <td>
                    <button className="sp-icon-btn" onClick={() => { if (confirm(`Delete lead ${lead.name}?`)) remove.mutate({ workspaceId, leadId: lead.id }); }} aria-label="Delete lead">
                      <Trash2 size={14} />
                    </button>
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
