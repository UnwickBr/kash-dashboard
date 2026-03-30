import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, ShoppingCart, Menu, X, Sun, Moon, Bell, Crown, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "Painel", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/orcamentos", label: "Orçamentos", icon: Target },
  { path: "/poupanca", label: "Poupança", icon: PiggyBank },
  { path: "/lista-compras", label: "Lista de Compras", icon: ShoppingCart },
  { path: "/lembretes", label: "Lembretes", icon: Bell },
  { path: "/premium", label: "Premium", icon: Crown },
];

export default function Layout() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const toggleDark = () => setDark((d) => !d);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-6 fixed h-full">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-blue-500">Kash</span><span className="text-white"> Dashboard</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Gestão financeira pessoal</p>
          </div>
          <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-secondary transition-colors mt-0.5">
            {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {currentUser?.role === "admin" && (
          <Link to="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              location.pathname === "/admin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
        <div className="pt-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">Kash Dashboard © 2026</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-blue-500">Kash</span><span className="text-foreground"> Dashboard</span>
        </h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-secondary">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-card border-b border-border p-4 shadow-lg"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {currentUser?.role === "admin" && (
                <Link to="/admin" onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}>
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}