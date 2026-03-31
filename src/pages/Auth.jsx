import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sparkles, Sun, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginInitialState = { email: "", password: "" };
const registerInitialState = { fullName: "", email: "", birthDate: "", password: "", confirmPassword: "" };
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function PasswordField({ label, placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Auth() {
  const { login, loginWithGoogle, register } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState(loginInitialState);
  const [registerForm, setRegisterForm] = useState(registerInitialState);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const googleButtonRef = useRef(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
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
    if (!googleClientId || !googleButtonRef.current || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setLoading(true);
          setErrorMessage("");

          try {
            await loginWithGoogle({ credential: response.credential });
          } catch (error) {
            setErrorMessage(error.message || "Não foi possível entrar com Google.");
          } finally {
            setLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: dark ? "filled_black" : "outline",
        size: "large",
        shape: "pill",
        text: activeTab === "register" ? "signup_with" : "signin_with",
        width: 320,
        logo_alignment: "left",
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const script = existingScript || document.createElement("script");

    if (!existingScript) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderGoogleButton);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [activeTab, dark, loginWithGoogle]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await login(loginForm);
    } catch (error) {
      setErrorMessage(error.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await register({
        fullName: registerForm.fullName,
        email: registerForm.email,
        birthDate: registerForm.birthDate,
        password: registerForm.password,
      });
    } catch (error) {
      setErrorMessage(error.message || "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_hsl(213_30%_96%))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="w-full">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setDark((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? "Modo claro" : "Modo escuro"}
            </button>
          </div>

          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-xl backdrop-blur lg:p-10"
            >
              <div className="max-w-xl space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  Acesso seguro e experiência simplificada
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                    Organize sua vida financeira com clareza e confiança.
                  </h1>
                  <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                    Acompanhe transações, metas, orçamentos e lembretes em um painel pensado para manter
                    tudo centralizado, simples e profissional.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Visão completa do seu fluxo
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tenha receitas, despesas, metas e compromissos reunidos em um só lugar.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Acesso pessoal à sua conta
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Entre com segurança para acompanhar seus dados com praticidade no dia a dia.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <Card className="rounded-[2rem] border-border/70 shadow-xl">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-2xl font-bold">Entrar ou criar conta</CardTitle>
                  <CardDescription>
                    Acesse seu painel e continue de onde parou.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {googleClientId && (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div ref={googleButtonRef} className="min-h-[44px]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ou continue com email</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>
                  )}

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted p-1">
                      <TabsTrigger value="login" className="gap-2 rounded-lg py-2.5">
                        <LockKeyhole className="h-4 w-4" />
                        Entrar
                      </TabsTrigger>
                      <TabsTrigger value="register" className="gap-2 rounded-lg py-2.5">
                        <UserPlus className="h-4 w-4" />
                        Cadastrar
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="voce@exemplo.com"
                            value={loginForm.email}
                            onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                            required
                          />
                        </div>
                        <PasswordField
                          label="Senha"
                          placeholder="Sua senha"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                        />
                        <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
                          {loading ? "Entrando..." : "Entrar"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="register" className="space-y-4">
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            placeholder="Seu nome"
                            value={registerForm.fullName}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="voce@exemplo.com"
                            value={registerForm.email}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data de nascimento</Label>
                          <Input
                            type="date"
                            value={registerForm.birthDate}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, birthDate: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <PasswordField
                            label="Senha"
                            placeholder="Mínimo 6 caracteres"
                            value={registerForm.password}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                          />
                          <PasswordField
                            label="Confirmar senha"
                            placeholder="Repita a senha"
                            value={registerForm.confirmPassword}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                          />
                        </div>
                        <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
                          {loading ? "Criando conta..." : "Criar conta"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {errorMessage && (
                    <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
