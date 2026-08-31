import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AppLayout from "./pages/original-app/AppLayout";
import Backstage from "./pages/Backstage";
import Agents from "./pages/Agents";
import Playground from "./pages/Playground";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";
import Data from "./pages/Data";
import Conversations from "./pages/Conversations";
import Contacts from "./pages/Contacts";
import Channels from "./pages/Channels";
import Integrations from "./pages/Integrations";
import Helpdesk from "./pages/Helpdesk";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";

function PageTransitionWrapper() {
  return (
    <PageTransition>
      <Outlet />
    </PageTransition>
  );
}

function ProtectedApplication() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", color: "#6B7280", fontSize: 14 }}>Verifying session...</div>;
  }
  if (!isAuthenticated) return <Navigate to="/auth/signin" replace />;
  return (
    <WorkspaceProvider>
      <AppLayout />
    </WorkspaceProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: PageTransitionWrapper,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "auth/signin", Component: Login },
      { path: "auth/signup", Component: Signup },
      { path: "forgot-password", Component: ForgotPassword },
      {
        path: "dashboard",
        Component: ProtectedApplication,
        children: [
          { index: true, Component: Backstage },
          { path: "playground", Component: Playground },
          { path: "playground/instructions", Component: Playground },
          { path: "playground/procedures", Component: Playground },
          { path: "playground/suggestions", Component: Playground },
          { path: "agents", Component: Agents },
          { path: "conversations", Component: Conversations },
          { path: "collected-data", Component: Data },
          { path: "data-sources", Component: Data },
          { path: "analytics", Component: Analytics },
          { path: "analytics/topics", Component: Analytics },
          { path: "analytics/sentiment", Component: Analytics },
          { path: "contacts", Component: Contacts },
          { path: "channels", Component: Channels },
          { path: "integrations", Component: Integrations },
          { path: "outbound", Component: Activity },
          { path: "helpdesk", Component: Helpdesk },
          { path: "getting-started", Component: Activity },
          { path: "settings", Component: Settings },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
