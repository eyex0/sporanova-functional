import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataSourcesApi } from "@/lib/trpc";
import {
  Database,
  Plus,
  RefreshCw,
  Unplug,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "./DataSources.css";

type SourceType = "API" | "Database" | "File" | "Webhook";
type SourceStatus = "connected" | "syncing" | "failed" | "disconnected";

interface DataSource {
  id: number;
  name: string;
  type: SourceType;
  status: SourceStatus;
  lastSyncedAt: string | null;
  configured: boolean;
}

const SOURCE_TYPES: SourceType[] = ["API", "Database", "File", "Webhook"];

const TYPE_COLORS: Record<SourceType, string> = {
  API: "type-api",
  Database: "type-database",
  File: "type-file",
  Webhook: "type-webhook",
};

export default function DataSources() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [configureSource, setConfigureSource] = useState<DataSource | null>(null);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "API" as SourceType,
  });
  const [endpoint, setEndpoint] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);

  const { data: sources, isLoading } = useQuery({
    queryKey: ["dataSources.list", workspaceId],
    queryFn: () => dataSourcesApi.list({ workspaceId: workspaceId! }) as Promise<DataSource[]>,
    enabled: !!workspaceId,
  });

  const createSource = useMutation({
    mutationFn: dataSourcesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      setShowCreate(false);
      setNewSource({ name: "", type: "API" });
      toast.success("Data source created");
    },
    onError: () => toast.error("Failed to create data source"),
  });

  const configureSourceMutation = useMutation({
    mutationFn: dataSourcesApi.configureHttp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      setConfigureSource(null);
      setEndpoint("");
      setHeaders([]);
      setHeaderKey("");
      setHeaderValue("");
      toast.success("Data source configured");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to configure data source"),
  });

  const syncSource = useMutation({
    mutationFn: dataSourcesApi.sync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      toast.success("Sync queued");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to queue sync"),
  });

  const disconnectSource = useMutation({
    mutationFn: dataSourcesApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      toast.success("Data source disconnected");
    },
    onError: () => toast.error("Failed to disconnect data source"),
  });

  const deleteSource = useMutation({
    mutationFn: dataSourcesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      toast.success("Data source deleted");
    },
    onError: () => toast.error("Failed to delete data source"),
  });

  if (!workspaceId) {
    return (
      <div className="datasources-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const sourceList: DataSource[] = Array.isArray(sources) ? (sources as DataSource[]) : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSource.mutate({
      workspaceId,
      name: newSource.name,
      type: newSource.type,
    });
  };

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configureSource) return;
    const headersRecord: Record<string, string> = {};
    for (const h of headers) {
      if (h.key.trim()) headersRecord[h.key.trim()] = h.value;
    }
    configureSourceMutation.mutate({
      workspaceId,
      dataSourceId: configureSource.id,
      connection: { endpoint, headers: headersRecord },
    });
  };

  const openConfigure = (source: DataSource) => {
    setConfigureSource(source);
    setEndpoint("");
    setHeaders([]);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="datasources-page">
      <header className="page-header">
        <div>
          <h1>Data Sources</h1>
          <p>Connect and manage external data for your agents</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Add Source
        </button>
      </header>

      {isLoading ? (
        <div className="loading-spinner" />
      ) : sourceList.length === 0 ? (
        <div className="datasources-empty">
          <Database size={48} />
          <p>No data sources yet</p>
          <span>Add your first source to get started</span>
        </div>
      ) : (
        <div className="datasources-grid">
          {sourceList.map((source) => (
            <div className="ds-card" key={source.id}>
              <div className="ds-card-header">
                <div className={`ds-icon ${TYPE_COLORS[source.type]}`}>
                  <Database size={20} />
                </div>
                <div className="ds-card-info">
                  <h3>{source.name}</h3>
                  <div className="ds-card-meta">
                    <span className={`ds-type-badge ${TYPE_COLORS[source.type]}`}>
                      {source.type}
                    </span>
                    <span className={`ds-status ${source.status}`}>
                      {source.status === "connected" && <CheckCircle size={12} />}
                      {source.status === "error" && <AlertCircle size={12} />}
                      {source.status}
                    </span>
                  </div>
                </div>
              </div>

              <p className="ds-last-sync">
                Last synced: {formatDate(source.lastSyncedAt)}
              </p>

              <div className="ds-card-actions">
                <button
                  className="btn-sync"
                  disabled={syncSource.isPending || source.status === "syncing" || !source.configured}
                  title={source.configured ? "Sync" : "Configure the source first"}
                  onClick={() =>
                    syncSource.mutate({ workspaceId, dataSourceId: source.id })
                  }
                >
                  <RefreshCw
                    size={14}
                    className={source.status === "syncing" ? "spin" : ""}
                  />
                  {source.status === "syncing" ? "Syncing..." : "Sync"}
                </button>
                <button
                  className="btn-configure"
                  onClick={() => openConfigure(source)}
                  title="Configure HTTP endpoint"
                >
                  <Settings size={14} />
                  Configure
                </button>
                <button
                  className="btn-disconnect"
                  disabled={!source.configured}
                  onClick={() =>
                    disconnectSource.mutate({
                      workspaceId,
                      dataSourceId: source.id,
                    })
                  }
                >
                  <Unplug size={14} />
                  Disconnect
                </button>
                <button
                  className="btn-delete"
                  onClick={() => {
                    if (confirm(`Delete "${source.name}"?`)) {
                      deleteSource.mutate({
                        workspaceId,
                        dataSourceId: source.id,
                      });
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Data Source</h2>
            <form onSubmit={handleCreate}>
              <label>
                Name
                <input
                  required
                  placeholder="e.g. Production DB"
                  value={newSource.name}
                  onChange={(e) =>
                    setNewSource({ ...newSource, name: e.target.value })
                  }
                />
              </label>
              <label>
                Type
                <select
                  value={newSource.type}
                  onChange={(e) =>
                    setNewSource({
                      ...newSource,
                      type: e.target.value as SourceType,
                    })
                  }
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                  disabled={createSource.isPending}
                >
                  {createSource.isPending ? "Adding..." : "Add Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {configureSource && (
        <div className="modal-overlay" onClick={() => setConfigureSource(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure {configureSource.name}</h2>
              <button className="modal-close" onClick={() => setConfigureSource(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">Connect this source to an HTTP endpoint. The worker will sync it on demand.</p>
            <form onSubmit={handleConfigure}>
              <label>
                Endpoint URL
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/v1/records"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </label>
              <div className="ds-headers-block">
                <div className="ds-headers-label">Headers <span className="ds-optional">(optional)</span></div>
                {headers.length > 0 && (
                  <div className="ds-header-list">
                    {headers.map((h, i) => (
                      <div className="ds-header-row" key={i}>
                        <code>{h.key}</code>
                        <span className="ds-header-sep">→</span>
                        <code className="ds-header-value">{h.value || <em>(empty)</em>}</code>
                        <button type="button" className="btn-remove-header" onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ds-header-add">
                  <input
                    placeholder="Header name (e.g. Authorization)"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                  />
                  <input
                    placeholder="Header value"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-add-header"
                    disabled={!headerKey.trim()}
                    onClick={() => {
                      setHeaders([...headers, { key: headerKey.trim(), value: headerValue }]);
                      setHeaderKey("");
                      setHeaderValue("");
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setConfigureSource(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={configureSourceMutation.isPending || !endpoint.trim()}>
                  {configureSourceMutation.isPending ? "Saving..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
