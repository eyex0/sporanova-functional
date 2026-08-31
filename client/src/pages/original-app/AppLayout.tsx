import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Logo from "../../components/Logo";
import {
  ChevronsUpDown,
  Search,
  Sparkles,
  Hammer,
  Activity,
  BarChart3,
  Users,
  BookOpen,
  Layers,
  Send,
  Inbox,
  Settings,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Headphones,
  Rocket,
  Plug,
  Megaphone,
  Ticket,
  MoreHorizontal,
  CircleDot,
  Square,
  Star,
  FileText,
  Puzzle,
  Globe,
} from "lucide-react";
import "./DashboardLayout.css";

type NavItem = {
  label: string;
  path?: string;
  icon: React.ComponentType<{ size?: number }>;
  hasSubmenu?: boolean;
  subItems?: Array<{ label: string; path: string }>;
  defaultOpen?: boolean;
  external?: boolean;
  separator?: boolean;
};

const mainNavItems: NavItem[] = [
  { label: "Backstage", path: "/dashboard", icon: Sparkles },
  { label: "Playground", path: "/dashboard/playground", icon: CircleDot },
  {
    label: "Build",
    icon: Hammer,
    hasSubmenu: true,
    subItems: [
      { label: "Instructions", path: "/dashboard/playground/instructions" },
      { label: "Data sources", path: "/dashboard/data-sources" },
      { label: "Actions", path: "/dashboard/integrations" },
      { label: "Widgets", path: "/dashboard/channels" },
      { label: "Procedures", path: "/dashboard/playground/procedures" },
      { label: "Suggestions", path: "/dashboard/playground/suggestions" },
    ],
  },
  {
    label: "Activity",
    icon: Activity,
    hasSubmenu: true,
    subItems: [
      { label: "Conversations", path: "/dashboard/conversations" },
      { label: "Leads", path: "/dashboard/leads" },
      { label: "Collected data", path: "/dashboard/collected-data" },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart3,
    hasSubmenu: true,
    subItems: [
      { label: "Chats", path: "/dashboard/analytics" },
      { label: "Topics", path: "/dashboard/analytics/topics" },
      { label: "Sentiment", path: "/dashboard/analytics/sentiment" },
    ],
  },
  { label: "Contacts", path: "/dashboard/contacts", icon: Users },
  { label: "Channels", path: "/dashboard/channels", icon: Rocket },
  { label: "Integrations", path: "/dashboard/integrations", icon: Plug },
  { label: "Outbound", path: "/dashboard/outbound", icon: Megaphone },
  { separator: true, label: "", icon: Sparkles },
  { label: "Helpdesk inbox", path: "/dashboard/helpdesk", icon: Ticket, external: true },
];

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(
    new Set(["Build", "Activity", "Analytics"])
  );

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path + "/"));

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    for (const item of mainNavItems) {
      if (item.subItems && item.subItems.some((s) => isActive(s.path))) {
        setOpenSubmenus((prev) => {
          if (prev.has(item.label)) return prev;
          const next = new Set(prev);
          next.add(item.label);
          return next;
        });
      }
    }
  }, [location.pathname]);

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-area">
            <div className="sidebar-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            {!collapsed && <span className="sidebar-logo-wordmark">SOPRANOVA</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!collapsed && (
          <div className="sidebar-workspace-selector">
            <div className="sidebar-workspace-row">
              <div className="sidebar-workspace-info">
                <span className="sidebar-workspace-name">
                  {workspace?.workspace?.name || "My Workspace"}
                </span>
                <span className="sidebar-workspace-badge">Free</span>
              </div>
              <ChevronsUpDown size={14} color="#686868" />
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {mainNavItems.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} className="sidebar-separator" />;
            }

            const Icon = item.icon;
            const active = item.path ? isActive(item.path) : false;
            const subActive = item.subItems?.some((s) => isActive(s.path)) ?? false;
            const isOpen = openSubmenus.has(item.label);

            if (item.hasSubmenu) {
              return (
                <div key={item.label} className="sidebar-group">
                  <button
                    type="button"
                    className={`sidebar-link ${subActive ? "sidebar-link--active" : ""}`}
                    onClick={() => toggleSubmenu(item.label)}
                  >
                    <Icon size={18} className="sidebar-link-icon" />
                    {!collapsed && (
                      <>
                        <span className="sidebar-link-label">{item.label}</span>
                        {isOpen ? (
                          <ChevronDown size={14} className="sidebar-link-chevron" />
                        ) : (
                          <ChevronRight size={14} className="sidebar-link-chevron" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && item.subItems && (
                    <div className="sidebar-submenu">
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`sidebar-sublink ${isActive(sub.path) ? "sidebar-sublink--active" : ""}`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path || "/dashboard"}
                className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}
              >
                <Icon size={18} className="sidebar-link-icon" />
                {!collapsed && (
                  <>
                    <span className="sidebar-link-label">{item.label}</span>
                    {item.external && <ExternalLink size={12} className="sidebar-link-external" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <a className="sidebar-footer-link" href="#" onClick={(e) => e.preventDefault()}>
              <BookOpen size={18} />
              <span>Documentation</span>
              <ExternalLink size={12} className="sidebar-link-external" />
            </a>
          )}

          {!collapsed && (
            <div className="sidebar-user-row" onClick={() => logout()}>
              <div className="sidebar-user-avatar">
                <span style={{ fontSize: 12, fontWeight: 600, color: "#686868" }}>
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="sidebar-user-name">
                {user?.name || user?.email || "User"}
              </span>
              <MoreHorizontal size={14} className="sidebar-user-menu" />
            </div>
          )}

          {collapsed && (
            <button className="sidebar-toggle" onClick={() => logout()} title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}