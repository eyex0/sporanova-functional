import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "@/lib/trpc";
import { ChannelConfigDialog } from "./ChannelConfigDialog";
import type { ChannelWithState } from "./types";
import { IntegrationIcon, getIntegrationColor } from "@/components/IntegrationIcon";
import { Search, X, CheckCircle, Clock, AlertCircle, ExternalLink, Zap } from "lucide-react";
import "./Channels.css";

/* ──────── Category Labels ──────── */

const CATEGORY_LABELS: Record<string, string> = {
  featured: "Featured",
  messaging: "Messaging",
  support: "Support",
  integration: "Integrations",
  development: "Development",
  ecommerce: "E-commerce",
};

/* ──────── Status Badge ──────── */

function StatusBadge({ channel }: { channel: ChannelWithState }) {
  if (channel.status === "coming_soon") {
    return <span className="ch-status ch-coming-soon">Coming Soon</span>;
  }
  if (channel.channelStatus === "active") {
    return <span className="ch-status ch-active"><CheckCircle size={12} /> Connected</span>;
  }
  if (channel.channelStatus === "disabled") {
    return <span className="ch-status ch-disabled"><X size={12} /> Disabled</span>;
  }
  if (channel.configured) {
    return <span className="ch-status ch-configured"><Clock size={12} /> Configured</span>;
  }
  return null;
}

/* ──────── Channel Card ──────── */

function ChannelCard({
  channel,
  onConfigure,
}: {
  channel: ChannelWithState;
  onConfigure: (ch: ChannelWithState) => void;
}) {
  const isComingSoon = channel.status === "coming_soon";
  const accentColor = channel.accent || getIntegrationColor(channel.id);

  return (
    <div className={`ch-card ${isComingSoon ? "ch-card-coming-soon" : ""}`}>
      <div className="ch-card-header">
        <div className="ch-card-icon" style={{ background: accentColor + "15", color: accentColor }}>
          <IntegrationIcon type={channel.id} size={20} />
        </div>
        <div className="ch-card-info">
          <h3>{channel.name}</h3>
          <StatusBadge channel={channel} />
        </div>
        {channel.badge && <span className="ch-card-badge">{channel.badge}</span>}
      </div>

      <p className="ch-card-desc">{channel.description}</p>

      <div className="ch-card-footer">
        {isComingSoon ? (
          <button className="ch-btn ch-btn-disabled" disabled>
            <Clock size={14} /> Coming Soon
          </button>
        ) : channel.channelStatus === "active" ? (
          <button className="ch-btn ch-btn-manage" onClick={() => onConfigure(channel)}>
            <ExternalLink size={14} /> Manage
          </button>
        ) : (
          <button className="ch-btn ch-btn-enable" onClick={() => onConfigure(channel)}>
            <Zap size={14} /> Enable
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────── Main Page ──────── */

export default function Channels() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithState | null>(null);
  const [filter, setFilter] = useState<"all" | "featured" | "messaging" | "support" | "integration" | "development">("all");

  const { data: channelsData, isLoading } = useQuery({
    queryKey: ["channels.list", workspaceId, search],
    queryFn: () => channelsApi.list({ workspaceId: workspaceId!, search: search || undefined }),
    enabled: !!workspaceId,
  });

  const channels: ChannelWithState[] = (channelsData as ChannelWithState[] | undefined) ?? [];

  // Filter by category
  const filtered = useMemo(() => {
    if (filter === "all") return channels;
    return channels.filter((c) => c.category === filter);
  }, [channels, filter]);

  // Group by category for display
  const grouped = useMemo(() => {
    const groups: Record<string, ChannelWithState[]> = {};
    for (const ch of filtered) {
      const cat = ch.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ch);
    }
    return groups;
  }, [filtered]);

  const handleSaved = () => {
    setSelectedChannel(null);
    queryClient.invalidateQueries({ queryKey: ["channels.list"] });
  };

  const categories = Object.keys(grouped);

  return (
    <div className="channels-page">
      <header className="ch-header">
        <div>
          <h1>Channels</h1>
          <p>Connect your AI agent to different platforms and messaging channels</p>
        </div>
      </header>

      {/* Search */}
      <div className="ch-search-bar">
        <div className="ch-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ch-search-clear" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="ch-filter-tabs">
          {(["all", "featured", "messaging", "support", "integration", "development"] as const).map((f) => (
            <button
              key={f}
              className={`ch-filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : CATEGORY_LABELS[f] ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Grid */}
      {isLoading ? (
        <div className="ch-loading">
          <div className="loading-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ch-empty">
          <Search size={32} />
          <p>{search ? `No channels matching "${search}"` : "No channels available"}</p>
        </div>
      ) : (
        <div className="ch-channels">
          {categories.map((cat) => (
            <div key={cat} className="ch-category-section">
              <h2 className="ch-category-title">{CATEGORY_LABELS[cat] ?? cat}</h2>
              <div className="ch-grid">
                {grouped[cat].map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    onConfigure={setSelectedChannel}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config Dialog */}
      {selectedChannel && (
        <ChannelConfigDialog
          channel={selectedChannel}
          open={true}
          onClose={() => setSelectedChannel(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
