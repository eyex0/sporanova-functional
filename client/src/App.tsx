import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import IntelligencePublic from "./pages/IntelligencePublic";
import AgentsPublic from "./pages/AgentsPublic";
import SolutionsPage from "./pages/SolutionsPage";
import EnterprisePage from "./pages/EnterprisePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AppLayout from "./pages/original-app/AppLayout";
import Dashboard from "./pages/Dashboard";
import Intelligence from "./pages/Intelligence";
import Agents from "./pages/Agents";
import Data from "./pages/Data";
import Analytics from "./pages/Analytics";
import Automations from "./pages/Automations";
import Settings from "./pages/Settings";
import Decisions from "./pages/Decisions";
import Memory from "./pages/Memory";
import Activity from "./pages/Activity";
import Workspace from "./pages/Workspace";
import Playground from "./pages/Playground";
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
    return <div className="grid min-h-screen place-items-center bg-sn-white text-sm text-sn-400">Verifying session…</div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
      { path: "platform", Component: Platform },
      { path: "intelligence", Component: IntelligencePublic },
      { path: "agents", Component: AgentsPublic },
      { path: "solutions", Component: SolutionsPage },
      { path: "enterprise", Component: EnterprisePage },
      { path: "about", Component: AboutPage },
      { path: "contact", Component: ContactPage },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "auth/signin", Component: Login },
      { path: "auth/signup", Component: Signup },
      { path: "forgot-password", Component: ForgotPassword },
      {
        path: "app",
        Component: ProtectedApplication,
        children: [
          { index: true, Component: Dashboard },
          { path: "dashboard", Component: Dashboard },
          { path: "intelligence", Component: Intelligence },
          { path: "decisions", Component: Decisions },
          { path: "agents", Component: Agents },
          { path: "agents/:agentId/playground", Component: Playground },
          { path: "agents/:agentId/backstage", Component: Playground },
          { path: "agents/:agentId/build", Component: Playground },
          { path: "agents/:agentId/activity", Component: Activity },
          { path: "agents/:agentId/analytics", Component: Analytics },
          { path: "agents/:agentId/contacts", Component: Agents },
          { path: "agents/:agentId/channels", Component: Agents },
          { path: "agents/:agentId/integrations", Component: Agents },
          { path: "agents/:agentId/outbound", Component: Agents },
          { path: "agents/:agentId/settings", Component: Settings },
          { path: "data", Component: Data },
          { path: "memory", Component: Memory },
          { path: "analytics", Component: Analytics },
          { path: "automations", Component: Automations },
          { path: "activity", Component: Activity },
          { path: "workspace", Component: Workspace },
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
