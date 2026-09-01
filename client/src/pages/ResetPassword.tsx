import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import PublicNav from "@/components/PublicNav";
import { authApi } from "@/lib/trpc";
import "./auth-flow.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword({ token, password });
      setComplete(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "This reset link is invalid or has expired.");
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
            <span className="auth-index">01 / Password reset</span>
            <CheckCircle2 size={34} />
            <h1>
              Your password<br /><em>has been reset.</em>
            </h1>
            <p>
              You can now sign in with your new password.
            </p>
            <Link href="/auth/signin" className="auth-primary">
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
          <aside>
            <CheckCircle2 size={28} />
            <span>Password reset,<br />ready to sign in.</span>
          </aside>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-site">
        <PublicNav />
        <main className="auth-page">
          <section className="auth-intro">
            <Link href="/auth/signin" className="auth-back">
              <ArrowLeft size={15} /> Back to sign in
            </Link>
            <span className="auth-index">Invalid link</span>
            <h1>
              This reset link is<br /><em>invalid or expired.</em>
            </h1>
            <p>
              Password reset links expire after a short time. Please request a new one.
            </p>
          </section>
          <section className="auth-form-wrap">
            <span className="eyebrow">Reset password</span>
            <h2>Link expired.</h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
              The reset link you clicked is invalid or has already been used.
            </p>
            <Link href="/auth/forgot-password" className="auth-primary" style={{ display: "flex", textAlign: "center", marginTop: 24 }}>
              Request a new link <ArrowRight size={16} />
            </Link>
            <p className="auth-switch">
              Remember your password?{" "}
              <Link href="/auth/signin">Sign in</Link>
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-site">
      <PublicNav />
      <main className="auth-page">
        <section className="auth-intro">
          <Link href="/auth/signin" className="auth-back">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
          <span className="auth-index">Reset password</span>
          <h1>
            Set a new<br /><em>password.</em>
          </h1>
          <p>
            Choose a strong password that you don't use anywhere else.
          </p>
          <div className="auth-points">
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> At least 8 characters</span>
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> Mix letters, numbers, symbols</span>
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> Avoid common words</span>
          </div>
        </section>
        <section className="auth-form-wrap">
          <form onSubmit={submit} aria-busy={loading}>
            <span className="eyebrow">Reset password</span>
            <h2>Choose a new password.</h2>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label className="password-field">
              New password
              <div className="password-input-wrap">
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button className="auth-primary" type="submit" disabled={loading}>
              {loading ? (
                <><span className="loading-wheel" /> Resetting password...</>
              ) : (
                <>Reset password <ArrowRight size={16} /></>
              )}
            </button>
            <p className="auth-legal">
              <LockKeyhole size={13} /> Protected by encryption. Your data stays yours.
            </p>
          </form>
          <p className="auth-switch">
            Remember your password?{" "}
            <Link href="/auth/signin">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
