import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  PiggyBank,
  ShoppingCart,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  Crown,
  Shield,
  LogOut,
  UserRound,
  Lock,
  CircleHelp,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import kashLogo from "@/assets/kash-logo.png";

const navItems = [
  {
    path: "/",
    label: "Painel",
    icon: LayoutDashboard,
    description: "Veja seu resumo financeiro, saldo do período, gráficos e movimentações recentes.",
  },
  {
    path: "/transacoes",
    label: "Transações",
    icon: ArrowLeftRight,
    description: "Cadastre, filtre e acompanhe todas as suas receitas e despesas.",
  },
  {
    path: "/orcamentos",
    label: "Orçamentos",
    icon: Target,
    premiumOnly: true,
    description: "Defina limites por categoria e acompanhe quanto ainda pode gastar.",
  },
  {
    path: "/poupanca",
    label: "Poupança",
    icon: PiggyBank,
    premiumOnly: true,
    description: "Crie metas de economia e acompanhe sua evolução ao longo do tempo.",
  },
  {
    path: "/lista-compras",
    label: "Lista de Compras",
    icon: ShoppingCart,
    premiumOnly: true,
    description: "Organize itens e acompanhe listas de compra pendentes ou concluídas.",
  },
  {
    path: "/lembretes",
    label: "Lembretes",
    icon: Bell,
    premiumOnly: true,
    description: "Cadastre contas a vencer e sincronize lembretes com o Google Agenda.",
  },
  {
    path: "/premium",
    label: "Premium",
    icon: Crown,
    description: "Veja benefícios, status da assinatura e opções do plano premium.",
  },
];

const profileItem = {
  path: "/meu-perfil",
  label: "Meu perfil",
  icon: UserRound,
  description: "Atualize seus dados pessoais, data de nascimento e senha da conta.",
};

const adminItem = {
  path: "/admin",
  label: "Admin",
  icon: Shield,
  description: "Gerencie usuários, permissões e informações administrativas do sistema.",
};

function NavInfoButton({ label, description, active }) {
  return (
    <Popover>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  active
                    ? "text-primary-foreground/80 hover:bg-primary-foreground/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-label={`Saiba mais sobre ${label}`}
              >
                <CircleHelp className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-64 text-xs leading-5">
            {description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" side="right" className="max-w-72 rounded-xl">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </PopoverContent>
    </Popover>
  );
}

function NavLinkItem({ item, active, locked, onClick, compact = false }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      } ${compact ? "min-h-12 rounded-xl" : ""}`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
      <NavInfoButton label={item.label} description={item.description} active={active} />
    </Link>
  );
}

export default function Layout() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleDark = () => setDark((current) => !current);
  const isPremiumUser = Boolean(currentUser?.has_premium_access);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card p-6 fixed h-full">
        <div className="mb-10 flex items-start justify-between">
          <div className="min-w-0">
            <img
              src={kashLogo}
              alt="Kash Dashboard"
              className="h-auto w-[210px] max-w-full object-contain"
            />
            <p className="text-xs text-muted-foreground mt-2">Gestão financeira pessoal</p>
          </div>
          <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-secondary transition-colors mt-0.5">
            {dark ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLinkItem
              key={item.path}
              item={item}
              active={location.pathname === item.path}
              locked={item.premiumOnly && !isPremiumUser}
            />
          ))}
        </nav>

        {currentUser?.role === "admin" && (
          <NavLinkItem
            item={adminItem}
            active={location.pathname === adminItem.path}
            locked={false}
          />
        )}

        <div className="pt-4 border-t border-border space-y-4">
          <div className="rounded-2xl bg-secondary/70 p-3">
            <p className="text-xs font-semibold text-foreground truncate">{currentUser?.full_name || "Usuário"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">{currentUser?.email}</p>
          </div>
          <Link
            to={profileItem.path}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              location.pathname === profileItem.path
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <profileItem.icon className="h-4 w-4" />
            <span>{profileItem.label}</span>
            <NavInfoButton
              label={profileItem.label}
              description={profileItem.description}
              active={location.pathname === profileItem.path}
            />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
          <p className="text-[10px] text-muted-foreground text-center">Kash Dashboard (c) 2026</p>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img
          src={kashLogo}
          alt="Kash Dashboard"
          className="h-auto w-[188px] max-w-full object-contain"
        />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-secondary"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden fixed top-[calc(4.5rem+env(safe-area-inset-top))] left-3 right-3 z-40 rounded-2xl bg-card border border-border p-3 shadow-lg"
            >
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLinkItem
                    key={item.path}
                    item={item}
                    active={location.pathname === item.path}
                    locked={item.premiumOnly && !isPremiumUser}
                    onClick={() => setMobileOpen(false)}
                    compact
                  />
                ))}
                <Link
                  to={profileItem.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-12 items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === profileItem.path
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <profileItem.icon className="h-4 w-4" />
                  <span className="flex-1">{profileItem.label}</span>
                  <NavInfoButton
                    label={profileItem.label}
                    description={profileItem.description}
                    active={location.pathname === profileItem.path}
                  />
                </Link>
                {currentUser?.role === "admin" && (
                  <NavLinkItem
                    item={adminItem}
                    active={location.pathname === adminItem.path}
                    locked={false}
                    onClick={() => setMobileOpen(false)}
                    compact
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex min-h-12 items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
