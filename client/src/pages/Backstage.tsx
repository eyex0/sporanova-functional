import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Plus, MoreHorizontal, Bot, Pause, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/trpc";
import { toast } from "sonner";
import "./Backstage.css";

type Agent = {
  id: number;
  name: string;
  description?: string | null;
  purpose: string;
  status: string;
  createdAt: string;
  lastActivityAt?: string | null;
};

export default function Backstage() {
  const { workspaceId } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agents.list", workspaceId],
    queryFn: async () => {
      const result = await agentsApi.list({ workspaceId: workspaceId! });
      const items = (result as any)?.items ?? (Array.isArray(result) ? result : []);
      return items as Agent[];
    },
    enabled: !!workspaceId,
  });

  const setStatus = useMutation({
    mutationFn: agentsApi.setStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents.list"] });
      toast.success("Agent status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const createAgent = useMutation({
    mutationFn: agentsApi.create,
    onSuccess: (agent: any) => {
      queryClient.invalidateQueries({ queryKey: ["agents.list"] });
      toast.success("Agent created");
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      if (agent?.id) setLocation(`/dashboard/playground?agentId=${agent.id}`);
    },
    onError: () => toast.error("Failed to create agent"),
  });

  const deleteAgent = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents.list"] });
      toast.success("Agent deleted");
      setConfirmDelete(null);
    },
    onError: () => toast.error("Failed to delete agent"),
  });

  const handleNewAgent = () => {
    setShowCreate(true);
    setNewName("");
    setNewDescription("");
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createAgent.mutate({
      workspaceId,
      name: newName.trim(),
      purpose: "You are a helpful AI assistant for customer support.",
      description: newDescription.trim() || "General purpose support agent",
    });
  };

  const handleToggleStatus = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = agent.status === "active" ? "paused" : "active";
    setStatus.mutate({ workspaceId, agentId: agent.id, status: next });
  };

  const handleConfirmDelete = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(agent);
  };

  const agents = data ?? [];

  return (
    <div className="agents-page">
      <header className="agents-header">
        <div>
          <h1>Agents</h1>
          <p className="agents-subtitle">Build and manage your AI workforce</p>
        </div>
        <button className="agents-new-btn" onClick={handleNewAgent}>
          <Plus size={16} />
          New AI agent
        </button>
      </header>

      <div className="agents-grid">
        {isLoading ? (
          <div className="agents-empty"><p>Loading agents...</p></div>
        ) : agents.length === 0 ? (
          <div className="agents-empty">
            <Bot size={48} />
            <h3>No agents yet</h3>
            <p>Create your first AI agent to get started.</p>
            <button className="agents-new-btn" onClick={handleNewAgent}>
              <Plus size={16} />
              Create your first agent
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="agent-card" onClick={() => setLocation(`/dashboard/playground?agentId=${agent.id}`)}>
              <div className="agent-card-preview">
                <div className="agent-card-widget">
                  <div className="agent-widget-header">
                    <span className="agent-widget-icon">
                      <Bot size={14} />
                    </span>
                    <span className="agent-widget-name">{agent.name}</span>
                  </div>
                  <div className="agent-widget-msgs">
                    <div className="agent-msg-fake agent-msg-customer" />
                    <div className="agent-msg-fake agent-msg-bot" />
                    <div className="agent-msg-fake agent-msg-customer" />
                  </div>
                </div>
                <span className={`agent-status-pill agent-status-pill--${agent.status}`}>
                  {agent.status}
                </span>
              </div>
              <div className="agent-card-info">
                <div className="agent-card-text">
                  <h3>{agent.name}</h3>
                  <p>{agent.description || agent.purpose.slice(0, 60) + (agent.purpose.length > 60 ? "..." : "")}</p>
                </div>
                <div className="agent-card-actions">
                  <button
                    className="agent-card-action"
                    onClick={(e) => handleToggleStatus(agent, e)}
                    title={agent.status === "active" ? "Pause agent" : "Activate agent"}
                    aria-label={agent.status === "active" ? "Pause agent" : "Activate agent"}
                  >
                    {agent.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button className="agent-card-action" onClick={(e) => handleConfirmDelete(agent, e)} aria-label="Delete agent" title="Delete agent">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => !createAgent.isPending && setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New AI agent</h2>
            <p className="modal-subtitle">You can refine the instructions after creating the agent.</p>
            <form onSubmit={handleSubmitCreate}>
              <label>
                Name
                <input
                  required
                  autoFocus
                  minLength={2}
                  maxLength={160}
                  placeholder="e.g. Support agent"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label>
                Description <span className="modal-optional">(optional)</span>
                <textarea
                  maxLength={400}
                  placeholder="What does this agent do?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreate(false)}
                  disabled={createAgent.isPending}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createAgent.isPending}>
                  {createAgent.isPending ? "Creating..." : "Create agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deleteAgent.isPending && setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete agent?</h2>
            <p>
              This will permanently delete <strong>{confirmDelete.name}</strong>. Any active channels pointing to it
              will stop responding. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteAgent.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => deleteAgent.mutate({ workspaceId, agentId: confirmDelete.id })}
                disabled={deleteAgent.isPending}
              >
                {deleteAgent.isPending ? "Deleting..." : "Delete agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
