import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronsUpDown,
  Search,
  Users,
  BookOpen,
  Settings,
  ExternalLink,
  LogOut,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Zap,
} from "lucide-react";
import "./DashboardLayout.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const isActive = (path: string) => location === path;
  const isSettingsActive = location.startsWith("/dashboard/settings");

  return (
    <div className="cb-layout">
      {/* Trial Banner */}
      {bannerVisible && (
        <div className="cb-trial-banner">
          <div className="cb-trial-banner-inner">
            <span><Zap size={14} /> Start your free 7 day trial of a paid plan - full access, cancel anytime.</span>
            <button className="cb-trial-claim-btn">Claim your free trial</button>
          </div>
          <button className="cb-trial-close" onClick={() => setBannerVisible(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="cb-layout-body">
        {/* Sidebar */}
        <aside className="cb-sidebar">
          {/* Logo */}
          <div className="cb-sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#171717"/><path d="M7 8h10v2H7zm0 3h7v2H7zm0 3h10v2H7z" fill="#fff"/></svg>
            <span className="cb-logo-text">SOPRANOVA</span>
          </div>

          {/* Workspace Selector */}
          <div className="cb-workspace-section">
            <button className="cb-workspace-selector">
              <div className="cb-workspace-info">
                <span className="cb-workspace-name">{user?.email?.split("@")[0] ?? "user"}'s works...</span>
                <div className="cb-workspace-meta">
                  <span>Workspace</span>
                  <span className="cb-badge">Free</span>
                </div>
              </div>
              <ChevronsUpDown size={16} className="cb-chevron-icon" />
            </button>
          </div>

          {/* Search */}
          <div className="cb-sidebar-search">
            <Search size={16} className="cb-search-icon" />
            <span>Search...</span>
            <kbd>Ctrl K</kbd>
          </div>

          {/* Nav */}
          <nav className="cb-sidebar-nav">
            <a
              onClick={(e) => { e.preventDefault(); setLocation("/dashboard"); }}
              className={`cb-nav-item ${isActive("/dashboard") ? "cb-nav-item--active" : ""}`}
            >
              <Users size={20} />
              <span>Agents</span>
            </a>

            <a
              onClick={(e) => { e.preventDefault(); setLocation("/dashboard/analytics"); }}
              className={`cb-nav-item ${isActive("/dashboard/analytics") ? "cb-nav-item--active" : ""}`}
            >
              <Clock size={20} />
              <span>Usage</span>
            </a>

            {/* Workspace Settings - expandable */}
            <div className="cb-nav-group">
              <a
                onClick={(e) => { e.preventDefault(); setSettingsOpen(!settingsOpen); }}
                className={`cb-nav-item ${isSettingsActive ? "cb-nav-item--active" : ""}`}
              >
                <Settings size={20} />
                <span>Workspace settings</span>
                {settingsOpen ? <ChevronDown size={16} className="cb-nav-chevron" /> : <ChevronRight size={16} className="cb-nav-chevron" />}
              </a>
              {settingsOpen && (
                <div className="cb-nav-submenu">
                  <a onClick={(e) => { e.preventDefault(); setLocation("/dashboard/settings"); }} className={`cb-nav-subitem ${location === "/dashboard/settings" ? "cb-nav-subitem--active" : ""}`}>General</a>
                  <a onClick={(e) => { e.preventDefault(); setLocation("/dashboard/contacts"); }} className={`cb-nav-subitem ${location === "/dashboard/contacts" ? "cb-nav-subitem--active" : ""}`}>Members</a>
                  <a onClick={(e) => { e.preventDefault(); }} className="cb-nav-subitem">Plans</a>
                  <a onClick={(e) => { e.preventDefault(); }} className="cb-nav-subitem">Billing</a>
                  <a onClick={(e) => { e.preventDefault(); }} className="cb-nav-subitem">API keys</a>
                </div>
              )}
            </div>
          </nav>

          {/* Bottom */}
          <div className="cb-sidebar-bottom">
            <a className="cb-nav-item cb-docs-link" onClick={(e) => e.preventDefault()}>
              <BookOpen size={20} />
              <span>Documentation</span>
              <ExternalLink size={14} className="cb-external-icon" />
            </a>

            <div className="cb-messages-counter">
              <div className="cb-messages-header">
                <span>Messages</span>
                <span>0 / 50</span>
              </div>
              <div className="cb-messages-bar">
                <div className="cb-messages-fill" style={{ width: "0%" }} />
              </div>
              <span className="cb-messages-reset">Resets in 1 day</span>
            </div>

            <button className="cb-trial-btn">
              <Zap size={14} />
              Start free trial
            </button>

            <div className="cb-user-row">
              <div className="cb-user-avatar">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <button className="cb-user-menu" onClick={() => logout()}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="cb-main">{children}</main>
      </div>
    </div>
  );
}
