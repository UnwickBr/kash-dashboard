import { Crown, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function PremiumFeatureGate({ featureName, children }) {
  const { currentUser } = useAuth();

  if (currentUser?.has_premium_access) {
    return children;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15">
          <Crown className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Recurso Premium</h1>
        <p className="mt-3 text-base text-muted-foreground">
          A area de {featureName} esta disponivel apenas para usuarios Premium.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No plano gratuito, o acesso fica liberado somente para o Painel e para as Transacoes.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link to="/premium">
              <Crown className="mr-2 h-4 w-4" />
              Conhecer o Premium
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/">
              <Lock className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
