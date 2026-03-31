import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Lock, Zap, PiggyBank, ShoppingCart, Bell, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { currentUser, cancelSubscription } = useAuth();
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const isPremium = currentUser?.role === "premium" || currentUser?.role === "admin" || currentUser?.subscription_status === "active";
  const canCancel = isPremium && currentUser?.role !== "admin";

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);

    try {
      await cancelSubscription();
      setCancelDialogOpen(false);
      toast({
        title: "Assinatura cancelada",
        description: "Seu plano premium foi cancelado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível cancelar",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setLoadingCancel(false);
    }
  };

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-6 text-center space-y-4"
        >
          <div>
            <Crown className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-bold">Você já é Premium!</p>
            <p className="text-sm text-muted-foreground mt-1">Aproveite todos os recursos desbloqueados.</p>
          </div>

          {canCancel && (
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancelar assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar assinatura premium?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação vai encerrar seu acesso ao plano premium e seus benefícios serão removidos após a confirmação.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive hover:bg-destructive/90"
                    onClick={handleCancelSubscription}
                    disabled={loadingCancel}
                  >
                    {loadingCancel ? "Cancelando..." : "Confirmar cancelamento"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-primary rounded-2xl p-6 text-primary-foreground text-center space-y-4"
        >
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5 space-y-3"
      >
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">O que está incluso</p>
        {features.map((feature) => (
          <div key={feature.label} className={`flex items-center gap-3 p-3 rounded-xl ${feature.free ? "opacity-70" : ""}`}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isPremium || feature.free ? "bg-primary/10" : "bg-muted"}`}>
              {isPremium || feature.free ? <feature.icon className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <span className={`text-sm font-medium ${!isPremium && !feature.free ? "text-muted-foreground" : "text-foreground"}`}>{feature.label}</span>
            <div className="ml-auto">
              {feature.free ? (
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
