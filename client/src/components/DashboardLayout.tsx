import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import {
  ChevronsUpDown,
  Search,
  Sparkles,
  MessageCircle,
  Users,
  BookOpen,
  Layers,
  Send,
  Inbox,
  Settings,
  ExternalLink,
  LogOut,
  Rocket,
  Phone,
  Headphones,
} from "lucide-react";
import "./DashboardLayout.css";

const navItems = [
  { label: "Backstage", path: "/dashboard", icon: Sparkles },
  { label: "Playground", path: "/dashboard/playground", icon: Headphones },
  { label: "Contacts", path: "/dashboard/contacts", icon: Users },
  { label: "Channels", path: "/dashboard/channels", icon: Rocket },
  { label: "Integrations", path: "/dashboard/integrations", icon: Layers },
  { label: "Outbound", path: "/dashboard/outbound", icon: Send },
  { label: "Helpdesk inbox", path: "/dashboard/helpdesk", icon: Inbox },
  { label: "Settings", path: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) =>
    location === path || (path !== "/dashboard" && location.startsWith(path));

  return (
    <div className="cb-dashboard">
      <aside className="cb-sidebar">
        <div className="cb-sidebar-header">
          <div className="cb-workspace-selector">
            <div className="cb-workspace-info">
              <span className="cb-workspace-name">SOPRANOVA</span>
              <span className="cb-workspace-user">{user?.name?.split(" ")[0]?.toLowerCase() ?? "user"}'s workspace</span>
            </div>
            <span className="cb-badge">Free</span>
            <ChevronsUpDown size={16} className="cb-chevron-icon" />
          </div>
        </div>

        <div className="cb-sidebar-deploy">
          <button className="cb-deploy-btn">Deploy</button>
        </div>

        <div className="cb-sidebar-search">
          <Search size={16} className="cb-search-icon" />
          <span>Search.</span>
          <kbd>Ctrl K</kbd>
        </div>

        <nav className="cb-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <a
                key={item.label}
                onClick={(e) => { e.preventDefault(); setLocation(item.path); }}
                className={`cb-nav-item ${active ? "cb-nav-item--active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="cb-sidebar-bottom">
          <a className="cb-nav-item cb-docs-link" onClick={(e) => e.preventDefault()}>
            <BookOpen size={20} />
            <span>Documentation</span>
            <ExternalLink size={14} className="cb-external-icon" />
          </a>
          <button className="cb-logout-btn" onClick={() => logout()}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="cb-main">{children}</main>
    </div>
  );
}
