import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
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
          <div>
            <span className="auth-index">01 / {isSignup ? "Workspace ready" : "Signed in"}</span>
            <CheckCircle2 size={34} />
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
            <button className="auth-primary" onClick={() => setLocation("/dashboard")}>
              Go to dashboard <ArrowRight size={16} />
            </button>
          </div>
          <aside>
            <CheckCircle2 size={28} />
            <span>Workspace ready,<br />ready to build.</span>
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
          <div className="auth-points">
            <span><CheckCircle2 size={15} /> No credit card required</span>
            <span><CheckCircle2 size={15} /> Build in minutes</span>
            <span><CheckCircle2 size={15} /> Secure by default</span>
          </div>
        </section>
        <section className="auth-form-wrap">
          <form onSubmit={submit} aria-busy={loading}>
            <span className="eyebrow">{isSignup ? "Create your workspace" : "Account access"}</span>
            <h2>{isSignup ? "Tell us where to begin." : "Welcome back."}</h2>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {isSignup && (
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                />
              </label>
            )}
            <label>
              Work email
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
              />
            </label>
            <label>
              Password
              <input
                required
                minLength={12}
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
              />
            </label>
            {isSignup && (
              <label>
                Company name
                <input
                  autoComplete="organization"
                  placeholder="Your company (optional)"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </label>
            )}
            <button className="auth-primary" type="submit" disabled={loading}>
              {loading ? (
                <><i className="loading-wheel" /> Preparing your workspace</>
              ) : (
                <>{isSignup ? "Create your workspace" : "Sign in"} <ArrowRight size={16} /></>
              )}
            </button>
            <p className="auth-legal">
              <LockKeyhole size={13} /> Protected by encryption. Your data stays yours.
            </p>
          </form>
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
