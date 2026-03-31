import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import Layout from "./components/Layout";
import PremiumFeatureGate from "./components/PremiumFeatureGate";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Savings from "./pages/Savings";
import ShoppingList from "./pages/ShoppingList";
import Reminders from "./pages/Reminders";
import Premium from "./pages/Premium";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import VerifyEmail from "./pages/VerifyEmail";

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/verificar-email" element={<VerifyEmail />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/transacoes" element={<Transactions />} />
        <Route
          path="/orcamentos"
          element={
            <PremiumFeatureGate featureName="Orcamentos">
              <Budgets />
            </PremiumFeatureGate>
          }
        />
        <Route
          path="/poupanca"
          element={
            <PremiumFeatureGate featureName="Poupanca">
              <Savings />
            </PremiumFeatureGate>
          }
        />
        <Route
          path="/lista-compras"
          element={
            <PremiumFeatureGate featureName="Lista de Compras">
              <ShoppingList />
            </PremiumFeatureGate>
          }
        />
        <Route
          path="/lembretes"
          element={
            <PremiumFeatureGate featureName="Lembretes">
              <Reminders />
            </PremiumFeatureGate>
          }
        />
        <Route path="/premium" element={<Premium />} />
        <Route path="/meu-perfil" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
