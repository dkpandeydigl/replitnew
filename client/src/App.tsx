import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import CalendarPage from "@/pages/calendar-page";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// This component uses the auth context
function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // If user is logged in and trying to access auth page, redirect to home
  if (user && location === "/auth") {
    return <Redirect to="/" />;
  }

  // If user is not logged in and not on auth page, redirect to auth page
  if (!user && location !== "/auth") {
    return <Redirect to="/auth" />;
  }

  return (
    <Switch>
      <Route path="/" component={CalendarPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// App is responsible for setting up the providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
