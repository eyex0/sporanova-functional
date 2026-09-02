import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsApi } from "@/lib/trpc";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  Play,
  Pause,
  Plus,
  Clock,
  Zap,
  Brain,
  GitMerge,
  Wrench,
  Globe,
  Bell,
  ClockIcon,
  Flag,
  Circle,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Layers,
  Database,
  BookOpen,
  FileCode,
  Share2,
  Users,
  Filter,
  GitPullRequest,
  Shield,
  X,
  Trash2,
} from "lucide-react";
import "./Workflows.css";

/* ──────── Types ──────── */

type WorkflowStatus = "active" | "paused" | "draft" | "archived";
type NodeTypeDef =
  | "start" | "end" | "condition" | "wait" | "notification"
  | "ai" | "ai_agent" | "ai_router" | "ai_classifier"
  | "supervisor" | "multi_agent"
  | "knowledge_search" | "rag_retrieval" | "memory_read" | "memory_write"
  | "tool" | "mcp_tool" | "http_request" | "function" | "code"
  | "parallel" | "merge" | "aggregate" | "subworkflow"
  | "human_approval" | "escalation" | "approval"
  | "trigger" | "intelligence" | "action" | "api";

interface WorkflowData {
  id: number;
  name: string;
  description?: string;
  status: WorkflowStatus;
  createdAt: string;
}

/* ──────── Constants ──────── */

const NODE_TYPES: Record<NodeTypeDef, { label: string; icon: typeof Zap; color: string; category: string }> = {
  start: { label: "Start", icon: Circle, color: "#22c55e", category: "control" },
  end: { label: "End", icon: Flag, color: "#ef4444", category: "control" },
  trigger: { label: "Trigger", icon: Circle, color: "#22c55e", category: "control" },
  condition: { label: "Condition", icon: GitMerge, color: "#f59e0b", category: "control" },
  wait: { label: "Wait", icon: ClockIcon, color: "#6b7280", category: "control" },
  notification: { label: "Notify", icon: Bell, color: "#f97316", category: "control" },
  ai: { label: "AI Agent", icon: Brain, color: "#6366f1", category: "ai" },
  intelligence: { label: "AI Agent", icon: Brain, color: "#6366f1", category: "ai" },
  ai_agent: { label: "AI Agent", icon: Brain, color: "#6366f1", category: "ai" },
  ai_router: { label: "AI Router", icon: Filter, color: "#8b5cf6", category: "ai" },
  ai_classifier: { label: "Classifier", icon: Filter, color: "#a855f7", category: "ai" },
  supervisor: { label: "Supervisor", icon: Users, color: "#7c3aed", category: "ai" },
  multi_agent: { label: "Multi-Agent", icon: Users, color: "#6d28d9", category: "ai" },
  knowledge_search: { label: "Knowledge", icon: BookOpen, color: "#0891b2", category: "knowledge" },
  rag_retrieval: { label: "RAG", icon: Database, color: "#0e7490", category: "knowledge" },
  memory_read: { label: "Memory Read", icon: Database, color: "#06b6d4", category: "knowledge" },
  memory_write: { label: "Memory Write", icon: Database, color: "#22d3ee", category: "knowledge" },
  tool: { label: "Tool", icon: Wrench, color: "#3b82f6", category: "tools" },
  action: { label: "Tool", icon: Wrench, color: "#3b82f6", category: "tools" },
  mcp_tool: { label: "MCP Tool", icon: Wrench, color: "#2563eb", category: "tools" },
  api: { label: "API Call", icon: Globe, color: "#8b5cf6", category: "tools" },
  http_request: { label: "HTTP", icon: Globe, color: "#7c3aed", category: "tools" },
  function: { label: "Function", icon: FileCode, color: "#4f46e5", category: "tools" },
  code: { label: "Code", icon: FileCode, color: "#4338ca", category: "tools" },
  parallel: { label: "Parallel", icon: Share2, color: "#10b981", category: "logic" },
  merge: { label: "Merge", icon: GitPullRequest, color: "#059669", category: "logic" },
  aggregate: { label: "Aggregate", icon: Layers, color: "#047857", category: "logic" },
  subworkflow: { label: "Sub-Workflow", icon: GitBranch, color: "#0d9488", category: "logic" },
  human_approval: { label: "Human Review", icon: CheckCircle, color: "#ec4899", category: "human" },
  approval: { label: "Approval", icon: Shield, color: "#db2777", category: "human" },
  escalation: { label: "Escalation", icon: AlertCircle, color: "#be185d", category: "human" },
};

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "status-active" },
  paused: { label: "Paused", className: "status-paused" },
  draft: { label: "Draft", className: "status-draft" },
  archived: { label: "Archived", className: "status-archived" },
};

/* ──────── Custom Node Component ──────── */

function CustomWorkflowNode({ data }: { data: Record<string, unknown> }) {
  const nodeType = data.nodeType as NodeTypeDef;
  const def = NODE_TYPES[nodeType] ?? NODE_TYPES.tool;
  const Icon = def.icon;

  return (
    <div className="rf-node">
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <div className="rf-node-icon" style={{ background: def.color }}>
        <Icon size={16} color="#fff" />
      </div>
      <div className="rf-node-body">
        <span className="rf-node-label">{(data.label as string) ?? def.label}</span>
        <span className="rf-node-type">{def.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="rf-handle" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflow: CustomWorkflowNode,
};

/* ──────── Editor Component ──────── */

function WorkflowEditor({
  workflowId,
  onBack,
}: {
  workflowId: number;
  onBack: () => void;
}) {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { data: workflowDetail } = useQuery({
    queryKey: ["workflows.get", workspaceId, workflowId],
    queryFn: () => workflowsApi.get({ workspaceId: workspaceId!, workflowId }),
    enabled: !!workspaceId && !!workflowId,
  });

  const initialNodes: Node[] = useMemo(() => {
    if (!workflowDetail) return [];
    const detail = workflowDetail as { nodes: Array<{ nodeKey: string; nodeType: string; label: string; positionX: number; positionY: number; configuration?: Record<string, unknown> }> };
    return detail.nodes.map((n) => ({
      id: n.nodeKey,
      type: "workflow",
      position: { x: n.positionX, y: n.positionY },
      data: { label: n.label, nodeType: n.nodeType, nodeKey: n.nodeKey, configuration: n.configuration },
    }));
  }, [workflowDetail]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!workflowDetail) return [];
    const detail = workflowDetail as { nodes: Array<{ id: number; nodeKey: string }>; edges: Array<{ sourceNodeId: number; targetNodeId: number; label?: string; conditionExpr?: string }> };
    const idToKey = new Map(detail.nodes.map((n) => [n.id, n.nodeKey]));
    return detail.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: idToKey.get(e.sourceNodeId) ?? "",
      target: idToKey.get(e.targetNodeId) ?? "",
      label: e.label ?? undefined,
      animated: false,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    }));
  }, [workflowDetail]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const updateNodes = useMutation({
    mutationFn: workflowsApi.updateNodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows.get"] });
    },
  });

  const runNow = useMutation({
    mutationFn: workflowsApi.runNow as (input: Record<string, unknown>) => Promise<Record<string, unknown>>,
    onSuccess: (result: Record<string, unknown>) => {
      queryClient.invalidateQueries({ queryKey: ["workflows.list"] });
    },
  });

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, animated: false, style: { stroke: "#94a3b8", strokeWidth: 2 } }, eds),
      );
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = (type: NodeTypeDef) => {
    const def = NODE_TYPES[type];
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "workflow",
      position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: { label: def.label, nodeType: type, nodeKey: id, configuration: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const saveWorkflow = () => {
    const nodeData = nodes.map((n, i) => ({
      nodeKey: n.id,
      nodeType: (n.data.nodeType as string) as NodeTypeDef,
      label: (n.data.label as string) ?? "Node",
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      sortOrder: i,
      configuration: (n.data.configuration as Record<string, unknown>) ?? {},
    }));

    const edgeData = edges.map((e) => ({
      sourceNodeKey: e.source,
      targetNodeKey: e.target,
      label: e.label as string | undefined,
    }));

    updateNodes.mutate({
      workspaceId: workspaceId!,
      workflowId,
      nodes: nodeData,
      edges: edgeData,
    });
  };

  const updateNodeData = (field: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [field]: value } }
          : n,
      ),
    );
    setSelectedNode((prev) =>
      prev ? { ...prev, data: { ...prev.data, [field]: value } } : null,
    );
  };

  return (
    <div className="workflows-page workflow-editor-page">
      <header className="page-header">
        <div>
          <button className="btn-back" onClick={onBack}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
          <h1>Workflow Editor</h1>
          <p>Drag nodes from the left panel, connect them, configure on the right</p>
        </div>
        <div className="editor-actions">
          <button className="btn-cancel" onClick={saveWorkflow} disabled={updateNodes.isPending}>
            Save
          </button>
          <button
            className="btn-run"
            onClick={() => runNow.mutate({ workspaceId: workspaceId!, workflowId })}
            disabled={runNow.isPending}
          >
            <Play size={14} /> Run
          </button>
        </div>
      </header>

      <div className="rf-layout">
        {/* Node Palette */}
        <aside className="node-palette">
          <h3>Add Node</h3>

          <div className="palette-category">
            <span className="palette-category-label">Control</span>
            <div className="node-palette-grid">
              {(["start", "end", "condition", "wait", "notification"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-category">
            <span className="palette-category-label">AI & Agents</span>
            <div className="node-palette-grid">
              {(["ai", "ai_router", "supervisor", "multi_agent"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-category">
            <span className="palette-category-label">Knowledge</span>
            <div className="node-palette-grid">
              {(["knowledge_search", "memory_read", "memory_write"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-category">
            <span className="palette-category-label">Tools</span>
            <div className="node-palette-grid">
              {(["tool", "http_request", "code"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-category">
            <span className="palette-category-label">Logic</span>
            <div className="node-palette-grid">
              {(["parallel", "merge", "aggregate", "subworkflow"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-category">
            <span className="palette-category-label">Human</span>
            <div className="node-palette-grid">
              {(["approval", "escalation"] as const).map((type) => {
                const def = NODE_TYPES[type];
                const Icon = def.icon;
                return (
                  <button key={type} className="palette-node" style={{ borderColor: def.color }} onClick={() => addNode(type)}>
                    <Icon size={14} style={{ color: def.color }} />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* React Flow Canvas */}
        <div className="rf-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Delete"
            className="rf-workflow"
          >
            <Controls position="bottom-left" />
            <MiniMap
              nodeColor={(n) => {
                const def = NODE_TYPES[(n.data?.nodeType as string) as NodeTypeDef];
                return def?.color ?? "#94a3b8";
              }}
              maskColor="rgba(0,0,0,0.08)"
              position="bottom-right"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="rf-empty-overlay">
              <GitBranch size={32} />
              <p>Add nodes from the palette</p>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <aside className="node-properties">
          {selectedNode ? (
            <>
              <div className="props-header">
                <h3>Node Properties</h3>
                <button className="btn-delete-node" onClick={deleteSelectedNode}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="props-content">
                <div className="props-row">
                  <label>Key</label>
                  <input
                    value={selectedNode.id}
                    onChange={(e) => {
                      const oldKey = selectedNode.id;
                      const newKey = e.target.value;
                      setNodes((nds) => nds.map((n) => n.id === oldKey ? { ...n, id: newKey } : n));
                      setEdges((eds) => eds.map((e) => ({
                        ...e,
                        source: e.source === oldKey ? newKey : e.source,
                        target: e.target === oldKey ? newKey : e.target,
                      })));
                      setSelectedNode((prev) => prev ? { ...prev, id: newKey } : null);
                    }}
                  />
                </div>
                <div className="props-row">
                  <label>Label</label>
                  <input
                    value={(selectedNode.data.label as string) ?? ""}
                    onChange={(e) => updateNodeData("label", e.target.value)}
                  />
                </div>
                <div className="props-row">
                  <label>Type</label>
                  <select
                    value={(selectedNode.data.nodeType as string) ?? "tool"}
                    onChange={(e) => updateNodeData("nodeType", e.target.value)}
                  >
                    {Object.entries(NODE_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type-specific configuration */}
                {["ai", "ai_agent", "ai_router", "ai_classifier", "supervisor", "multi_agent"].includes(selectedNode.data.nodeType as string) && (
                  <div className="props-row">
                    <label>Prompt Template</label>
                    <textarea
                      value={((selectedNode.data.configuration as Record<string, unknown>)?.promptTemplate as string) ?? ""}
                      placeholder="Use {{variable}} for template vars"
                      rows={4}
                      onChange={(e) => {
                        const config = (selectedNode.data.configuration as Record<string, unknown>) ?? {};
                        updateNodeData("configuration", { ...config, promptTemplate: e.target.value });
                      }}
                    />
                  </div>
                )}

                {(selectedNode.data.nodeType as string) === "ai_router" && (
                  <div className="props-row">
                    <label>Categories (comma-separated)</label>
                    <input
                      value={Array.isArray((selectedNode.data.configuration as Record<string, unknown>)?.categories) ? ((selectedNode.data.configuration as Record<string, unknown>)?.categories as string[]).join(", ") : ""}
                      placeholder="e.g. sales, support, billing"
                      onChange={(e) => {
                        const config = (selectedNode.data.configuration as Record<string, unknown>) ?? {};
                        updateNodeData("configuration", {
                          ...config,
                          categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        });
                      }}
                    />
                  </div>
                )}

                {["approval", "human_approval", "escalation"].includes(selectedNode.data.nodeType as string) && (
                  <>
                    <div className="props-row">
                      <label>Timeout (minutes)</label>
                      <input
                        type="number"
                        value={((selectedNode.data.configuration as Record<string, unknown>)?.timeoutMinutes as number) ?? 1440}
                        onChange={(e) => {
                          const config = (selectedNode.data.configuration as Record<string, unknown>) ?? {};
                          updateNodeData("configuration", { ...config, timeoutMinutes: Number(e.target.value) });
                        }}
                      />
                    </div>
                    <div className="approval-panel">
                      <h4>Human Review Required</h4>
                      <p style={{ fontSize: "12px", margin: 0 }}>
                        Pauses execution until approved/rejected
                      </p>
                    </div>
                  </>
                )}

                {(selectedNode.data.nodeType as string) === "code" && (
                  <div className="props-row">
                    <label>Code (JavaScript)</label>
                    <textarea
                      className="code-editor"
                      value={((selectedNode.data.configuration as Record<string, unknown>)?.code as string) ?? ""}
                      placeholder="// Access: ctx.input, ctx.outputs"
                      rows={6}
                      onChange={(e) => {
                        const config = (selectedNode.data.configuration as Record<string, unknown>) ?? {};
                        updateNodeData("configuration", { ...config, code: e.target.value });
                      }}
                    />
                  </div>
                )}

                {["parallel", "merge", "aggregate"].includes(selectedNode.data.nodeType as string) && (
                  <div className="props-row">
                    <label>Strategy</label>
                    <select
                      value={((selectedNode.data.configuration as Record<string, unknown>)?.strategy as string) ?? "all"}
                      onChange={(e) => {
                        const config = (selectedNode.data.configuration as Record<string, unknown>) ?? {};
                        updateNodeData("configuration", { ...config, strategy: e.target.value });
                      }}
                    >
                      <option value="all">All branches</option>
                      <option value="any">Any branch</option>
                      <option value="first">First to complete</option>
                    </select>
                  </div>
                )}

                <div className="props-hint" style={{ marginTop: 12 }}>
                  Drag to position. Connect via handles. Delete key to remove.
                </div>
              </div>
            </>
          ) : (
            <div className="props-empty">
              <p>Select a node to edit</p>
              <span className="props-hint">Click a node on the canvas</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ──────── Main Page ──────── */

export default function Workflows() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | WorkflowStatus>("all");

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
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: workflowsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows.list"] });
    },
  });

  const workflowList: WorkflowData[] = (workflows as WorkflowData[] | undefined) ?? [];
  const filtered = filter === "all" ? workflowList : workflowList.filter((w) => w.status === filter);

  const openEditor = (workflowId: number) => {
    setSelectedWorkflow(workflowId);
    setView("editor");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    createWorkflow.mutate({
      workspaceId,
      name: data.get("name") as string,
      description: (data.get("description") as string) || undefined,
      nodes: [
        {
          nodeKey: "trigger-start",
          nodeType: "start",
          label: "Start",
          sortOrder: 0,
          positionX: 250,
          positionY: 50,
        },
      ],
      edges: [],
    });
  };

  const toggleStatus = (wf: WorkflowData, status: WorkflowStatus) => {
    updateWorkflow.mutate({ workspaceId: workspaceId!, workflowId: wf.id, status });
  };

  // ──────── Editor View ────────
  if (view === "editor" && selectedWorkflow) {
    return <WorkflowEditor workflowId={selectedWorkflow} onBack={() => setView("list")} />;
  }

  // ──────── List View ────────
  return (
    <div className="workflows-page">
      <header className="page-header">
        <div>
          <h1>Workflows</h1>
          <p>Build and manage automated workflows</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Workflow
        </button>
      </header>

      <div className="workflows-filter-bar">
        {(["all", "active", "paused", "draft", "archived"] as const).map((f) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
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
          {filtered.map((wf) => {
            const statusInfo = STATUS_CONFIG[wf.status] ?? STATUS_CONFIG.draft;
            return (
              <div className="workflow-card" key={wf.id}>
                <div className="workflow-card-header">
                  <div className="workflow-icon">
                    <GitBranch size={20} />
                  </div>
                  <div className="workflow-header-text">
                    <h3>{wf.name}</h3>
                    <span className={`status-badge ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                {wf.description && <p className="workflow-desc">{wf.description}</p>}
                <div className="workflow-meta">
                  <Clock size={12} />
                  <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="workflow-card-actions">
                  <button className="btn-run" onClick={() => openEditor(wf.id)}>
                    <Zap size={14} /> Editor
                  </button>
                  <button
                    className="btn-run"
                    disabled={wf.status === "archived"}
                    onClick={() =>
                      updateWorkflow.mutate({ workspaceId: workspaceId!, workflowId: wf.id, status: wf.status === "active" ? "paused" : "active" })
                    }
                  >
                    {wf.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                    {wf.status === "active" ? "Pause" : "Activate"}
                  </button>
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
                <input required name="name" placeholder="e.g. Lead Qualification" />
              </label>
              <label>
                Description
                <textarea name="description" placeholder="What does this workflow do?" />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createWorkflow.isPending}>
                  {createWorkflow.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
