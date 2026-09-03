import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Eye, EyeOff, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import PublicNav from "@/components/PublicNav";
import { useAuth } from "@/contexts/AuthContext";
import "./auth-flow.css";

type AuthMode = "signup" | "signin";

export default function AuthFlow({ mode }: { mode: AuthMode }) {
  const [, setLocation] = useLocation();
  const { login, register, error, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState("");
  const isSignup = mode === "signup";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await register(name, email, password, organization);
      } else {
        await login(email, password);
      }
      setComplete(true);
    } catch {
      // error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <div className="auth-site">
        <PublicNav />
        <main className="auth-complete">
          <div className="auth-complete-left">
            <span className="auth-index">01 / {isSignup ? "Workspace ready" : "Signed in"}</span>
            <div className="auth-success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h1>
              {isSignup ? (
                <>Your agent workspace<br /><em>is ready to start.</em></>
              ) : (
                <>You are signed in<br /><em>and ready to build.</em></>
              )}
            </h1>
            <p>
              {isSignup
                ? "Your workspace is set up and ready to go. Start building your first AI agent."
                : "Welcome back. Your workspace is ready."}
            </p>
            <button className="auth-primary auth-primary-lg" onClick={() => setLocation("/dashboard")}>
              Go to dashboard <ArrowRight size={18} />
            </button>
          </div>
          <aside className="auth-complete-aside">
            <div className="auth-complete-visual">
              <div className="auth-orbit-ring auth-orbit-1" />
              <div className="auth-orbit-ring auth-orbit-2" />
              <div className="auth-orbit-ring auth-orbit-3" />
              <div className="auth-orbit-center">
                <CheckCircle2 size={28} />
              </div>
            </div>
            <div className="auth-complete-stats">
              <div className="auth-stat">
                <span className="auth-stat-value">2.4s</span>
                <span className="auth-stat-label">Avg response</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-value">99.9%</span>
                <span className="auth-stat-label">Uptime</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-value">150+</span>
                <span className="auth-stat-label">Integrations</span>
              </div>
            </div>
            <span className="auth-aside-text">Workspace ready,<br />ready to build.</span>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-site">
      <PublicNav />
      <main className="auth-page">
        <section className="auth-intro">
          <Link href="/" className="auth-back">
            <ArrowLeft size={15} /> Back to SOPRANOVA
          </Link>

          <div className="auth-intro-content">
            <span className="auth-index">{isSignup ? "Start free" : "Welcome back"}</span>
            <h1>
              {isSignup ? (
                <>Build your first AI agent,<br /><em>without the wait.</em></>
              ) : (
                <>Sign in and keep<br /><em>the work moving.</em></>
              )}
            </h1>
            <p>
              {isSignup
                ? "Start with trusted data, a clear objective and the channels where your customers already are."
                : "Enter your details to return to your workspace."}
            </p>
          </div>

          <div className="auth-hero-visual">
            <div className="auth-gradient-orb auth-orb-1" />
            <div className="auth-gradient-orb auth-orb-2" />
            <div className="auth-gradient-orb auth-orb-3" />
            <div className="auth-hero-card">
              <div className="auth-hero-card-header">
                <Sparkles size={16} />
                <span>SOPRANOVA Agent</span>
                <span className="auth-hero-badge">Active</span>
              </div>
              <div className="auth-hero-card-body">
                <div className="auth-hero-msg auth-hero-msg-user">
                  <span>How can I help you today?</span>
                </div>
                <div className="auth-hero-msg auth-hero-msg-bot">
                  <div className="auth-hero-msg-avatar">S</div>
                  <span>I'll help you set up your workspace in under 2 minutes.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-trust-bar">
            <div className="auth-trust-item">
              <Shield size={14} />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="auth-trust-divider" />
            <div className="auth-trust-item">
              <Zap size={14} />
              <span>99.9% Uptime</span>
            </div>
            <div className="auth-trust-divider" />
            <div className="auth-trust-item">
              <Globe size={14} />
              <span>24/7 Support</span>
            </div>
          </div>

          <div className="auth-stats-row">
            <div className="auth-stat-card">
              <span className="auth-stat-number">10K+</span>
              <span className="auth-stat-desc">Active agents</span>
            </div>
            <div className="auth-stat-card">
              <span className="auth-stat-number">50M+</span>
              <span className="auth-stat-desc">Messages handled</span>
            </div>
            <div className="auth-stat-card">
              <span className="auth-stat-number">4.9/5</span>
              <span className="auth-stat-desc">Customer rating</span>
            </div>
          </div>
        </section>

        <section className="auth-form-wrap">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <span className="auth-form-eyebrow">{isSignup ? "Create your workspace" : "Account access"}</span>
              <h2>{isSignup ? "Tell us where to begin." : "Welcome back."}</h2>
              <p className="auth-form-subtitle">
                {isSignup
                  ? "Fill in the details below to get started in seconds."
                  : "Sign in to access your dashboard and agents."}
              </p>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="auth-form" aria-busy={loading}>
              {isSignup && (
                <label className="auth-field">
                  <span className="auth-field-label">Full name</span>
                  <input
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError(); }}
                  />
                </label>
              )}
              <label className="auth-field">
                <span className="auth-field-label">Work email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                />
              </label>
              <label className="auth-field auth-password-field">
                <span className="auth-field-label">Password</span>
                <div className="auth-password-wrap">
                  <input
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {!isSignup && (
                <div className="auth-forgot-row">
                  <Link href="/auth/forgot-password" className="auth-forgot-link">Forgot password?</Link>
                </div>
              )}
              {isSignup && (
                <label className="auth-field">
                  <span className="auth-field-label">Company name <span className="auth-optional">(optional)</span></span>
                  <input
                    autoComplete="organization"
                    placeholder="Your company"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </label>
              )}
              <button className="auth-primary auth-submit" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="loading-wheel" /> {isSignup ? "Creating workspace..." : "Signing in..."}</>
                ) : (
                  <>{isSignup ? "Create your workspace" : "Sign in"} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="auth-social-buttons">
              <button type="button" className="auth-social-btn" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
              <button type="button" className="auth-social-btn" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Continue with GitHub
              </button>
            </div>

            <p className="auth-legal">
              <LockKeyhole size={13} /> Protected by encryption. Your data stays yours.
            </p>
          </div>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to SOPRANOVA?"}{" "}
            <Link href={isSignup ? "/auth/signin" : "/auth/signup"}>
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
