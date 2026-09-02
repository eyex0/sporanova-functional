import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import RouteTransition from "./components/RouteTransition";
import Home from "./pages/Home";

import { ArticlePage, BlogPage, ChangelogPage, CustomersPage, DocsPage, EnterprisePage, GuidePage, PricingPage, ResourcesPage, SolutionDetailPage, SolutionsPage } from "./pages/PublicPages";

const AuthFlow = lazy(() => import("./pages/AuthFlow"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Backstage = lazy(() => import("./pages/Backstage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Playground = lazy(() => import("./pages/Playground"));
const Channels = lazy(() => import("./pages/Channels"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Leads = lazy(() => import("./pages/Leads"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Outbound = lazy(() => import("./pages/Outbound"));
const Helpdesk = lazy(() => import("./pages/Helpdesk"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Workflows = lazy(() => import("./pages/Workflows"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Topics = lazy(() => import("./pages/Topics"));
const Sentiment = lazy(() => import("./pages/Sentiment"));
const DataSources = lazy(() => import("./pages/DataSources"));
const Documents = lazy(() => import("./pages/Documents"));
const Settings = lazy(() => import("./pages/Settings"));
const Team = lazy(() => import("./pages/Team"));
const ReferenceSolutionPage = lazy(() => import("./pages/ReferenceSolutionPage"));
const CustomerStoryDetail = lazy(() => import("./pages/CustomerStoryDetail"));
const HaierDemo = lazy(() => import("./pages/HaierDemo"));
const Observability = lazy(() => import("./pages/Observability"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));

function DashboardFallback() {
  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="loading-spinner" />
      </div>
    </DashboardLayout>
  );
}

function PageFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div className="loading-spinner" />
    </div>
  );
}

function Router() {
  return (
    <RouteTransition>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth/signup">{() => <Suspense fallback={<PageFallback />}><AuthFlow mode="signup" /></Suspense>}</Route>
        <Route path="/auth/signin">{() => <Suspense fallback={<PageFallback />}><AuthFlow mode="signin" /></Suspense>}</Route>
        <Route path="/auth/forgot-password">{() => <Suspense fallback={<PageFallback />}><ForgotPassword /></Suspense>}</Route>
        <Route path="/auth/reset-password">{() => <Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>}</Route>

        <Route path="/dashboard">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Backstage /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/overview">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Dashboard /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/playground">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Playground /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/conversations">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Conversations /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/leads">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Leads /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/collected-data">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><DataSources /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/workflows">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Workflows /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/analytics">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Analytics /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/analytics/topics">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Topics /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/analytics/sentiment">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Sentiment /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/contacts">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Contacts /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/channels">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Channels /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/integrations">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Integrations /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/outbound">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Outbound /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/helpdesk">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Helpdesk /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/data-sources">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><DataSources /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/documents">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Documents /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/getting-started">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><GettingStarted /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/settings">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Settings /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/team">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Team /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/observability">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><Observability /></DashboardLayout></Suspense>} />}</Route>
        <Route path="/dashboard/api-keys">{() => <ProtectedRoute component={() => <Suspense fallback={<DashboardFallback />}><DashboardLayout><ApiKeys /></DashboardLayout></Suspense>} />}</Route>

        <Route path="/use-cases/:slug">{() => <Suspense fallback={<PageFallback />}><ReferenceSolutionPage /></Suspense>}</Route>
        <Route path="/industries/:slug">{() => <Suspense fallback={<PageFallback />}><ReferenceSolutionPage /></Suspense>}</Route>
        <Route path="/features/:slug">{() => <Suspense fallback={<PageFallback />}><ReferenceSolutionPage /></Suspense>}</Route>
        <Route path="/changelog/center-stage-is-live">{() => <ChangelogPage />}</Route>
        <Route path="/solutions/:slug">{() => <SolutionDetailPage />}</Route>
        <Route path="/solutions">{() => <SolutionsPage />}</Route>
        <Route path="/resources/guide">{() => <GuidePage />}</Route>
        <Route path="/resources">{() => <ResourcesPage />}</Route>
        <Route path="/blog/ai-agents-platform">{() => <ArticlePage />}</Route>
        <Route path="/blog/:slug">{() => <ArticlePage />}</Route>
        <Route path="/blog">{() => <BlogPage />}</Route>
        <Route path="/docs">{() => <DocsPage />}</Route>
        <Route path="/changelog">{() => <ChangelogPage />}</Route>
        <Route path="/customers/:slug">{() => <Suspense fallback={<PageFallback />}><CustomerStoryDetail /></Suspense>}</Route>
        <Route path="/customers">{() => <CustomersPage />}</Route>
        <Route path="/enterprise">{() => <EnterprisePage />}</Route>
        <Route path="/pricing">{() => <PricingPage />}</Route>
        <Route path="/haier-demo">{() => <Suspense fallback={<PageFallback />}><HaierDemo /></Suspense>}</Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </RouteTransition>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
