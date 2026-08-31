import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { preferencesApi } from "@/lib/trpc";
import { User, Bell, Shield, Save } from "lucide-react";
import "./Settings.css";

type Tab = "profile" | "notifications" | "preferences";

interface NotificationPrefs {
  emailNotifications: boolean;
  slackNotifications: boolean;
  weeklyDigest: boolean;
  agentNotifications: boolean;
}

interface PreferencePrefs {
  responseTone: "concise" | "professional" | "detailed";
  contextWindow: number;
  citeSources: boolean;
}

export default function Settings() {
  const { workspaceId, user } = useAuth();
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
  });

  const [preferences, setPreferences] = useState<PreferencePrefs>({
    responseTone: "professional",
    contextWindow: 4096,
    citeSources: true,
  });

  const { data: savedPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["preferences.get", workspaceId],
    queryFn: () => preferencesApi.get({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });

  const updateProfile = useMutation({
    mutationFn: preferencesApi.updateProfile,
  });

  const updatePrefs = useMutation({
    mutationFn: preferencesApi.update,
  });

  if (!workspaceId) {
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
  ];

  const handleSaveProfile = () => {
    updateProfile.mutate({
      workspaceId,
      name: profile.name,
      jobTitle: profile.jobTitle,
    });
  };

  const handleSaveNotifications = () => {
    updatePrefs.mutate({
      workspaceId,
      section: "notifications",
      ...notifications,
    });
  };

  const handleSavePreferences = () => {
    updatePrefs.mutate({
      workspaceId,
      section: "preferences",
      ...preferences,
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
              <p className="section-desc">
                Update your personal information
              </p>

              <div className="form-group">
                <label htmlFor="settings-name">Full Name</label>
                <input
                  id="settings-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-email">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  value={profile.email}
                  readOnly
                  className="readonly"
                />
                <span className="form-hint">Contact support to change your email</span>
              </div>

              <div className="form-group">
                <label htmlFor="settings-title">Job Title</label>
                <input
                  id="settings-title"
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={profile.jobTitle}
                  onChange={(e) =>
                    setProfile({ ...profile, jobTitle: e.target.value })
                  }
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
              >
                <Save size={16} />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <p className="section-desc">
                Choose how you want to be notified
              </p>

              <div className="toggle-group">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Email Notifications</span>
                    <span className="toggle-desc">
                      Receive updates about your workspace via email
                    </span>
                  </div>
                  <button
                    className={`toggle-switch ${notifications.emailNotifications ? "on" : ""}`}
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        emailNotifications: !notifications.emailNotifications,
                      })
                    }
                    role="switch"
                    aria-checked={notifications.emailNotifications}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Slack Notifications</span>
                    <span className="toggle-desc">
                      Get notified in your connected Slack channel
                    </span>
                  </div>
                  <button
                    className={`toggle-switch ${notifications.slackNotifications ? "on" : ""}`}
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        slackNotifications: !notifications.slackNotifications,
                      })
                    }
                    role="switch"
                    aria-checked={notifications.slackNotifications}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Weekly Digest</span>
                    <span className="toggle-desc">
                      Summary of activity and performance each week
                    </span>
                  </div>
                  <button
                    className={`toggle-switch ${notifications.weeklyDigest ? "on" : ""}`}
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        weeklyDigest: !notifications.weeklyDigest,
                      })
                    }
                    role="switch"
                    aria-checked={notifications.weeklyDigest}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Agent Notifications</span>
                    <span className="toggle-desc">
                      Alerts when agents complete tasks or encounter errors
                    </span>
                  </div>
                  <button
                    className={`toggle-switch ${notifications.agentNotifications ? "on" : ""}`}
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        agentNotifications: !notifications.agentNotifications,
                      })
                    }
                    role="switch"
                    aria-checked={notifications.agentNotifications}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleSaveNotifications}
                disabled={updatePrefs.isPending}
              >
                <Save size={16} />
                {updatePrefs.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="settings-section">
              <h2>Preferences</h2>
              <p className="section-desc">
                Configure how your AI agents behave
              </p>

              <div className="form-group">
                <label>Response Tone</label>
                <div className="radio-group">
                  {(["concise", "professional", "detailed"] as const).map(
                    (tone) => (
                      <label
                        key={tone}
                        className={`radio-option ${preferences.responseTone === tone ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="tone"
                          value={tone}
                          checked={preferences.responseTone === tone}
                          onChange={() =>
                            setPreferences({ ...preferences, responseTone: tone })
                          }
                        />
                        <span className="radio-label">
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </span>
                        <span className="radio-desc">
                          {tone === "concise"
                            ? "Short, to-the-point answers"
                            : tone === "professional"
                              ? "Balanced and formal"
                              : "Thorough, in-depth responses"}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ctx-window">Context Window (tokens)</label>
                <input
                  id="ctx-window"
                  type="number"
                  min={512}
                  max={32768}
                  step={512}
                  value={preferences.contextWindow}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      contextWindow: Number(e.target.value),
                    })
                  }
                />
                <span className="form-hint">
                  Number of tokens to consider for context. Default: 4096
                </span>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Cite Sources</span>
                  <span className="toggle-desc">
                    Include source references in agent responses
                  </span>
                </div>
                <button
                  className={`toggle-switch ${preferences.citeSources ? "on" : ""}`}
                  onClick={() =>
                    setPreferences({
                      ...preferences,
                      citeSources: !preferences.citeSources,
                    })
                  }
                  role="switch"
                  aria-checked={preferences.citeSources}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={handleSavePreferences}
                disabled={updatePrefs.isPending}
              >
                <Save size={16} />
                {updatePrefs.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
