import { useState } from "react";
import { format } from "date-fns";
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
  { icon: BarChart2, label: "Graficos e relatorios completos", free: true },
  { icon: Zap, label: "Transacoes ilimitadas", free: true },
  { icon: PiggyBank, label: "Metas de poupanca ilimitadas", free: false },
  { icon: ShoppingCart, label: "Listas de compras ilimitadas", free: false },
  { icon: Bell, label: "Lembretes de pagamento", free: false },
  { icon: Lock, label: "Parcelamento automatico de gastos", free: false },
  { icon: Crown, label: "Acesso prioritario a novidades", free: false },
];

export default function Premium() {
  const { currentUser, cancelSubscription } = useAuth();
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const isPremium = Boolean(currentUser?.has_premium_access);
  const cancellationScheduled = Boolean(currentUser?.subscription_canceled_at && currentUser?.subscription_expires_at);
  const canCancel = isPremium && currentUser?.role !== "admin" && !cancellationScheduled;
  const accessEndsLabel = currentUser?.subscription_expires_at
    ? format(new Date(currentUser.subscription_expires_at), "dd/MM/yyyy")
    : null;

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);

    try {
      await cancelSubscription();
      setCancelDialogOpen(false);
      toast({
        title: "Cancelamento agendado",
        description: "Seu plano premium seguira ativo ate o fim do ciclo atual.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel cancelar",
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
        <p className="text-muted-foreground mt-2">Desbloqueie todos os recursos e tenha controle total das suas financas.</p>
      </motion.div>

      {isPremium ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-6 text-center space-y-4"
        >
          <div>
            <Crown className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-bold">Voce ja e Premium!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {cancellationScheduled && accessEndsLabel
                ? `Seu cancelamento foi agendado. O acesso premium continua liberado ate ${accessEndsLabel}.`
                : "Aproveite todos os recursos desbloqueados."}
            </p>
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
                    O cancelamento nao bloqueia seu acesso imediatamente. Seus beneficios premium continuam ativos ate o fim do ciclo atual.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive hover:bg-destructive/90"
                    onClick={handleCancelSubscription}
                    disabled={loadingCancel}
                  >
                    {loadingCancel ? "Agendando..." : "Confirmar cancelamento"}
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
            <span className="text-lg opacity-70">/mes</span>
          </div>
          <p className="text-sm opacity-80">Cancele quando quiser. Sem compromisso.</p>
          <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold text-base h-12">
            <Crown className="h-4 w-4 mr-2" /> Assinar Agora
          </Button>
          <p className="text-xs opacity-60">Pagamento seguro · renovacao automatica mensal</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5 space-y-3"
      >
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">O que esta incluso</p>
        {features.map((feature) => (
          <div key={feature.label} className={`flex items-center gap-3 p-3 rounded-xl ${feature.free ? "opacity-70" : ""}`}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isPremium || feature.free ? "bg-primary/10" : "bg-muted"}`}>
              {isPremium || feature.free ? <feature.icon className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <span className={`text-sm font-medium ${!isPremium && !feature.free ? "text-muted-foreground" : "text-foreground"}`}>{feature.label}</span>
            <div className="ml-auto">
              {feature.free ? (
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Gratis</span>
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
