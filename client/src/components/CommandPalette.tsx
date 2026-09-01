import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, Plus, ArrowRight, Users, MessageSquare, Clock3, BarChart3, Settings, LayoutDashboard, Sparkles, Database, Zap, Mail } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, conversationsApi, contactsApi, leadsApi } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import "./CommandPalette.css";

type CmdResult = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
};

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { workspaceId } = useAuth();

  const { data: agents } = useQuery({
    queryKey: ["agents.list", workspaceId],
    queryFn: () => agentsApi.list({ workspaceId: workspaceId! }) as Promise<{ items: any[] }>,
    enabled: !!workspaceId && open,
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations.list", workspaceId],
    queryFn: () => conversationsApi.list({ workspaceId: workspaceId! }) as Promise<{ items: any[] }>,
    enabled: !!workspaceId && open,
  });

  const agentItems = (agents?.items ?? []).slice(0, 5).map((a) => ({
    id: `agent-${a.id}`,
    label: a.name,
    subtitle: `Agent`,
    icon: <Sparkles size={14} />,
    group: "Agents",
    action: () => { setLocation(`/dashboard/playground?agentId=${a.id}`); onClose(); },
  }));

  const convoItems = (conversations?.items ?? []).slice(0, 5).map((c) => ({
    id: `conv-${c.id}`,
    label: c.title,
    subtitle: "Conversation",
    icon: <MessageSquare size={14} />,
    group: "Conversations",
    action: () => { setLocation(`/dashboard/conversations?conv=${c.id}`); onClose(); },
  }));

  const allItems: CmdResult[] = [
    ...agentItems,
    ...convoItems,
    ...(query.match(/page|pannelo|dashboard/i) ? [{ id: "dashboard", label: "Dashboard overview", subtitle: "Go to dashboard", icon: <LayoutDashboard size={14} />, group: "Navigation", action: () => { setLocation("/dashboard"); onClose(); } }] : []),
    ...(query.match(/nuovo agente|new agent/i) ? [{ id: "new-agent", label: "Create new agent", subtitle: "Open agent builder", icon: <Plus size={14} />, group: "Actions", action: () => { setLocation("/dashboard/playground"); onClose(); } }] : []),
    ...(query.match(/contatti|contacts/i) ? [{ id: "contacts", label: "Contacts", subtitle: "Open contacts page", icon: <Users size={14} />, group: "Navigation", action: () => { setLocation("/dashboard/contacts"); onClose(); } }] : []),
    ...(query.match(/lead/i) ? [{ id: "leads", label: "Leads", subtitle: "Open leads pipeline", icon: <Zap size={14} />, group: "Navigation", action: () => { setLocation("/dashboard/leads"); onClose(); } }] : []),
    ...(query.match(/aiutante|helpdesk|ticket/i) ? [{ id: "helpdesk", label: "Helpdesk", subtitle: "Open helpdesk", icon: <Mail size={14} />, group: "Navigation", action: () => { setLocation("/dashboard/helpdesk"); onClose(); } }] : []),
    ...(query.match(/impostazioni|settings/i) ? [{ id: "settings", label: "Settings", subtitle: "Open settings", icon: <Settings size={14} />, group: "Navigation", action: () => { setLocation("/dashboard/settings"); onClose(); } }] : []),
  ];

  const filtered = query ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.subtitle.toLowerCase().includes(query.toLowerCase())) : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && filtered[selectedIndex]) { filtered[selectedIndex].action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          {Search && <Search size={16} className="cmd-search-icon" />}
          <input ref={inputRef} className="cmd-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents, conversations, pages..." autoComplete="off" />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">
              <p>No results for "{query}"</p>
              <span>Try: "new agent", "contacts", "helpdesk", "settings"</span>
            </div>
          ) : (
            filtered.map((item, i) => (
              <button key={item.id} className={`cmd-item ${i === selectedIndex ? "cmd-item--selected" : ""}`} onClick={item.action}>
                <span className="cmd-item-icon">{item.icon}</span>
                <div className="cmd-item-content">
                  <strong>{item.label}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <span className="cmd-item-group">{item.group}</span>
              </button>
            ))
          )}
        </div>
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}