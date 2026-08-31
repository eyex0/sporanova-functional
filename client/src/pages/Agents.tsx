import { useState } from "react";
import { Link } from "react-router";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Bot, Plus, Play, Settings, X } from "lucide-react";
import "./Agents.css";

export default function Agents() {
  const { workspaceId } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "idle" | "paused">("all");
  const [newAgent, setNewAgent] = useState({ name: "", purpose: "", description: "" });

  const agents = trpc.agents.list.useQuery({ workspaceId: workspaceId ?? 0 }, { enabled: Boolean(workspaceId) });
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      agents.refetch();
      setShowCreate(false);
      setNewAgent({ name: "", purpose: "", description: "" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    createAgent.mutate({
      workspaceId,
      name: newAgent.name,
      purpose: newAgent.purpose,
      description: newAgent.description || undefined,
      capabilities: [],
    });
  };

  const agentList = agents.data ?? [];
  const filtered = filter === "all" ? agentList : agentList.filter((a: any) => a.status === filter);

  return (
    <div className="agents-page">
      <header className="page-header">
        <div>
          <h1>Agents</h1>
          <p>Create and manage your AI agents</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Agent
        </button>
      </header>

      <div className="agents-filter-bar">
        {(["all", "active", "idle", "paused"] as const).map((f) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {agents.isLoading ? (
        <div className="loading-spinner" />
      ) : filtered.length === 0 ? (
        <div className="agents-empty">
          <Bot size={48} />
          <p>No agents found</p>
        </div>
      ) : (
        <div className="agents-grid">
          {filtered.map((agent: any) => (
            <div className="agent-card" key={agent.id}>
              <div className="agent-card-header">
                <div className="agent-icon">
                  <Bot size={20} />
                </div>
                <div>
                  <h3>{agent.name}</h3>
                  <span className={`status-badge ${agent.status || "active"}`}>
                    {agent.status || "active"}
                  </span>
                </div>
              </div>
              <p className="agent-purpose">{agent.purpose}</p>
              {agent.description && <p className="agent-desc">{agent.description}</p>}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="agent-capabilities">
                  {agent.capabilities.map((cap: string) => (
                    <span className="cap-tag" key={cap}>{cap}</span>
                  ))}
                </div>
              )}
              <div className="agent-card-actions">
                <Link to="/dashboard/playground" className="btn-run" style={{ textDecoration: "none" }}>
                  <Play size={14} />
                  Run
                </Link>
                <Link to="/dashboard/playground" className="btn-configure" style={{ textDecoration: "none" }}>
                  <Settings size={14} />
                  Configure
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Agent</h2>
            <form onSubmit={handleCreate}>
              <label>
                Name
                <input
                  required
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </label>
              <label>
                Purpose
                <textarea
                  required
                  value={newAgent.purpose}
                  onChange={(e) => setNewAgent({ ...newAgent, purpose: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createAgent.isPending}>
                  {createAgent.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
