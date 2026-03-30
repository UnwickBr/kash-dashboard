import { motion } from "framer-motion";
import { Crown, Check, Lock, Zap, PiggyBank, ShoppingCart, Bell, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

const features = [
  { icon: BarChart2, label: "Gráficos e relatórios completos", free: true },
  { icon: Zap, label: "Transações ilimitadas", free: true },
  { icon: PiggyBank, label: "Metas de poupança ilimitadas", free: false },
  { icon: ShoppingCart, label: "Listas de compras ilimitadas", free: false },
  { icon: Bell, label: "Lembretes de pagamento", free: false },
  { icon: Lock, label: "Parcelamento automático de gastos", free: false },
  { icon: Crown, label: "Acesso prioritário a novidades", free: false },
];

export default function Premium() {
  const { currentUser } = useAuth();
  const isPremium = currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.subscription_status === "active";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-400/20 flex items-center justify-center mx-auto mb-4">
          <Crown className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Kash Premium</h1>
        <p className="text-muted-foreground mt-2">Desbloqueie todos os recursos e tenha controle total das suas finanças.</p>
      </motion.div>

      {isPremium ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-6 text-center">
          <Crown className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <p className="text-lg font-bold">Você já é Premium! 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">Aproveite todos os recursos desbloqueados.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-primary rounded-2xl p-6 text-primary-foreground text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Plano Premium</p>
          <div>
            <span className="text-5xl font-bold">R$ 20</span>
            <span className="text-lg opacity-70">/mês</span>
          </div>
          <p className="text-sm opacity-80">Cancele quando quiser. Sem compromisso.</p>
          <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold text-base h-12">
            <Crown className="h-4 w-4 mr-2" /> Assinar Agora
          </Button>
          <p className="text-xs opacity-60">Pagamento seguro · Renovação automática mensal</p>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">O que está incluso</p>
        {features.map((f, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${f.free ? "opacity-70" : ""}`}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isPremium || f.free ? "bg-primary/10" : "bg-muted"}`}>
              {isPremium || f.free ? <f.icon className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <span className={`text-sm font-medium ${!isPremium && !f.free ? "text-muted-foreground" : "text-foreground"}`}>{f.label}</span>
            <div className="ml-auto">
              {f.free ? (
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Grátis</span>
              ) : isPremium ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}