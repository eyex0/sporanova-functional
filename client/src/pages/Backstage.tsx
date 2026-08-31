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
      if (agent?.id) setLocation(`/dashboard/playground?agentId=${agent.id}`);
    },
    onError: () => toast.error("Failed to create agent"),
  });

  const handleNewAgent = () => {
    const name = prompt("Agent name");
    if (!name) return;
    createAgent.mutate({
      workspaceId,
      name,
      purpose: "You are a helpful AI assistant for customer support.",
      description: "General purpose support agent",
      status: "idle",
    });
  };

  const handleToggleStatus = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = agent.status === "active" ? "paused" : "active";
    setStatus.mutate({ workspaceId, agentId: agent.id, status: next });
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
                  <button className="agent-card-action" onClick={(e) => e.stopPropagation()} aria-label="More options">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
