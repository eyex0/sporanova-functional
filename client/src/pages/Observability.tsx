import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { observabilityApi, agentsApi } from "@/lib/trpc";
import {
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Database,
  Play,
  Plus,
  ChevronRight,
  BarChart3,
  Zap,
  Target,
  CheckCircle,
  XCircle,
} from "lucide-react";
import "./Observability.css";

type Tab = "traces" | "performance" | "costs" | "evaluations";

export default function Observability() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("traces");
  const [selectedAgent, setSelectedAgent] = useState<number | undefined>();
  const [showNewDataset, setShowNewDataset] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);

  const { data: agents } = useQuery({
    queryKey: ["agents.list", workspaceId],
    queryFn: () => agentsApi.list({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const { data: traces, isLoading: tracesLoading } = useQuery({
    queryKey: ["observability.traces", workspaceId, selectedAgent],
    queryFn: () =>
      observabilityApi.traces({ workspaceId: workspaceId!, agentId: selectedAgent }),
    enabled: !!workspaceId && tab === "traces",
  });

  const { data: perf, isLoading: perfLoading } = useQuery({
    queryKey: ["observability.performance", workspaceId, selectedAgent],
    queryFn: () =>
      observabilityApi.performance({ workspaceId: workspaceId!, agentId: selectedAgent }),
    enabled: !!workspaceId && tab === "performance",
  });

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ["observability.costs", workspaceId],
    queryFn: () => observabilityApi.costs({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && tab === "costs",
  });

  const { data: datasets } = useQuery({
    queryKey: ["observability.datasets", workspaceId],
    queryFn: () => observabilityApi.datasets({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && tab === "evaluations",
  });

  const { data: datasetDetail } = useQuery({
    queryKey: ["observability.datasetDetail", workspaceId, selectedDataset],
    queryFn: () =>
      observabilityApi.datasetDetail({ workspaceId: workspaceId!, datasetId: selectedDataset! }),
    enabled: !!workspaceId && !!selectedDataset,
  });

  const { data: evalRuns } = useQuery({
    queryKey: ["observability.evalRuns", workspaceId],
    queryFn: () => observabilityApi.evalRuns({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && tab === "evaluations",
  });

  const createDataset = useMutation({
    mutationFn: observabilityApi.createDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observability.datasets"] });
      setShowNewDataset(false);
    },
  });

  const agentList = (agents as Array<{ id: number; name: string }> | undefined) ?? [];
  const traceList = (traces as Array<Record<string, unknown>> | undefined) ?? [];
  const datasetList = (datasets as Array<Record<string, unknown>> | undefined) ?? [];
  const evalRunList = (evalRuns as Array<Record<string, unknown>> | undefined) ?? [];

  const perfData = perf as {
    summary: {
      count: number;
      avgLatency: number;
      p50Latency: number;
      p95Latency: number;
      p99Latency: number;
      avgTokens: number;
      totalTokens: number;
    };
    byAgent: Array<{ agentId: number; count: number; avgLatency: number; avgTokens: number }>;
    daily: Array<{ date: string; count: number; avgLatency: number }>;
  } | undefined;

  const costData = costs as {
    byModel: Array<{
      model: string;
      provider: string;
      totalCalls: number;
      totalTokens: number;
      totalCost: string;
    }>;
    daily: Array<{ date: string; cost: string; tokens: number; calls: number }>;
    totals: { totalCost: string; totalTokens: number; totalCalls: number };
  } | undefined;

  return (
    <div className="obs-page">
      <header className="obs-header">
        <div>
          <h1>Observability</h1>
          <p>Traces, performance metrics, cost tracking, and evaluation</p>
        </div>
        <div className="obs-agent-filter">
          <select
            value={selectedAgent ?? ""}
            onChange={(e) => setSelectedAgent(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Agents</option>
            {agentList.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="obs-tabs">
        {([
          ["traces", "Traces", Activity],
          ["performance", "Performance", BarChart3],
          ["costs", "Costs", DollarSign],
          ["evaluations", "Evaluations", Target],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            className={`obs-tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ──── Traces Tab ──── */}
      {tab === "traces" && (
        <div className="obs-content">
          {tracesLoading ? (
            <div className="loading-spinner" />
          ) : traceList.length === 0 ? (
            <div className="obs-empty">
              <Activity size={40} />
              <p>No traces yet</p>
              <span>Traces are recorded automatically when agents execute</span>
            </div>
          ) : (
            <div className="traces-table">
              <div className="traces-header">
                <span className="col-name">Name</span>
                <span className="col-status">Status</span>
                <span className="col-duration">Duration</span>
                <span className="col-tokens">Tokens</span>
                <span className="col-cost">Cost</span>
                <span className="col-time">Time</span>
              </div>
              {traceList.map((t) => (
                <div className="traces-row" key={t.id as number}>
                  <span className="col-name">
                    <Zap size={14} className="trace-icon" />
                    {(t.name as string) ?? "trace"}
                  </span>
                  <span className={`col-status status-${t.status}`}>
                    {t.status === "ok" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {t.status}
                  </span>
                  <span className="col-duration">
                    <Clock size={12} /> {t.durationMs ? `${t.durationMs}ms` : "—"}
                  </span>
                  <span className="col-tokens">{(t.totalTokens as number)?.toLocaleString() ?? "—"}</span>
                  <span className="col-cost">
                    {t.estimatedCost ? `$${Number(t.estimatedCost).toFixed(4)}` : "—"}
                  </span>
                  <span className="col-time">
                    {t.createdAt ? new Date(t.createdAt as string).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── Performance Tab ──── */}
      {tab === "performance" && (
        <div className="obs-content">
          {perfLoading ? (
            <div className="loading-spinner" />
          ) : (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon blue"><Activity size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{perfData?.summary.count ?? 0}</span>
                    <span className="metric-label">Total Runs</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon green"><Clock size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{perfData?.summary.avgLatency ?? 0}ms</span>
                    <span className="metric-label">Avg Latency</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon orange"><TrendingUp size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{perfData?.summary.p95Latency ?? 0}ms</span>
                    <span className="metric-label">P95 Latency</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon purple"><Zap size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{(perfData?.summary.avgTokens ?? 0).toLocaleString()}</span>
                    <span className="metric-label">Avg Tokens</span>
                  </div>
                </div>
              </div>

              {perfData?.byAgent && perfData.byAgent.length > 0 && (
                <div className="section-card">
                  <h3>By Agent</h3>
                  <div className="agent-perf-list">
                    {perfData.byAgent.map((a) => {
                      const agent = agentList.find((ag) => ag.id === a.agentId);
                      return (
                        <div className="agent-perf-row" key={a.agentId}>
                          <span className="agent-name">{agent?.name ?? `Agent #${a.agentId}`}</span>
                          <span className="agent-count">{a.count} runs</span>
                          <span className="agent-latency">{a.avgLatency}ms avg</span>
                          <span className="agent-tokens">{a.avgTokens.toLocaleString()} tokens</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ──── Costs Tab ──── */}
      {tab === "costs" && (
        <div className="obs-content">
          {costsLoading ? (
            <div className="loading-spinner" />
          ) : (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon green"><DollarSign size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">${Number(costData?.totals.totalCost ?? 0).toFixed(2)}</span>
                    <span className="metric-label">Total Cost (30d)</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon blue"><Zap size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{(costData?.totals.totalTokens ?? 0).toLocaleString()}</span>
                    <span className="metric-label">Total Tokens</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon purple"><Activity size={20} /></div>
                  <div className="metric-body">
                    <span className="metric-value">{costData?.totals.totalCalls ?? 0}</span>
                    <span className="metric-label">Total Calls</span>
                  </div>
                </div>
              </div>

              {costData?.byModel && costData.byModel.length > 0 && (
                <div className="section-card">
                  <h3>Cost by Model</h3>
                  <div className="cost-model-list">
                    {costData.byModel.map((m, i) => (
                      <div className="cost-model-row" key={i}>
                        <span className="cost-model-name">{m.model}</span>
                        <span className="cost-model-provider">{m.provider}</span>
                        <span className="cost-model-calls">{m.totalCalls} calls</span>
                        <span className="cost-model-tokens">{m.totalTokens.toLocaleString()} tokens</span>
                        <span className="cost-model-cost">${Number(m.totalCost).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ──── Evaluations Tab ──── */}
      {tab === "evaluations" && (
        <div className="obs-content">
          <div className="eval-header">
            <h2>Datasets</h2>
            <button className="btn-primary" onClick={() => setShowNewDataset(true)}>
              <Plus size={14} /> New Dataset
            </button>
          </div>

          {datasetList.length === 0 ? (
            <div className="obs-empty">
              <Database size={40} />
              <p>No evaluation datasets</p>
              <span>Create a dataset with test cases to evaluate agent quality</span>
            </div>
          ) : (
            <div className="eval-grid">
              {datasetList.map((ds) => (
                <div
                  className={`eval-card ${selectedDataset === ds.id ? "selected" : ""}`}
                  key={ds.id as number}
                  onClick={() => setSelectedDataset(ds.id as number)}
                >
                  <div className="eval-card-header">
                    <Database size={18} />
                    <h4>{ds.name as string}</h4>
                  </div>
                  <p className="eval-card-desc">{(ds.description as string) ?? "No description"}</p>
                  <div className="eval-card-meta">
                    <span>{ds.testCaseCount as number} test cases</span>
                    <span>{new Date(ds.createdAt as string).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {evalRunList.length > 0 && (
            <div className="section-card" style={{ marginTop: 24 }}>
              <h3>Recent Evaluation Runs</h3>
              <div className="eval-runs-list">
                {evalRunList.map((r) => (
                  <div className="eval-run-row" key={r.id as number}>
                    <span className="eval-run-name">{(r.name as string) ?? `Run #${r.id}`}</span>
                    <span className={`eval-run-status status-${r.status}`}>
                      {r.status as string}
                    </span>
                    <span className="eval-run-score">
                      Score: {r.avgScore ? `${(Number(r.avgScore) * 100).toFixed(1)}%` : "—"}
                    </span>
                    <span className="eval-run-cases">
                      {r.passedCases as number}/{r.totalCases as number} passed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Dataset Modal */}
      {showNewDataset && (
        <div className="modal-overlay" onClick={() => setShowNewDataset(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Evaluation Dataset</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = new FormData(form);
                createDataset.mutate({
                  workspaceId: workspaceId!,
                  name: data.get("name") as string,
                  description: (data.get("description") as string) || undefined,
                });
              }}
            >
              <label>
                Name
                <input required name="name" placeholder="e.g. Customer Support Test Set" />
              </label>
              <label>
                Description
                <textarea name="description" placeholder="What does this dataset test?" />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNewDataset(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createDataset.isPending}>
                  {createDataset.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
