import { Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProfilePage from "@/pages/profile-page";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      {/* Main routes */}
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      
      {/* Dashboard tabs as routes - redirecting to DashboardPage */}
      <ProtectedRoute path="/user-management" component={DashboardPage} />
      <ProtectedRoute path="/hierarchy" component={DashboardPage} />
      <ProtectedRoute path="/assignments" component={DashboardPage} />
      <ProtectedRoute path="/attendance" component={DashboardPage} />
      <ProtectedRoute path="/visit-reports" component={DashboardPage} />
      <ProtectedRoute path="/sales-reports" component={DashboardPage} />
      <ProtectedRoute path="/products" component={DashboardPage} />
      <ProtectedRoute path="/verification-reports" component={DashboardPage} />
      <ProtectedRoute path="/verification-management" component={DashboardPage} />
      <ProtectedRoute path="/documents" component={DashboardPage} />
      
      {/* Auth and not found */}
      <Route path="/auth" component={AuthPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="orgmanager-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

// Custom wouter Route component since it wasn't imported
function Route(props: { path?: string; component: () => JSX.Element }) {
  const { component: Component } = props;
  return <Component />;
}
