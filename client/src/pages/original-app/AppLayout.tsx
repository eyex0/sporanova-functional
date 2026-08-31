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
} from "lucide-react";
import "./DashboardLayout.css";

type NavItem = {
  label: string;
  path?: string;
  icon: React.ComponentType<{ size?: number }>;
  hasSubmenu?: boolean;
  subItems?: Array<{ label: string; path: string }>;
  defaultOpen?: boolean;
};

const mainNavItems: NavItem[] = [
  { label: "Backstage", path: "/dashboard", icon: Sparkles },
  { label: "Playground", path: "/dashboard/playground", icon: Headphones },
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
  { label: "Channels", path: "/dashboard/channels", icon: Layers },
  { label: "Integrations", path: "/dashboard/integrations", icon: BookOpen },
  { label: "Outbound", path: "/dashboard/outbound", icon: Send },
  { label: "Helpdesk inbox", path: "/dashboard/helpdesk", icon: Inbox },
  { label: "Settings", path: "/dashboard/settings", icon: Settings },
];

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(
    new Set(["Playground", "Build", "Activity", "Analytics"])
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
          {!collapsed && <Logo size={20} color="#FFFFFF" showWordmark />}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
              <ChevronsUpDown size={14} color="rgba(255,255,255,0.5)" />
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="sidebar-search">
            <Search size={14} color="rgba(255,255,255,0.5)" />
            <input placeholder="Search..." readOnly />
            <span className="sidebar-search-kbd">Ctrl K</span>
          </div>
        )}

        <nav className="sidebar-nav">
          {mainNavItems.map((item) => {
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
                {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="sidebar-progress-card">
            <Link to="/dashboard/getting-started" className="sidebar-progress-header">
              <span>Getting started</span>
              <ChevronRight size={12} color="rgba(255,255,255,0.5)" />
            </Link>
            <p className="sidebar-progress-count">0 / 2 completed</p>
            <div className="sidebar-progress-bar">
              <div className="sidebar-progress-bar-fill" style={{ width: "0%" }} />
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          {!collapsed && (
            <>
              <a className="sidebar-link" href="#" onClick={(e) => e.preventDefault()}>
                <BookOpen size={18} className="sidebar-link-icon" />
                <span className="sidebar-link-label">Documentation</span>
                <ExternalLink size={12} color="rgba(255,255,255,0.4)" />
              </a>
              <button className="sidebar-logout" onClick={() => logout()}>
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </>
          )}
          {collapsed && (
            <button className="sidebar-logout sidebar-logout--icon" onClick={() => logout()}>
              <LogOut size={18} />
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
