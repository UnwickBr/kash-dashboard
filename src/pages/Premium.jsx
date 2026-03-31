import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Crown, Check, Lock, Zap, PiggyBank, ShoppingCart, Bell, BarChart2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import PremiumCheckoutDialog from "@/components/PremiumCheckoutDialog";
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
  const { currentUser, cancelSubscription, createPremiumCheckout, activatePremiumTrial, syncPremiumStatus } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  const isPremium = Boolean(currentUser?.has_premium_access);
  const isTrialing = currentUser?.subscription_status === "trialing";
  const cancellationScheduled = Boolean(currentUser?.subscription_canceled_at && currentUser?.subscription_expires_at);
  const canCancel = isPremium && currentUser?.role !== "admin" && !cancellationScheduled;
  const accessEndsLabel = currentUser?.subscription_expires_at
    ? format(new Date(currentUser.subscription_expires_at), "dd/MM/yyyy")
    : null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkoutStatus = params.get("checkout");

    if (!checkoutStatus) {
      return;
    }

    if (checkoutStatus === "success") {
      (async () => {
        try {
          const result = await activatePremiumTrial();
          toast({
            title: result.activated ? "Teste grátis ativado" : "Checkout concluído",
            description: result.activated
              ? "Seu acesso premium está liberado por 7 dias. A primeira cobrança de R$ 20 será feita após esse período."
              : "Seu checkout foi concluído. Se o teste não aparecer imediatamente, atualize a página em instantes.",
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Checkout concluído, mas o teste ainda não foi liberado",
            description: error.message || "Tente atualizar a página em instantes.",
          });
        } finally {
          navigate("/premium", { replace: true });
        }
      })();
      return;
    }

    if (checkoutStatus === "cancel") {
      toast({
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
      });
    }

    if (checkoutStatus === "expired") {
      toast({
        variant: "destructive",
        title: "Checkout expirado",
        description: "Seu link expirou. Gere um novo checkout para continuar.",
      });
    }

    navigate("/premium", { replace: true });
  }, [activatePremiumTrial, location.search, navigate]);

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);

    try {
      await cancelSubscription();
      setCancelDialogOpen(false);
      toast({
        title: "Cancelamento agendado",
        description: "Seu plano premium seguirá ativo até o fim do ciclo atual.",
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

  const handleStartCheckout = async (payerData) => {
    setLoadingCheckout(true);
    try {
      const result = await createPremiumCheckout(payerData);
      setCheckoutDialogOpen(false);
      window.location.href = result.checkoutUrl;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível iniciar a assinatura",
        description: error.message || "Tente novamente em instantes.",
      });
      setLoadingCheckout(false);
    }
  };

  const handleSyncPremium = async () => {
    setLoadingSync(true);
    try {
      const result = await syncPremiumStatus();
      toast({
        title: result.activated ? "Premium liberado" : "Pagamento ainda não localizado",
        description: result.activated
          ? "Seu acesso premium foi ativado com sucesso."
          : "Se você acabou de pagar, aguarde alguns instantes e tente novamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível verificar o pagamento",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setLoadingSync(false);
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
            <p className="text-lg font-bold">{isTrialing ? "Seu teste grátis está ativo!" : "Você já é Premium!"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isTrialing && accessEndsLabel
                ? `Seu acesso premium está liberado até ${accessEndsLabel}. Depois disso, o cartão cadastrado passa a ser cobrado em R$ 20 por mês.`
                : cancellationScheduled && accessEndsLabel
                  ? `Seu cancelamento foi agendado. O acesso premium continua liberado até ${accessEndsLabel}.`
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
                    O cancelamento não bloqueia seu acesso imediatamente. Seus benefícios premium continuam ativos até o fim do ciclo atual.
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
          <div className="space-y-2">
            <span className="text-5xl font-bold block">7 dias grátis</span>
            <span className="text-lg opacity-80">Depois, R$ 20/mês</span>
          </div>
          <p className="text-sm opacity-80">Adicione o cartão agora e cancele quando quiser.</p>
          <Button
            className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold text-base h-12"
            onClick={() => setCheckoutDialogOpen(true)}
            disabled={loadingCheckout}
          >
            <Crown className="h-4 w-4 mr-2" /> Começar teste grátis
          </Button>
          <Button
            variant="secondary"
            className="w-full rounded-xl font-semibold text-base h-12"
            onClick={handleSyncPremium}
            disabled={loadingSync}
          >
            {loadingSync ? "Verificando..." : "Já paguei, verificar acesso"}
          </Button>
          <p className="text-xs opacity-70">Pagamento seguro · 7 dias grátis · renovação automática mensal de R$ 20</p>
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

      <PremiumCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        user={currentUser}
        loading={loadingCheckout}
        onSubmit={handleStartCheckout}
      />
    </div>
  );
}
