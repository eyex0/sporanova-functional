/** Reference style: application routes expose the full editorial public-site information architecture. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Backstage from "./pages/Backstage";
import Dashboard from "./pages/Dashboard";
import Playground from "./pages/Playground";
import Channels from "./pages/Channels";
import Integrations from "./pages/Integrations";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Outbound from "./pages/Outbound";
import Helpdesk from "./pages/Helpdesk";
import GettingStarted from "./pages/GettingStarted";
import Conversations from "./pages/Conversations";
import Workflows from "./pages/Workflows";
import Analytics from "./pages/Analytics";
import Topics from "./pages/Topics";
import Sentiment from "./pages/Sentiment";
import DataSources from "./pages/DataSources";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import ReferenceSolutionPage from "./pages/ReferenceSolutionPage";
import AuthFlow from "./pages/AuthFlow";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RouteTransition from "./components/RouteTransition";
import Home from "./pages/Home";
import CustomerStoryDetail from "./pages/CustomerStoryDetail";
import { ArticlePage, BlogPage, ChangelogPage, CustomersPage, DocsPage, EnterprisePage, GuidePage, PricingPage, ResourcesPage, SolutionDetailPage, SolutionsPage } from "./pages/PublicPages";


function Router() {
  return (
    <RouteTransition><Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth/signup"}>{() => <AuthFlow mode="signup" />}</Route>
      <Route path={"/auth/signin"}>{() => <AuthFlow mode="signin" />}</Route>
      <Route path="/auth/forgot-password">{() => <ForgotPassword />}</Route>
      <Route path="/auth/reset-password">{() => <ResetPassword />}</Route>
      <Route path="/dashboard">{() => <ProtectedRoute component={() => <DashboardLayout><Backstage /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/overview">{() => <ProtectedRoute component={() => <DashboardLayout><Dashboard /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/playground">{() => <ProtectedRoute component={() => <DashboardLayout><Playground /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/conversations">{() => <ProtectedRoute component={() => <DashboardLayout><Conversations /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/leads">{() => <ProtectedRoute component={() => <DashboardLayout><Leads /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/collected-data">{() => <ProtectedRoute component={() => <DashboardLayout><DataSources /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/workflows">{() => <ProtectedRoute component={() => <DashboardLayout><Workflows /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/analytics">{() => <ProtectedRoute component={() => <DashboardLayout><Analytics /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/analytics/topics">{() => <ProtectedRoute component={() => <DashboardLayout><Topics /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/analytics/sentiment">{() => <ProtectedRoute component={() => <DashboardLayout><Sentiment /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/contacts">{() => <ProtectedRoute component={() => <DashboardLayout><Contacts /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/channels">{() => <ProtectedRoute component={() => <DashboardLayout><Channels /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/integrations">{() => <ProtectedRoute component={() => <DashboardLayout><Integrations /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/outbound">{() => <ProtectedRoute component={() => <DashboardLayout><Outbound /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/helpdesk">{() => <ProtectedRoute component={() => <DashboardLayout><Helpdesk /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/data-sources">{() => <ProtectedRoute component={() => <DashboardLayout><DataSources /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/documents">{() => <ProtectedRoute component={() => <DashboardLayout><Documents /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/getting-started">{() => <ProtectedRoute component={() => <DashboardLayout><GettingStarted /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/settings">{() => <ProtectedRoute component={() => <DashboardLayout><Settings /></DashboardLayout>} />}</Route>
      <Route path="/dashboard/team">{() => <ProtectedRoute component={() => <DashboardLayout><Team /></DashboardLayout>} />}</Route>
      <Route path={"/use-cases/:slug"} component={ReferenceSolutionPage} />
      <Route path={"/industries/:slug"} component={ReferenceSolutionPage} />
      <Route path={"/features/:slug"} component={ReferenceSolutionPage} />
      <Route path={"/changelog/center-stage-is-live"} component={ChangelogPage} />
      <Route path={"/solutions/:slug"} component={SolutionDetailPage} />
      <Route path={"/solutions"} component={SolutionsPage} />
      <Route path={"/resources/guide"} component={GuidePage} />
      <Route path={"/resources"} component={ResourcesPage} />
      <Route path={"/blog/ai-agents-platform"} component={ArticlePage} />
      <Route path={"/blog/:slug"} component={ArticlePage} />
      <Route path={"/blog"} component={BlogPage} />
      <Route path={"/docs"} component={DocsPage} />
      <Route path={"/changelog"} component={ChangelogPage} />
      <Route path={"/customers/:slug"} component={CustomerStoryDetail} />
      <Route path={"/customers"} component={CustomersPage} />
      <Route path={"/enterprise"} component={EnterprisePage} />
      <Route path={"/pricing"} component={PricingPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch></RouteTransition>
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
