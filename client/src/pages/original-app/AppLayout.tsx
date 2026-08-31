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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.5 14c0-2.49 2.24-4.5 5-4.5s5 2.01 5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="12" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1" />
        <path d="M12 8c1.38 0 2.5 1.12 2.5 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/app/activity",
    label: "Usage",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/app/settings",
    label: "Workspace settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    hasChevron: true,
  },
];

const agentNav = [
  { href: "backstage", label: "Backstage", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M6 6.5h4M6 9.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
  { href: "playground", label: "Playground", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l5.5 4-5.5 4V4z" fill="currentColor" /></svg>, hasPlayIcon: true },
  { href: "build", label: "Build", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2.5l5 2.5v5l-5 2.5-5-2.5V5l5-2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>, hasChevron: true },
  { href: "activity", label: "Activity", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.2" /><path d="M8 5.5v3l1.8 1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>, hasChevron: true },
  { href: "analytics", label: "Analytics", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13l3.5-4.5 3.5 2.5 4-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>, hasChevron: true },
  { href: "contacts", label: "Contacts", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 13c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="8" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2" /></svg> },
  { href: "channels", label: "Channels", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
  { href: "integrations", label: "Integrations", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2.5v3.5M10 10v3.5M2.5 6h3.5M10 6h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
  { href: "outbound", label: "Outbound", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 13l10.5-5-10.5-5v3.5h6.5v3h-6.5V13z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> },
  { href: "settings", label: "Settings", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();
  const initials = (user?.name || "SN").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const agentId = params.agentId;
  const inAgent = !!agentId;
  const currentPath = location.pathname;

  const isAgentActive = (suffix: string) => currentPath.endsWith("/" + suffix) || currentPath.includes("/" + suffix + "/");
  const isWorkspaceActive = (href: string) => currentPath === href || (href === "/app/agents" && currentPath.startsWith("/app/agents"));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ─── Sidebar ─── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: collapsed ? 56 : 220,
          minWidth: collapsed ? 56 : 220,
          background: "#fff",
          borderRight: "1px solid #f3f4f6",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
          height: "100vh",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Logo + collapse */}
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: collapsed ? "0 16px" : "0 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          {!collapsed && (
            <Link to="/app/agents" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
              <Logo size={16} showWordmark />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e5e7eb", cursor: "pointer", color: "#9ca3af", transition: "all 0.15s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#d1d5db"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ transform: collapsed ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: "10px 14px 6px", flexShrink: 0 }}>
            <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#d1d5db")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            >
              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
                  {workspace?.workspace?.name || "My Workspace"}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  Workspace
                  <span style={{ padding: "0px 5px", borderRadius: 4, background: "#f3f4f6", fontSize: 10, fontWeight: 500, color: "#6b7280", lineHeight: "16px" }}>Free</span>
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
          <div style={{ padding: "6px 14px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#9ca3af", cursor: "text", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#d1d5db")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" /><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              <span>Search...</span>
              <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: 4, background: "#f3f4f6", fontSize: 10, fontWeight: 500, color: "#9ca3af", border: "1px solid #e5e7eb" }}>Ctrl K</span>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {!inAgent ? (
            workspaceNav.map(item => {
              const active = isWorkspaceActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    marginBottom: 1,
                    transition: "all 0.12s",
                    background: active ? "#f3f4f6" : "transparent",
                    color: active ? "#111827" : "#6b7280",
                    fontWeight: active ? 500 : 400,
                    fontSize: 13,
                    lineHeight: "20px",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
                >
                  <span style={{ flexShrink: 0, display: "flex", width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {"hasChevron" in item && item.hasChevron && (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#9ca3af", flexShrink: 0 }}>
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </>
                  )}
                </Link>
              );
            })
          ) : (
            <>
              {/* Back link */}
              <Link to="/app/agents" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", marginBottom: 6, fontSize: 13, color: "#6b7280", textDecoration: "none", borderRadius: 6, transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
              >
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
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                      marginBottom: 1,
                      transition: "all 0.12s",
                      background: active ? "#f3f4f6" : "transparent",
                      color: active ? "#111827" : "#6b7280",
                      fontWeight: active ? 500 : 400,
                      fontSize: 13,
                      lineHeight: "20px",
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
                  >
                    <span style={{ flexShrink: 0, display: "flex", width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {"hasChevron" in item && item.hasChevron && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#9ca3af", flexShrink: 0 }}>
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {"hasPlayIcon" in item && item.hasPlayIcon && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#9ca3af", flexShrink: 0 }}>
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom section */}
        {!collapsed && (
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 14px 14px", flexShrink: 0 }}>
            {/* Documentation link */}
            <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 12, transition: "color 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3.5 2h9a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.1" /><path d="M5.5 5h5M5.5 8h5M5.5 11h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
              Documentation
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}><path d="M4.5 2.5h9v9M13.5 2.5l-11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>

            {/* Messages counter */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Messages</span>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400 }}>0 / 50</span>
              </div>
              <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "0%", background: "#6366f1", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Resets in 1 day</div>
            </div>

            {/* Start free trial */}
            <Link to="/app/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #6366f1", color: "#6366f1", fontSize: 13, fontWeight: 500, textDecoration: "none", marginBottom: 12, transition: "all 0.15s", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Start free trial
            </Link>

            {/* User */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
              </div>
              <button
                onClick={() => {}}
                style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#6b7280"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1" fill="currentColor" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="12" cy="8" r="1" fill="currentColor" /></svg>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Mobile bottom nav ─── */}
      <div className="mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, borderTop: "1px solid #f3f4f6", background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "none" }}>
        {workspaceNav.map(item => {
          const active = isWorkspaceActive(item.href);
          return (
            <Link key={item.href} to={item.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 0 6px", textDecoration: "none", color: active ? "#6366f1" : "#9ca3af", fontSize: 10, fontWeight: 500, transition: "color 0.12s" }}>
              <span style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ─── Main content ─── */}
      <main style={{ flex: 1, overflowY: "auto", background: "#fff", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #f3f4f6", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <div className="mobile-logo" style={{ display: "none" }}>
            <Logo size={16} showWordmark />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a4 4 0 014 4V9l1.5 1H2.5L4 9V5.5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.2" /><path d="M6 12a2 2 0 004 0" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
              {initials}
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", paddingBottom: 100 }}>
          <Outlet />
        </div>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mobile-nav { display: flex !important; }
          .mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}
