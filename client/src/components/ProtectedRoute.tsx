import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect, useLocation } from "wouter";

export function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, loading, onboardingCompleted } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!onboardingCompleted && location !== "/onboarding" && !location.startsWith("/onboarding")) {
      setLocation("/onboarding");
    }
  }, [loading, user, onboardingCompleted, location, setLocation]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#FAFAF8" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 28, height: 28, border: "3px solid #E8E6E1", borderTopColor: "#1A1F3C", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 12, fontSize: 13, color: "#6B7280" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth/signin" />;
  }

  if (!onboardingCompleted && location !== "/onboarding" && !location.startsWith("/onboarding")) {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}
