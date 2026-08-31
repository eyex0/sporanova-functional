import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi } from "@/lib/trpc";
import { Search, Plus, Upload, Download, MoreHorizontal, Trash2, Mail, Phone, Building } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  source: string;
  tags: string[];
  createdAt: string;
};

export default function Contacts() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", jobTitle: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["contacts.list", workspaceId, search],
    queryFn: () => contactsApi.list({ workspaceId: workspaceId!, search: search || undefined }) as Promise<{ items: Contact[]; total: number }>,
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts.list"] });
      toast.success("Contact added");
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", company: "", jobTitle: "" });
    },
    onError: () => toast.error("Failed to add contact"),
  });

  const remove = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts.list"] });
      toast.success("Contact deleted");
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  const handleExport = async () => {
    try {
      const result = await contactsApi.export({ workspaceId: workspaceId! }) as { csv: string; count: number };
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} contacts`);
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

  const contacts = data?.items ?? [];

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Contacts</h1>
          <p className="sp-subtitle">{data?.total ?? 0} contact{(data?.total ?? 0) !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <div className="sp-header-actions">
          <button className="sp-btn sp-btn--secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button className="sp-btn sp-btn--secondary" onClick={() => toast.info("CSV import coming soon")}>
            <Upload size={14} /> Import
          </button>
          <button className="sp-btn sp-btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add contact
          </button>
        </div>
      </header>

      <div className="sp-search-bar">
        <Search size={16} />
        <input placeholder="Search by name, email, or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showAdd && (
        <div className="sp-modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add contact</h2>
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
                <label>Job title</label>
                <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="VP of Engineering" />
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="sp-btn sp-btn--primary" onClick={handleAdd} disabled={create.isPending}>
                {create.isPending ? "Adding..." : "Add contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sp-table-wrap">
        {isLoading ? (
          <div className="sp-empty">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="sp-empty">
            <Building size={40} />
            <h3>No contacts yet</h3>
            <p>Add your first contact to start building your customer database.</p>
            <button className="sp-btn sp-btn--primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add your first contact
            </button>
          </div>
        ) : (
          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email ? <><Mail size={12} /> {c.email}</> : <span className="sp-muted">—</span>}</td>
                  <td>{c.phone ? <><Phone size={12} /> {c.phone}</> : <span className="sp-muted">—</span>}</td>
                  <td>{c.company ?? <span className="sp-muted">—</span>}</td>
                  <td><span className={`sp-tag sp-tag--${c.status}`}>{c.status}</span></td>
                  <td className="sp-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="sp-icon-btn" onClick={() => { if (confirm(`Delete ${c.name}?`)) remove.mutate({ workspaceId, contactId: c.id }); }} aria-label="Delete contact">
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
