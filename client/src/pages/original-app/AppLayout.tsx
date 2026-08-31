import { useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router";
import Logo from "../../components/Logo";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const workspaceNav = [
  {
    href: "/app/agents",
    label: "Agents",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3" /><path d="M2 15c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="12.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.1" /><path d="M12.5 8.5c1.66 0 3 1.34 3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
    ),
  },
  { href: "/app/activity", label: "Usage", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M5 6l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { href: "/app/settings", label: "Workspace settings", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M3.93 3.93l1.06 1.06M13 13l1.07 1.07M14.07 3.93L13 5M5 13l-1.07 1.07" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
];

const agentNav = [
  { href: "backstage", label: "Backstage", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 7h4M7 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: "playground", label: "Playground", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 5l6 4-6 4V5z" fill="currentColor" /></svg> },
  { href: "build", label: "Build", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3l6 3v6l-6 3-6-3V6l6-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg> },
  { href: "activity", label: "Activity", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M9 6v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: "analytics", label: "Analytics", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14l4-5 4 3 4-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { href: "contacts", label: "Contacts", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 14c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="9" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" /></svg> },
  { href: "channels", label: "Channels", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: "integrations", label: "Integrations", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 3v4M11 11v4M3 7h4M11 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: "outbound", label: "Outbound", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15l12-6-12-6v4h8v4H3v4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg> },
  { href: "settings", label: "Settings", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();
  const initials = (user?.name || "SN").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const agentId = params.agentId;
  const inAgent = !!agentId;
  const currentPath = location.pathname;

  const isAgentActive = (suffix: string) => currentPath.includes(suffix);
  const isWorkspaceActive = (href: string) => currentPath === href || (href === "/app/agents" && currentPath.startsWith("/app/agents"));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: collapsed ? 56 : 220,
          background: "#fff",
          borderRight: "1px solid #f3f4f6",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          flexShrink: 0,
          overflow: "hidden",
        }}
        className="hidden md:flex"
      >
        {/* Logo + collapse */}
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid #f3f4f6" }}>
          {!collapsed && <Link to="/app/agents" style={{ textDecoration: "none" }}><Logo size={18} showWordmark /></Link>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: collapsed ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: "12px 14px 8px" }}>
            <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {workspace?.workspace?.name || "My Workspace"}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                  Workspace <span style={{ padding: "1px 6px", borderRadius: 4, background: "#f3f4f6", fontSize: 10, fontWeight: 500 }}>Free</span>
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "#9ca3af", flexShrink: 0 }}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Search */}
        {!collapsed && (
          <div style={{ padding: "0 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#9ca3af" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              Search...
              <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: 4, background: "#f3f4f6", fontSize: 10, fontWeight: 500, color: "#9ca3af" }}>Ctrl K</span>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
          {!inAgent ? (
            /* Workspace-level nav */
            workspaceNav.map(item => {
              const active = isWorkspaceActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                    textDecoration: "none", marginBottom: 2, transition: "all 0.15s",
                    background: active ? "#f3f4f6" : "transparent",
                    color: active ? "#111827" : "#6b7280",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
                >
                  <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })
          ) : (
            /* Agent-level nav */
            <>
              <Link to="/app/agents" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", marginBottom: 8, fontSize: 12, color: "#6b7280", textDecoration: "none", borderRadius: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Back
              </Link>
              {agentNav.map(item => {
                const active = isAgentActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={`/app/agents/${agentId}/${item.href}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                      textDecoration: "none", marginBottom: 2, transition: "all 0.15s",
                      background: active ? "#f3f4f6" : "transparent",
                      color: active ? "#111827" : "#6b7280",
                      fontWeight: active ? 600 : 400,
                      fontSize: 13,
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
                  >
                    <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                    {active && !collapsed && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom section */}
        {!collapsed && (
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 14px" }}>
            {/* Documentation link */}
            <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" /><path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Documentation
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}><path d="M5 3h8v8M13 3L3 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>

            {/* Messages counter */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Messages</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>0 / 50</span>
              </div>
              <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "0%", background: "#6366f1", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Resets in 1 day</div>
            </div>

            {/* Start free trial */}
            <Link to="/app/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: "1px solid #6366f1", color: "#6366f1", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 12, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Start free trial
            </Link>

            {/* User avatar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>
                  {initials}
                </div>
              </div>
              <button
                onClick={() => {}}
                style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1" fill="currentColor" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="12" cy="8" r="1" fill="currentColor" /></svg>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Mobile bottom nav ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ borderTop: "1px solid #f3f4f6", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", display: "flex" }}>
        {workspaceNav.slice(0, 4).map(item => {
          const active = isWorkspaceActive(item.href);
          return (
            <Link key={item.href} to={item.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0", textDecoration: "none", color: active ? "#6366f1" : "#9ca3af", fontSize: 10, fontWeight: 500 }}>
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ─── Main content ─── */}
      <main style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
        {/* Top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #f3f4f6", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="md:hidden">
            <Logo size={18} showWordmark />
          </div>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4.5 4.5 0 014.5 4.5V9l1.5 1.5H2L3.5 9V6.5A4.5 4.5 0 018 2z" stroke="currentColor" strokeWidth="1.2" /><path d="M6.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
              {initials}
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", paddingBottom: 100 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
