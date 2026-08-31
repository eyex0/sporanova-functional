import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router";

export default function Agents() {
  const { workspaceId } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const agents = trpc.agents.list.useQuery({ workspaceId: workspaceId ?? 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.agents.create.useMutation({ onSuccess: () => { agents.refetch(); setCreating(false); } });

  const deploy = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!workspaceId) return;
    const form = new FormData(e.currentTarget);
    create.mutate({
      workspaceId,
      name: String(form.get("name")),
      purpose: String(form.get("purpose")),
      description: String(form.get("description") || ""),
      capabilities: [],
    });
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", fontFamily: "'Inter', system-ui, sans-serif", margin: 0 }}>Agents</h1>
        <button
          onClick={() => setCreating(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
            borderRadius: 10, background: "#111827", color: "#fff",
            border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#1f2937")}
          onMouseLeave={e => (e.currentTarget.style.background = "#111827")}
        >
          <Plus size={16} />
          New AI agent
        </button>
      </div>

      {/* Agent cards */}
      {agents.isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading agents...</div>
      ) : agents.data?.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {agents.data.map(agent => (
            <Link
              key={agent.id}
              to={`/app/agents/${agent.id}/playground`}
              style={{ textDecoration: "none", borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb", transition: "all 0.2s", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
            >
              {/* Blue gradient preview */}
              <div style={{ height: 160, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #818cf8 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {/* Decorative circles */}
                <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", top: -60, right: -40 }} />
                <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -30, left: -20 }} />
                {/* Agent card mockup */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>✦</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#111827" }}>SOPRANOVA</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#f3f4f6", marginBottom: 6, width: "80%" }} />
                  <div style={{ height: 20, borderRadius: 6, background: "#6366f1", width: "60%" }} />
                </div>
              </div>
              {/* Agent info */}
              <div style={{ padding: "16px 20px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: "'Inter', system-ui, sans-serif" }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    Last trained 2 days ago
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e5e7eb", cursor: "pointer", color: "#9ca3af" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1" fill="currentColor" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="12" cy="8" r="1" fill="currentColor" /></svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div style={{ padding: 80, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>No agents yet</p>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>Create your first AI agent to get started.</p>
          <button
            onClick={() => setCreating(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
              borderRadius: 10, background: "#111827", color: "#fff",
              border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={16} />
            New AI agent
          </button>
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <form onSubmit={deploy} style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>New AI agent</h2>
              <button type="button" onClick={() => setCreating(false)} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={16} />
              </button>
            </div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Name</span>
              <input required name="name" placeholder="e.g. Support Agent" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif" }} onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Purpose</span>
              <textarea required name="purpose" placeholder="What should this agent do?" rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "'Inter', system-ui, sans-serif" }} onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </label>
            <label style={{ display: "block", marginBottom: 24 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></span>
              <input name="description" placeholder="Additional context" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif" }} onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </label>
            <button disabled={create.isPending} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
              {create.isPending ? "Creating..." : "Create agent"}
            </button>
            {create.error && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 8 }}>{create.error.message}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
