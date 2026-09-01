import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsApi } from "@/lib/trpc";
import {
  GitBranch,
  Play,
  Pause,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
} from "lucide-react";
import "./Workflows.css";

type WorkflowStatus = "active" | "paused" | "draft" | "archived";

interface Workflow {
  id: number;
  name: string;
  description?: string;
  status: WorkflowStatus;
  createdAt: string;
}

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "status-active" },
  paused: { label: "Paused", className: "status-paused" },
  draft: { label: "Draft", className: "status-draft" },
  archived: { label: "Archived", className: "status-archived" },
};

export default function Workflows() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | WorkflowStatus>("all");
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    status: "draft" as WorkflowStatus,
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows.list", workspaceId],
    queryFn: () => workflowsApi.list({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const createWorkflow = useMutation({
    mutationFn: workflowsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows.list"] });
      setShowCreate(false);
      setNewWorkflow({ name: "", description: "", status: "draft" });
    },
  });

  const runWorkflow = useMutation({
    mutationFn: workflowsApi.runNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows.list"] });
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: workflowsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows.list"] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="workflows-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const workflowList: Workflow[] = (workflows as Workflow[] | undefined) ?? [];
  const filtered =
    filter === "all" ? workflowList : workflowList.filter((w) => w.status === filter);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createWorkflow.mutate({
      workspaceId,
      name: newWorkflow.name,
      description: newWorkflow.description || undefined,
      nodes: [
        {
          nodeKey: "trigger-start",
          nodeType: "trigger",
          label: "Start",
          sortOrder: 0,
          positionX: 0,
          positionY: 0,
        },
      ],
    });
  };

  const handleToggleStatus = (workflow: Workflow) => {
    if (workflow.status === "active") {
      updateWorkflow.mutate({
        workspaceId,
        workflowId: workflow.id,
        status: "paused",
      });
    } else if (workflow.status === "paused") {
      updateWorkflow.mutate({
        workspaceId,
        workflowId: workflow.id,
        status: "active",
      });
    } else if (workflow.status === "draft") {
      updateWorkflow.mutate({
        workspaceId,
        workflowId: workflow.id,
        status: "active",
      });
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setNewWorkflow({
      name: `${workflow.name} (copy)`,
      description: workflow.description ?? "",
      status: "draft",
    });
    setShowCreate(true);
  };

  return (
    <div className="workflows-page">
      <header className="page-header">
        <div>
          <h1>Workflows</h1>
          <p>Build and manage automated workflows</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Workflow
        </button>
      </header>

      <div className="workflows-filter-bar">
        {(["all", "active", "paused", "draft", "archived"] as const).map((f) => (
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
        <div className="workflows-empty">
          <GitBranch size={48} />
          <p>No workflows found</p>
          <span>Create your first workflow to automate tasks</span>
        </div>
      ) : (
        <div className="workflows-grid">
          {filtered.map((workflow) => {
            const statusInfo = STATUS_CONFIG[workflow.status] ?? STATUS_CONFIG.draft;
            return (
              <div className="workflow-card" key={workflow.id}>
                <div className="workflow-card-header">
                  <div className="workflow-icon">
                    <GitBranch size={20} />
                  </div>
                  <div className="workflow-header-text">
                    <h3>{workflow.name}</h3>
                    <span className={`status-badge ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {workflow.description && (
                  <p className="workflow-desc">{workflow.description}</p>
                )}

                <div className="workflow-meta">
                  <Clock size={12} />
                  <span>
                    Created {new Date(workflow.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="workflow-card-actions">
                  <button
                    className="btn-run"
                    disabled={workflow.status !== "active"}
                    onClick={() =>
                      runWorkflow.mutate({
                        workspaceId,
                        workflowId: workflow.id,
                      })
                    }
                  >
                    <Play size={14} />
                    Run Now
                  </button>
                  <button className="btn-edit" onClick={() => handleEdit(workflow)}>
                    <Settings size={14} />
                    Edit
                  </button>
                  {(workflow.status === "active" || workflow.status === "paused" || workflow.status === "draft") && (
                    <button
                      className={`btn-toggle ${workflow.status === "active" ? "pause" : "resume"}`}
                      onClick={() => handleToggleStatus(workflow)}
                    >
                      {workflow.status === "active" ? (
                        <>
                          <Pause size={14} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          {workflow.status === "draft" ? "Activate" : "Resume"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Workflow</h2>
            <form onSubmit={handleCreate}>
              <label>
                Name
                <input
                  required
                  placeholder="e.g. Daily Report Generator"
                  value={newWorkflow.name}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, name: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  placeholder="What does this workflow do?"
                  value={newWorkflow.description}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, description: e.target.value })
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={newWorkflow.status}
                  onChange={(e) =>
                    setNewWorkflow({
                      ...newWorkflow,
                      status: e.target.value as WorkflowStatus,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
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
                  disabled={createWorkflow.isPending}
                >
                  {createWorkflow.isPending ? "Creating..." : "Create Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
