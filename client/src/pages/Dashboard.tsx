import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, agentsApi } from "@/lib/trpc";
import { TrendingUp, Bot, Database, Lightbulb, Clock, ArrowUpRight, Activity } from "lucide-react";
import { Link } from "wouter";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, workspaceId } = useAuth();
  const [range, setRange] = useState("7D");

  const { data: overview, isLoading } = useQuery({
    queryKey: ["dashboard.overview", workspaceId, range],
    queryFn: () => dashboardApi.overview({ workspaceId: workspaceId!, range }),
    enabled: !!workspaceId,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents.list", workspaceId],
    queryFn: () => agentsApi.list({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  if (!workspaceId || isLoading) {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const kpis = overview?.kpis as { activeAgents: number; dataSources: number; insightsToday: number; revenue: number } | undefined;
  const activity = (overview?.activity || []) as Array<{ id: number; action: string; createdAt: string | Date }>;
  const signals = (overview?.signals || []) as Array<{ id: number; title: string; insightType: string; status: string }>;

  const kpiCards = [
    { label: "Active Agents", value: kpis?.activeAgents ?? 0, icon: <Bot size={18} />, color: "#3B82F6" },
    { label: "Data Sources", value: kpis?.dataSources ?? 0, icon: <Database size={18} />, color: "#10B981" },
    { label: "Insights Today", value: kpis?.insightsToday ?? 0, icon: <Lightbulb size={18} />, color: "#F59E0B" },
    { label: "Revenue", value: `$${(kpis?.revenue ?? 0).toLocaleString()}`, icon: <TrendingUp size={18} />, color: "#8B5CF6" },
  ];

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7D">7D</option>
          <option value="30D">30D</option>
          <option value="90D">90D</option>
          <option value="1Y">1Y</option>
        </select>
      </header>

      <section className="kpi-grid">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}14`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-content">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-value">{kpi.value}</span>
            </div>
            <ArrowUpRight size={14} className="kpi-arrow" />
          </div>
        ))}
      </section>

      <div className="dashboard-grid-2col">
        <section className="card">
          <h2>Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="empty-text">No recent activity.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="activity-item">
                <Clock size={14} />
                <span>{item.action}</span>
                <time>{new Date(item.createdAt).toLocaleDateString()}</time>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <h2>Open Signals</h2>
          {signals.length === 0 ? (
            <p className="empty-text">No open signals.</p>
          ) : (
            signals.map((signal) => (
              <div key={signal.id} className="signal-item">
                <Lightbulb size={14} />
                <span>{signal.title || signal.insightType}</span>
                <span className={`signal-status ${signal.status}`}>{signal.status}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="card">
        <h2>
          <Activity size={16} />
          Active Agents
        </h2>
        <div className="agents-grid">
          {agents?.map((agent: { id: number; name: string; purpose?: string; status: string }) => (
            <Link key={agent.id} href="/dashboard/agents">
              <div className="agent-mini-card">
                <Bot size={18} />
                <h3>{agent.name}</h3>
                <p>{agent.purpose}</p>
                <span className={`status-badge ${agent.status}`}>{agent.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
