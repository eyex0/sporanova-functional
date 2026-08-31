import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { helpdeskApi } from "@/lib/trpc";
import { Plus, Search, Send, Inbox, AtSign, ListChecks, UserCheck, X, Clock } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

type Ticket = {
  id: number;
  ticketNumber: number;
  subject: string;
  description: string;
  status: "new" | "open" | "pending" | "on_hold" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  source: string;
  requesterEmail: string | null;
  requesterName: string | null;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
};

type TicketMessage = {
  id: number;
  ticketId: number;
  authorUserId: number | null;
  authorName: string | null;
  role: "customer" | "agent" | "system" | "note";
  content: string;
  createdAt: string;
};

export default function Helpdesk() {
  const { workspaceId, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeInbox, setActiveInbox] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", requesterName: "", requesterEmail: "", priority: "normal" as Ticket["priority"] });

  const { data: inboxes } = useQuery({
    queryKey: ["helpdesk.inboxes", workspaceId],
    queryFn: () => helpdeskApi.listInboxes({ workspaceId: workspaceId! }) as Promise<{ inboxes: { key: string; label: string; count: number }[] }>,
    enabled: !!workspaceId,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["helpdesk.tickets", workspaceId, activeInbox, search],
    queryFn: () => {
      const status = ["new", "open", "pending", "on_hold", "resolved", "closed"].includes(activeInbox) ? activeInbox : undefined;
      return helpdeskApi.listTickets({ workspaceId: workspaceId!, status, search: search || undefined }) as Promise<{ items: Ticket[]; total: number }>;
    },
    enabled: !!workspaceId,
  });

  const { data: messages } = useQuery({
    queryKey: ["helpdesk.messages", workspaceId, selectedTicketId],
    queryFn: () => helpdeskApi.listMessages({ workspaceId: workspaceId!, ticketId: selectedTicketId! }) as Promise<TicketMessage[]>,
    enabled: !!selectedTicketId,
  });

  const create = useMutation({
    mutationFn: helpdeskApi.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk.tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk.inboxes"] });
      toast.success("Ticket created");
      setShowCreate(false);
      setForm({ subject: "", description: "", requesterName: "", requesterEmail: "", priority: "normal" });
    },
    onError: () => toast.error("Failed to create ticket"),
  });

  const updateTicket = useMutation({
    mutationFn: helpdeskApi.updateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk.tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk.inboxes"] });
    },
    onError: () => toast.error("Failed to update ticket"),
  });

  const addMessage = useMutation({
    mutationFn: helpdeskApi.addMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk.messages"] });
      setReplyText("");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  const handleCreate = () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    create.mutate({ workspaceId, ...form, initialMessage: form.description });
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedTicketId) return;
    addMessage.mutate({ workspaceId, ticketId: selectedTicketId, content: replyText, role: "agent" });
  };

  const handleStatusChange = (ticketId: number, status: Ticket["status"]) => {
    updateTicket.mutate({ workspaceId, ticketId, status });
    if (status === "resolved" || status === "closed") toast.success(`Ticket ${status}`);
  };

  const handleAssignToMe = (ticketId: number) => {
    updateTicket.mutate({ workspaceId, ticketId, assigneeId: user?.id });
    toast.success("Assigned to you");
  };

  const ticketList = tickets?.items ?? [];
  const selectedTicket = ticketList.find(t => t.id === selectedTicketId) ?? null;
  const inboxItems = inboxes?.inboxes ?? [];

  return (
    <div className="helpdesk-page">
      <aside className="helpdesk-sidebar">
        <div className="helpdesk-sidebar-header">
          <h2>Helpdesk</h2>
          <button className="sp-btn sp-btn--primary sp-btn--small" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New
          </button>
        </div>
        <nav className="helpdesk-inboxes">
          {inboxItems.map((inbox) => (
            <button key={inbox.key} className={`helpdesk-inbox-item ${activeInbox === inbox.key ? "active" : ""}`} onClick={() => setActiveInbox(inbox.key)}>
              <Inbox size={14} />
              <span>{inbox.label}</span>
              <span className="helpdesk-count">{inbox.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="helpdesk-main">
        <div className="helpdesk-toolbar">
          <div className="sp-search-bar helpdesk-search">
            <Search size={16} />
            <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="helpdesk-tickets">
          {isLoading ? (
            <div className="sp-empty">Loading tickets...</div>
          ) : ticketList.length === 0 ? (
            <div className="sp-empty">
              <Inbox size={40} />
              <h3>No tickets in this view</h3>
              <p>Tickets will appear here as customers reach out.</p>
            </div>
          ) : (
            ticketList.map((ticket) => (
              <div key={ticket.id} className={`helpdesk-ticket-row ${selectedTicketId === ticket.id ? "selected" : ""}`} onClick={() => setSelectedTicketId(ticket.id)}>
                <div className="helpdesk-ticket-head">
                  <span className="helpdesk-ticket-num">#{ticket.ticketNumber}</span>
                  <span className={`sp-tag sp-tag--${ticket.status}`}>{ticket.status.replace("_", " ")}</span>
                  <span className={`sp-tag sp-tag--priority-${ticket.priority}`}>{ticket.priority}</span>
                </div>
                <h4>{ticket.subject}</h4>
                <p>{ticket.description.slice(0, 120)}{ticket.description.length > 120 ? "..." : ""}</p>
                <div className="helpdesk-ticket-meta">
                  <span>{ticket.requesterName || ticket.requesterEmail || "Anonymous"}</span>
                  <span><Clock size={11} /> {new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {selectedTicket && (
        <aside className="helpdesk-detail">
          <div className="helpdesk-detail-head">
            <div>
              <h3>#{selectedTicket.ticketNumber} — {selectedTicket.subject}</h3>
              <div className="helpdesk-detail-meta">
                <span className={`sp-tag sp-tag--${selectedTicket.status}`}>{selectedTicket.status.replace("_", " ")}</span>
                <span className={`sp-tag sp-tag--priority-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
                <span>From: {selectedTicket.requesterName || selectedTicket.requesterEmail || "Anonymous"}</span>
              </div>
            </div>
            <button className="sp-icon-btn" onClick={() => setSelectedTicketId(null)} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="helpdesk-actions">
            {!selectedTicket.assigneeId && (
              <button className="sp-btn sp-btn--secondary" onClick={() => handleAssignToMe(selectedTicket.id)}>
                <UserCheck size={12} /> Assign to me
              </button>
            )}
            {selectedTicket.status === "new" && <button className="sp-btn sp-btn--secondary" onClick={() => handleStatusChange(selectedTicket.id, "open")}>Open</button>}
            {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
              <button className="sp-btn sp-btn--primary" onClick={() => handleStatusChange(selectedTicket.id, "resolved")}>Mark resolved</button>
            )}
            {selectedTicket.status === "resolved" && <button className="sp-btn sp-btn--secondary" onClick={() => handleStatusChange(selectedTicket.id, "closed")}>Close</button>}
          </div>

          <div className="helpdesk-thread">
            {messages?.map((msg) => (
              <div key={msg.id} className={`helpdesk-message helpdesk-message--${msg.role}`}>
                <div className="helpdesk-message-head">
                  <strong>{msg.authorName || (msg.role === "agent" ? "Agent" : "Customer")}</strong>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>

          {selectedTicket.status !== "closed" && (
            <div className="helpdesk-reply">
              <textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(); }}
              />
              <button className="sp-btn sp-btn--primary" onClick={handleReply} disabled={!replyText.trim() || addMessage.isPending}>
                <Send size={14} /> Send reply
              </button>
            </div>
          )}
        </aside>
      )}

      {showCreate && (
        <div className="sp-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New ticket</h2>
            <div className="sp-form">
              <div className="sp-form-row">
                <label>Subject *</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary" />
              </div>
              <div className="sp-form-row">
                <label>Description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe the issue" />
              </div>
              <div className="sp-form-row">
                <label>Requester name</label>
                <input value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="sp-form-row">
                <label>Requester email</label>
                <input type="email" value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} placeholder="jane@example.com" />
              </div>
              <div className="sp-form-row">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Ticket["priority"] })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn--secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="sp-btn sp-btn--primary" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
