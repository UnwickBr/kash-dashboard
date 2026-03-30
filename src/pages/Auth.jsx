import { useState } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, UserPlus, WalletCards } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginInitialState = { email: "", password: "" };
const registerInitialState = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function Auth() {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState(loginInitialState);
  const [registerForm, setRegisterForm] = useState(registerInitialState);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-xl backdrop-blur lg:p-10"
          >
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <WalletCards className="h-4 w-4" />
                Dados salvos localmente por usuário
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                  Seu painel financeiro, agora com acesso individual.
                </h1>
                <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                  Cada conta cria e atualiza um arquivo próprio no projeto. Isso mantém os dados separados
                  e evita que um usuário veja o dashboard do outro.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/80 p-4">
                  <p className="text-sm font-bold text-foreground">Cadastro antes da entrada</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O acesso ao app agora passa por conta e senha antes de abrir qualquer rota protegida.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-4">
                  <p className="text-sm font-bold text-foreground">Arquivos separados por conta</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Os dados ficam em `local-db/users`, um arquivo JSON por usuário cadastrado.
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
                  Use seu email para carregar apenas os seus dados locais.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      <div className="space-y-2">
                        <Label>Senha</Label>
                        <Input
                          type="password"
                          placeholder="Sua senha"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                          required
                        />
                      </div>
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Senha</Label>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={registerForm.password}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmar senha</Label>
                          <Input
                            type="password"
                            placeholder="Repita a senha"
                            value={registerForm.confirmPassword}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                            required
                          />
                        </div>
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
  );
}
