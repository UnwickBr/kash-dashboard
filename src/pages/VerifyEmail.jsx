import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, LoaderCircle, MailWarning, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ status: "loading", message: "Validando seu link de confirmação..." });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState({ status: "error", message: "O link de verificação está incompleto." });
      return;
    }

    let active = true;

    verifyEmail({ token })
      .then(() => {
        if (!active) return;
        setState({ status: "success", message: "Seu email foi confirmado com sucesso. Agora você já pode entrar." });
      })
      .catch((error) => {
        if (!active) return;
        setState({ status: "error", message: error.message || "Não foi possível confirmar seu email." });
      });

    return () => {
      active = false;
    };
  }, [searchParams, verifyEmail]);

  const Icon = state.status === "loading" ? LoaderCircle : state.status === "success" ? CheckCircle2 : MailWarning;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_hsl(213_30%_96%))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <Card className="rounded-[2rem] border-border/70 shadow-xl">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className={`h-8 w-8 text-primary ${state.status === "loading" ? "animate-spin" : ""}`} />
              </div>
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                Ativação de conta
              </div>
              <CardTitle className="text-2xl font-bold">
                {state.status === "success" ? "Email confirmado" : state.status === "error" ? "Não foi possível confirmar" : "Confirmando email"}
              </CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild className="rounded-xl">
                <Link to="/">Ir para o login</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
