import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/trpc";
import {
  Bot,
  Plus,
  Play,
  Pause,
  PlayCircle,
  MoreHorizontal,
  Trash2,
  Settings,
  ArrowRight,
} from "lucide-react";
import "./Agents.css";

type AgentStatus = "active" | "idle" | "paused" | "error";

interface Agent {
  id: string;
  name: string;
  purpose: string;
  description?: string;
  status: AgentStatus;
  capabilities?: string[];
}

export default function Agents() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | AgentStatus>("all");
  const [newAgent, setNewAgent] = useState({
    name: "",
    purpose: "",
    description: "",
    capabilities: "",
  });

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents.list", workspaceId],
    queryFn: () => agentsApi.list({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const createAgent = useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents.list"] });
      setShowCreate(false);
      setNewAgent({ name: "", purpose: "", description: "", capabilities: "" });
    },
  });

  const runAgent = useMutation({
    mutationFn: agentsApi.runNow,
  });

  if (!workspaceId) {
    return (
      <div className="agents-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const agentList: Agent[] = (agents as Agent[] | undefined) ?? [];
  const filtered = filter === "all" ? agentList : agentList.filter((a) => a.status === filter);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAgent.mutate({
      workspaceId,
      name: newAgent.name,
      purpose: newAgent.purpose,
      description: newAgent.description || undefined,
      capabilities: newAgent.capabilities
        ? newAgent.capabilities.split(",").map((c) => c.trim()).filter(Boolean)
        : [],
    });
  };

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
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-spinner" />
      ) : filtered.length === 0 ? (
        <div className="agents-empty">
          <Bot size={48} />
          <p>No agents found</p>
        </div>
      ) : (
        <div className="agents-grid">
          {filtered.map((agent) => (
            <div className="agent-card" key={agent.id}>
              <div className="agent-card-header">
                <div className="agent-icon">
                  <Bot size={20} />
                </div>
                <div>
                  <h3>{agent.name}</h3>
                  <span className={`status-badge ${agent.status}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
              <p className="agent-purpose">{agent.purpose}</p>
              {agent.description && (
                <p className="agent-desc">{agent.description}</p>
              )}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="agent-capabilities">
                  {agent.capabilities.map((cap) => (
                    <span className="cap-tag" key={cap}>
                      {cap}
                    </span>
                  ))}
                </div>
              )}
              <div className="agent-card-actions">
                <button
                  className="btn-run"
                  onClick={() =>
                    runAgent.mutate({
                      workspaceId,
                      agentId: agent.id,
                      instruction: "Run now",
                    })
                  }
                >
                  <Play size={14} />
                  Run
                </button>
                <button className="btn-configure">
                  <Settings size={14} />
                  Configure
                </button>
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
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                />
              </label>
              <label>
                Purpose
                <textarea
                  required
                  value={newAgent.purpose}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, purpose: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                />
              </label>
              <label>
                Capabilities (comma separated)
                <input
                  value={newAgent.capabilities}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, capabilities: e.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createAgent.isPending}
                >
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
