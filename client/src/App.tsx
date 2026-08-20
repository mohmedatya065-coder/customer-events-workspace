import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AssistantPage from "./pages/AssistantPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import DataOpsPage from "./pages/DataOpsPage";
import HealthPage from "./pages/HealthPage";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/assistant" component={AssistantPage} />
        <Route path="/data-ops" component={DataOpsPage} />
        <Route path="/health" component={HealthPage} />
        <Route path="/customers/:id">{params => <CustomerDetailPage id={Number(params.id)} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider><Toaster /><Router /></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
