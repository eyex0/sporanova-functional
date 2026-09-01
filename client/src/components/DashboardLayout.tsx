import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import CommandPalette from "@/components/CommandPalette";
import {
  ChevronsUpDown,
  Search,
  Sparkles,
  Headphones,
  Hammer,
  Activity,
  BarChart3,
  MessageSquare,
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
  Zap,
  X,
} from "lucide-react";
import "./DashboardLayout.css";
import { toast } from "sonner";

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
      { label: "Data sources", path: "/dashboard/data-sources" },
      { label: "Actions", path: "/dashboard/integrations" },
      { label: "Widgets", path: "/dashboard/channels" },
      { label: "Procedures", path: "/dashboard/workflows" },
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(
    new Set(["Build", "Activity", "Analytics"])
  );
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isActive = (path: string) =>
    location === path ||
    (path !== "/dashboard" && location.startsWith(path + "/"));

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
  }, [location]);

  return (
    <>
      <div className="db-layout">
      {/* Trial Banner */}
      {bannerVisible && (
        <div className="db-trial-banner">
          <div className="db-trial-banner-inner">
            <span><Zap size={14} /> Start your free 7 day trial of a paid plan — full access, cancel anytime.</span>
            <button className="db-trial-claim-btn">Claim your free trial</button>
          </div>
          <button className="db-trial-close" onClick={() => setBannerVisible(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="db-layout-body">
        {/* Sidebar */}
        <aside className={`db-sidebar ${collapsed ? "db-sidebar--collapsed" : ""}`}>
          {/* Header */}
          <div className="db-sidebar-header">
            {!collapsed && (
              <div className="db-sidebar-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#171717"/><path d="M7 8h10v2H7zm0 3h7v2H7zm0 3h10v2H7z" fill="#fff"/></svg>
                <span className="db-logo-text">SOPRANOVA</span>
              </div>
            )}
            <button
              className="db-sidebar-toggle"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Workspace Selector */}
          {!collapsed && (
            <div className="db-workspace-section">
              <div className="db-workspace-row">
                <div className="db-workspace-info">
                  <span className="db-workspace-name">{user?.email?.split("@")[0] ?? "user"}'s works...</span>
                  <div className="db-workspace-meta">
                    <span>Workspace</span>
                    <span className="db-badge">Free</span>
                  </div>
                </div>
                <ChevronsUpDown size={14} className="db-chevron" />
              </div>
            </div>
          )}

          {/* Search */}
          {!collapsed && (
            <div className="db-search">
              <Search size={14} className="db-search-icon" />
              <input placeholder="Search..." readOnly />
              <kbd>Ctrl K</kbd>
            </div>
          )}

          {/* Nav */}
          <nav className="db-sidebar-nav">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.path ? isActive(item.path) : false;
              const subActive = item.subItems?.some((s) => isActive(s.path)) ?? false;
              const isOpen = openSubmenus.has(item.label);

              if (item.hasSubmenu) {
                return (
                  <div key={item.label} className="db-nav-group">
                    <button
                      type="button"
                      className={`db-nav-item ${subActive ? "db-nav-item--active" : ""}`}
                      onClick={() => toggleSubmenu(item.label)}
                    >
                      <Icon size={18} />
                      {!collapsed && (
                        <>
                          <span>{item.label}</span>
                          {isOpen ? <ChevronDown size={14} className="db-nav-chevron" /> : <ChevronRight size={14} className="db-nav-chevron" />}
                        </>
                      )}
                    </button>
                    {!collapsed && isOpen && item.subItems && (
                      <div className="db-nav-submenu">
                        {item.subItems.map((sub) => (
                          <a
                            key={sub.path}
                            onClick={(e) => { e.preventDefault(); setLocation(sub.path); }}
                            className={`db-nav-subitem ${isActive(sub.path) ? "db-nav-subitem--active" : ""}`}
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.label}
                  onClick={(e) => { e.preventDefault(); if (item.path) setLocation(item.path); }}
                  className={`db-nav-item ${active ? "db-nav-item--active" : ""}`}
                >
                  <Icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </a>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="db-sidebar-bottom">
            {/* Getting Started Card */}
            {!collapsed && (
              <div className="db-progress-card">
                <a className="db-progress-header" onClick={(e) => { e.preventDefault(); setLocation("/dashboard/getting-started"); }}>
                  <span>Getting started</span>
                  <ChevronRight size={12} />
                </a>
                <p className="db-progress-count">0 / 2 completed</p>
                <div className="db-progress-bar">
                  <div className="db-progress-fill" style={{ width: "0%" }} />
                </div>
              </div>
            )}

            {/* Docs */}
            <a className="db-nav-item db-docs-link" onClick={(e) => e.preventDefault()}>
              <BookOpen size={18} />
              {!collapsed && (
                <>
                  <span>Documentation</span>
                  <ExternalLink size={12} className="db-external-icon" />
                </>
              )}
            </a>

            {/* Sign out */}
            <button className="db-signout" onClick={() => logout()}>
              <LogOut size={16} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className={`db-main ${collapsed ? "db-main--collapsed" : ""}`}>
          {children}
        </main>
      </div>
    </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
