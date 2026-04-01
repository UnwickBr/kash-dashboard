import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Crown, Mail, Sparkles, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const isRecentAccount = (createdDate) => {
  if (!createdDate) return true;
  const createdAt = new Date(createdDate).getTime();
  if (Number.isNaN(createdAt)) return true;
  return Date.now() - createdAt <= 14 * 24 * 60 * 60 * 1000;
};

export default function OnboardingChecklist({ user, transactionCount }) {
  const [dismissed, setDismissed] = useState(false);

  const storageKey = user?.id ? `kash_onboarding_dismissed_${user.id}` : null;

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setDismissed(false);
      return;
    }

    setDismissed(window.localStorage.getItem(storageKey) === "true");
  }, [storageKey]);

  const steps = useMemo(() => {
    if (!user) return [];

    return [
      {
        title: "Complete seu perfil",
        description: "Revise seu nome e mantenha seus dados pessoais em dia.",
        done: Boolean(user.full_name && user.birth_date),
        to: "/meu-perfil",
        cta: "Abrir perfil",
        icon: UserRound,
      },
      {
        title: "Adicione sua primeira transação",
        description: "Comece registrando uma receita ou despesa para alimentar seus gráficos.",
        done: transactionCount > 0,
        to: "/transacoes",
        cta: "Ir para transações",
        icon: Sparkles,
      },
      {
        title: "Conheça o plano premium",
        description: "Veja o que desbloqueia lembretes, orçamentos e organização avançada.",
        done: Boolean(user.has_premium_access),
        to: "/premium",
        cta: user.has_premium_access ? "Plano ativo" : "Ver premium",
        icon: Crown,
      },
      {
        title: "Fale com a equipe se precisar",
        description: "Você pode mandar dúvidas, sugestões ou pedir ajuda direto pela área de contato.",
        done: false,
        to: "/contato",
        cta: "Abrir contato",
        icon: Mail,
      },
    ];
  }, [transactionCount, user]);

  const completedSteps = steps.filter((step) => step.done).length;
  const shouldShow = user && !dismissed && (transactionCount === 0 || isRecentAccount(user.created_date));

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Primeiros passos</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">Deixe seu painel pronto para o uso diário</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Você já tem a estrutura pronta. Falta só concluir alguns passos para aproveitar melhor o Kash Dashboard.
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {completedSteps} de {steps.length} etapas concluídas
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="self-start rounded-xl text-muted-foreground"
          onClick={() => {
            if (storageKey && typeof window !== "undefined") {
              window.localStorage.setItem(storageKey, "true");
            }
            setDismissed(true);
          }}
        >
          <X className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:flex-row sm:items-center">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${step.done ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
              {step.done ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <Button asChild variant={step.done ? "outline" : "default"} className="rounded-xl">
              <Link to={step.to}>{step.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
