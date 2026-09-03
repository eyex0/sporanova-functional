import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { preferencesApi } from "@/lib/trpc";
import { User, Bell, Shield, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "./Settings.css";

type Tab = "profile" | "notifications" | "preferences" | "security";

interface NotificationPrefs {
  emailNotifications: boolean;
  slackNotifications: boolean;
  weeklyDigest: boolean;
  agentNotifications: boolean;
  anomalyNotifications: boolean;
  reportNotifications: boolean;
}

interface PreferencePrefs {
  responseTone: "concise" | "professional" | "detailed";
  contextWindow: boolean;
  citeSources: boolean;
  proactiveInsights: boolean;
}

export default function Settings() {
  const { workspaceId, user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    jobTitle: "",
  });

  const [notifications, setNotifications] = useState<NotificationPrefs>({
    emailNotifications: true,
    slackNotifications: false,
    weeklyDigest: true,
    agentNotifications: true,
    anomalyNotifications: true,
    reportNotifications: false,
  });

  const [preferences, setPreferences] = useState<PreferencePrefs>({
    responseTone: "professional",
    contextWindow: true,
    citeSources: true,
    proactiveInsights: false,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: savedPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["preferences.get", workspaceId],
    queryFn: () => preferencesApi.get({ workspaceId: workspaceId! }) as Promise<any>,
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (!savedPrefs) return;
    if (savedPrefs.profile) {
      setProfile(p => ({ ...p, name: savedPrefs.profile.name ?? p.name, email: savedPrefs.profile.email ?? p.email, jobTitle: savedPrefs.profile.jobTitle ?? "" }));
    }
    const pref = savedPrefs.preferences;
    if (pref) {
      setNotifications({
        emailNotifications: pref.emailNotifications ?? true,
        slackNotifications: pref.slackNotifications ?? false,
        weeklyDigest: pref.weeklyDigest ?? true,
        agentNotifications: pref.agentNotifications ?? true,
        anomalyNotifications: pref.anomalyNotifications ?? true,
        reportNotifications: pref.reportNotifications ?? false,
      });
      setPreferences({
        responseTone: pref.responseTone ?? "professional",
        contextWindow: pref.extendedContextWindow ?? true,
        citeSources: pref.citeSources ?? true,
        proactiveInsights: pref.proactiveInsights ?? false,
      });
    }
  }, [savedPrefs]);

  const updateProfile = useMutation({
    mutationFn: (input: { name: string; jobTitle?: string }) => preferencesApi.updateProfile(input),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["preferences.get"] });
      refreshUser?.();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const updatePrefs = useMutation({
    mutationFn: (input: Record<string, unknown>) => preferencesApi.update({ workspaceId: workspaceId!, ...input } as any),
    onSuccess: () => {
      toast.success("Preferences saved");
      queryClient.invalidateQueries({ queryKey: ["preferences.get"] });
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  if (!workspaceId || prefsLoading) {
    return (
      <div className="settings-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "preferences", label: "Preferences", icon: <Shield size={16} /> },
    { key: "security", label: "Security", icon: <Eye size={16} /> },
  ];

  const handleSaveProfile = () => {
    updateProfile.mutate({
      name: profile.name,
      jobTitle: profile.jobTitle || null,
    });
  };

  const handleSaveNotifications = () => {
    updatePrefs.mutate({ workspaceId, ...notifications });
  };

  const handleSavePreferences = () => {
    updatePrefs.mutate({
      workspaceId,
      responseTone: preferences.responseTone,
      extendedContextWindow: preferences.contextWindow,
      citeSources: preferences.citeSources,
      proactiveInsights: preferences.proactiveInsights,
    });
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and workspace preferences</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          {activeTab === "profile" && (
            <div className="settings-section">
              <h2>Profile</h2>
              <p className="section-desc">Update your personal information</p>

              <div className="form-group">
                <label htmlFor="settings-name">Full Name</label>
                <input id="settings-name" type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="settings-email">Email</label>
                <input id="settings-email" type="email" value={profile.email} readOnly className="readonly" />
                <span className="form-hint">Contact support to change your email</span>
              </div>

              <div className="form-group">
                <label htmlFor="settings-title">Job Title</label>
                <input id="settings-title" type="text" placeholder="e.g. Software Engineer" value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
              </div>

              <button className="btn-primary" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                <Save size={16} />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <p className="section-desc">Choose how you want to be notified</p>

              <div className="toggle-group">
                {[
                  { key: "emailNotifications", label: "Email Notifications", desc: "Receive updates about your workspace via email" },
                  { key: "slackNotifications", label: "Slack Notifications", desc: "Get notified in your connected Slack channel" },
                  { key: "weeklyDigest", label: "Weekly Digest", desc: "Summary of activity and performance each week" },
                  { key: "agentNotifications", label: "Agent Notifications", desc: "Alerts when agents complete tasks or encounter errors" },
                  { key: "anomalyNotifications", label: "Anomaly Alerts", desc: "Be alerted about unusual activity" },
                  { key: "reportNotifications", label: "Report Ready", desc: "Get notified when scheduled reports are ready" },
                ].map((row) => (
                  <div className="toggle-row" key={row.key}>
                    <div className="toggle-info">
                      <span className="toggle-label">{row.label}</span>
                      <span className="toggle-desc">{row.desc}</span>
                    </div>
                    <button
                      className={`toggle-switch ${(notifications as any)[row.key] ? "on" : ""}`}
                      onClick={() => setNotifications({ ...notifications, [row.key]: !(notifications as any)[row.key] })}
                      role="switch"
                      aria-checked={(notifications as any)[row.key]}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={handleSaveNotifications} disabled={updatePrefs.isPending}>
                <Save size={16} />
                {updatePrefs.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="settings-section">
              <h2>Preferences</h2>
              <p className="section-desc">Configure how your AI agents behave</p>

              <div className="form-group">
                <label>Response Tone</label>
                <div className="radio-group">
                  {(["concise", "professional", "detailed"] as const).map((tone) => (
                    <label key={tone} className={`radio-option ${preferences.responseTone === tone ? "selected" : ""}`}>
                      <input type="radio" name="tone" value={tone} checked={preferences.responseTone === tone} onChange={() => setPreferences({ ...preferences, responseTone: tone })} />
                      <span className="radio-label">{tone.charAt(0).toUpperCase() + tone.slice(1)}</span>
                      <span className="radio-desc">
                        {tone === "concise" ? "Short, to-the-point answers" : tone === "professional" ? "Balanced and formal" : "Thorough, in-depth responses"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Extended Context Window</span>
                  <span className="toggle-desc">Use larger context for more accurate responses (uses more tokens)</span>
                </div>
                <button className={`toggle-switch ${preferences.contextWindow ? "on" : ""}`} onClick={() => setPreferences({ ...preferences, contextWindow: !preferences.contextWindow })} role="switch" aria-checked={preferences.contextWindow}>
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Cite Sources</span>
                  <span className="toggle-desc">Include source references in agent responses</span>
                </div>
                <button className={`toggle-switch ${preferences.citeSources ? "on" : ""}`} onClick={() => setPreferences({ ...preferences, citeSources: !preferences.citeSources })} role="switch" aria-checked={preferences.citeSources}>
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Proactive Insights</span>
                  <span className="toggle-desc">Receive AI-suggested insights about your data</span>
                </div>
                <button className={`toggle-switch ${preferences.proactiveInsights ? "on" : ""}`} onClick={() => setPreferences({ ...preferences, proactiveInsights: !preferences.proactiveInsights })} role="switch" aria-checked={preferences.proactiveInsights}>
                  <span className="toggle-knob" />
                </button>
              </div>

              <button className="btn-primary" onClick={handleSavePreferences} disabled={updatePrefs.isPending}>
                <Save size={16} />
                {updatePrefs.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="settings-section">
              <h2>Security</h2>
              <p className="section-desc">Manage your account security</p>

              <div className="security-info-card">
                <div>
                  <h3>Password</h3>
                  <p>Last changed: never (set during registration)</p>
                </div>
                <span className="sp-coming-soon-badge">Coming Soon</span>
              </div>

              <div className="security-info-card">
                <div>
                  <h3>Two-Factor Authentication</h3>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <span className="sp-coming-soon-badge">Coming Soon</span>
              </div>

              <div className="security-info-card">
                <div>
                  <h3>Active Sessions</h3>
                  <p>Manage devices currently signed in to your account</p>
                </div>
                <span className="sp-coming-soon-badge">Coming Soon</span>
              </div>

              <div className="security-danger-zone">
                <h3><AlertTriangle size={16} /> Danger Zone</h3>
                <p>Once you delete your account, there is no going back.</p>
                <span className="sp-coming-soon-badge">Coming Soon</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
