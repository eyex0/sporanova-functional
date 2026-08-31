import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Plus, MoreHorizontal } from "lucide-react";
import { agentsApi } from "@/lib/trpc";
import "./Backstage.css";

type Agent = {
  id: number;
  name: string;
  description?: string | null;
  purpose: string;
  status: string;
  createdAt: string;
};

export default function Backstage() {
  const { workspaceId } = useAuth();
  const [, setLocation] = useLocation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    agentsApi.list({ workspaceId }).then((res) => {
      const data = res as unknown as Agent[];
      setAgents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="agents-page">
      <header className="agents-header">
        <h1>Agents</h1>
        <button className="agents-new-btn">
          <Plus size={16} />
          New AI agent
        </button>
      </header>

      <div className="agents-grid">
        {loading ? (
          <div className="agents-empty">
            <p>Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="agents-empty">
            <p>No agents yet. Create your first AI agent.</p>
            <button className="agents-new-btn" onClick={() => setLocation("/dashboard/playground")}>
              <Plus size={16} />
              Create agent
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="agent-card"
              onClick={() => setLocation("/dashboard/playground")}
            >
              <div className="agent-card-preview">
                <div className="agent-card-widget">
                  <div className="agent-widget-header">
                    <span className="agent-widget-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </span>
                    <span className="agent-widget-name">{agent.name}</span>
                  </div>
                  <div className="agent-widget-msgs">
                    <div className="agent-msg-fake agent-msg-customer" />
                    <div className="agent-msg-fake agent-msg-bot" />
                  </div>
                </div>
              </div>
              <div className="agent-card-info">
                <div className="agent-card-text">
                  <h3>{agent.name}</h3>
                  <p>Last trained 2 days ago</p>
                </div>
                <button className="agent-card-menu" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
