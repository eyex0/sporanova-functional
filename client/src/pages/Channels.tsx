import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { channelsApi } from "@/lib/trpc";
import { MessageCircle, FileText, MonitorPlay, Slack, Mail, Phone, Instagram, MessageSquare, Zap, Settings, Code2, Copy } from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

type Channel = {
  type: string;
  name: string;
  description: string;
  available: boolean;
  status: "active" | "draft" | "disabled";
  id: number | null;
  embedCode: string | null;
  configuration: Record<string, unknown>;
  createdAt: string | null;
};

const ICONS: Record<string, React.ReactNode> = {
  widget: <MessageCircle size={22} />,
  help_page: <FileText size={22} />,
  center_stage: <MonitorPlay size={22} />,
  messenger: <MessageSquare size={22} />,
  whatsapp: <MessageSquare size={22} />,
  instagram: <Instagram size={22} />,
  slack: <Slack size={22} />,
  email: <Mail size={22} />,
  sms: <MessageSquare size={22} />,
  voice: <Phone size={22} />,
};

export default function Channels() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [configureType, setConfigureType] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["channels.list", workspaceId],
    queryFn: () => channelsApi.list({ workspaceId: workspaceId! }) as Promise<Channel[]>,
    enabled: !!workspaceId,
  });

  const configure = useMutation({
    mutationFn: channelsApi.configure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels.list"] });
      toast.success("Channel updated");
      setConfigureType(null);
    },
    onError: () => toast.error("Failed to update channel"),
  });

  const disable = useMutation({
    mutationFn: channelsApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels.list"] });
      toast.success("Channel disabled");
    },
    onError: () => toast.error("Failed to disable channel"),
  });

  const handleToggle = (ch: Channel) => {
    if (ch.status === "active") {
      disable.mutate({ workspaceId, type: ch.type as any });
    } else {
      configure.mutate({ workspaceId, type: ch.type as any, status: "active" });
    }
  };

  const handleCopy = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied");
  };

  const channels = data ?? [];
  const selected = channels.find(c => c.type === configureType);

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Channels</h1>
          <p className="sp-subtitle">Connect your agent to the channels your customers use</p>
        </div>
      </header>

      <div className="sp-card-grid">
        {isLoading ? (
          <div className="sp-empty">Loading channels...</div>
        ) : channels.map((ch) => (
          <div key={ch.type} className={`sp-type-card sp-channel-card sp-channel-card--${ch.status} ${!ch.available ? "sp-channel-card--unavailable" : ""}`}>
            <div className="sp-channel-icon">{ICONS[ch.type] ?? <Zap size={22} />}</div>
            <h3>{ch.name}</h3>
            <p>{ch.description}</p>
            <div className="sp-channel-footer">
              <span className={`sp-tag sp-tag--${ch.status}`}>{ch.status}</span>
              {ch.available ? (
                <div className="sp-channel-actions">
                  {ch.status === "active" && ch.embedCode && (
                    <button className="sp-btn sp-btn--ghost" onClick={() => handleCopy(ch.embedCode!)}>
                      <Code2 size={12} /> Embed
                    </button>
                  )}
                  <button className="sp-btn sp-btn--secondary sp-btn--small" onClick={() => setConfigureType(ch.type)}>
                    <Settings size={12} /> Configure
                  </button>
                  <button className={`sp-btn sp-btn--${ch.status === "active" ? "danger" : "primary"} sp-btn--small`} onClick={() => handleToggle(ch)}>
                    {ch.status === "active" ? "Disable" : "Enable"}
                  </button>
                </div>
              ) : (
                <span className="sp-muted">Available on Enterprise plan</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="sp-modal-backdrop" onClick={() => setConfigureType(null)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Configure {selected.name}</h2>
            <div className="sp-form">
              <div className="sp-form-row">
                <label>Channel name</label>
                <input defaultValue={selected.name} id="channel-name" />
              </div>
              <div className="sp-form-row">
                <label>Status</label>
                <select defaultValue={selected.status} id="channel-status">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              {selected.embedCode && (
                <div className="sp-form-row">
                  <label>Embed code</label>
                  <textarea readOnly rows={4} value={selected.embedCode} style={{ fontFamily: "monospace", fontSize: 12 }} />
                  <button className="sp-btn sp-btn--ghost" onClick={() => handleCopy(selected.embedCode!)}>
                    <Copy size={12} /> Copy
                  </button>
                </div>
              )}
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn--secondary" onClick={() => setConfigureType(null)}>Cancel</button>
              <button className="sp-btn sp-btn--primary" onClick={() => {
                const name = (document.getElementById("channel-name") as HTMLInputElement)?.value;
                const status = (document.getElementById("channel-status") as HTMLSelectElement)?.value as "active" | "draft" | "disabled";
                configure.mutate({ workspaceId, type: selected.type as any, name, status });
              }}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
