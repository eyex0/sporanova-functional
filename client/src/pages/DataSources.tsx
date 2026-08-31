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
} from "lucide-react";
import "./DataSources.css";

type SourceType = "API" | "Database" | "File" | "Webhook";
type SourceStatus = "connected" | "syncing" | "error" | "disconnected";

interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  lastSyncedAt: string | null;
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
  const [newSource, setNewSource] = useState({
    name: "",
    type: "API" as SourceType,
  });

  const { data: sources, isLoading } = useQuery({
    queryKey: ["dataSources.list", workspaceId],
    queryFn: () => dataSourcesApi.list({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const createSource = useMutation({
    mutationFn: dataSourcesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] });
      setShowCreate(false);
      setNewSource({ name: "", type: "API" });
    },
  });

  const syncSource = useMutation({
    mutationFn: dataSourcesApi.sync,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] }),
  });

  const disconnectSource = useMutation({
    mutationFn: dataSourcesApi.disconnect,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] }),
  });

  const deleteSource = useMutation({
    mutationFn: dataSourcesApi.delete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dataSources.list"] }),
  });

  if (!workspaceId) {
    return (
      <div className="datasources-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const sourceList: DataSource[] = (sources as DataSource[] | undefined) ?? [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSource.mutate({
      workspaceId,
      name: newSource.name,
      type: newSource.type,
    });
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
                  disabled={syncSource.isPending || source.status === "syncing"}
                  onClick={() =>
                    syncSource.mutate({ workspaceId, sourceId: source.id })
                  }
                >
                  <RefreshCw
                    size={14}
                    className={source.status === "syncing" ? "spin" : ""}
                  />
                  {source.status === "syncing" ? "Syncing..." : "Sync"}
                </button>
                <button
                  className="btn-disconnect"
                  onClick={() =>
                    disconnectSource.mutate({
                      workspaceId,
                      sourceId: source.id,
                    })
                  }
                >
                  <Unplug size={14} />
                  Disconnect
                </button>
                <button
                  className="btn-delete"
                  onClick={() =>
                    deleteSource.mutate({
                      workspaceId,
                      sourceId: source.id,
                    })
                  }
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
    </div>
  );
}
