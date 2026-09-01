import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Link } from "wouter";
import PublicNav from "@/components/PublicNav";
import { authApi } from "@/lib/trpc";
import "./auth-flow.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.requestPasswordReset({ email });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-site">
        <PublicNav />
        <main className="auth-complete">
          <div>
            <span className="auth-index">01 / Check your email</span>
            <Mail size={34} />
            <h1>
              If an account exists with<br /><em>that email, you'll receive a reset link shortly.</em>
            </h1>
            <p>
              Check your inbox and follow the link to set a new password. The link expires in 60 minutes.
            </p>
            <Link href="/auth/signin" className="auth-primary">
              Back to sign in <ArrowRight size={16} />
            </Link>
          </div>
          <aside>
            <Mail size={28} />
            <span>Check your inbox,<br />reset your password.</span>
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
          <Link href="/auth/signin" className="auth-back">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
          <span className="auth-index">Password recovery</span>
          <h1>
            Reset your<br /><em>password.</em>
          </h1>
          <p>
            Enter the email address you signed up with and we'll send you a link to reset your password.
          </p>
          <div className="auth-points">
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> You'll receive a secure reset link</span>
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> Link expires in 60 minutes</span>
            <span><span style={{ color: "#4d9a68" }}>&#10003;</span> No data is lost</span>
          </div>
        </section>
        <section className="auth-form-wrap">
          <form onSubmit={submit} aria-busy={loading}>
            <span className="eyebrow">Forgot password</span>
            <h2>Enter your email.</h2>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label>
              Work email
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
            </label>
            <button className="auth-primary" type="submit" disabled={loading}>
              {loading ? (
                <><span className="loading-wheel" /> Sending reset link...</>
              ) : (
                <>Send reset link <ArrowRight size={16} /></>
              )}
            </button>
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
