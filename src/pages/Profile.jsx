import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Save, UserRound } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

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

export default function Profile() {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    birthDate: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setProfileForm({
      fullName: currentUser.full_name || "",
      email: currentUser.email || "",
      birthDate: currentUser.birth_date || "",
    });
  }, [currentUser]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      await updateProfile(profileForm);
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram salvos com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Confirme a nova senha para continuar.",
      });
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível alterar a senha",
        description: error.message || "Revise os dados e tente novamente.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-2 text-muted-foreground">
          Atualize seus dados de acesso e mantenha sua conta sempre em dia.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Dados pessoais
              </CardTitle>
              <CardDescription>
                Esses dados ajudam a identificar sua conta e personalizar sua experiência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="voce@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Input
                    type="date"
                    value={profileForm.birthDate}
                    onChange={(event) => setProfileForm((current) => ({ ...current, birthDate: event.target.value }))}
                  />
                </div>
                <Button type="submit" className="rounded-xl" disabled={savingProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? "Salvando..." : "Salvar alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-primary" />
                Segurança da conta
              </CardTitle>
              <CardDescription>
                Troque sua senha sempre que quiser reforçar a segurança da conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <PasswordField
                  label="Senha atual"
                  placeholder="Digite sua senha atual"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                />
                <PasswordField
                  label="Nova senha"
                  placeholder="Mínimo 6 caracteres"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  placeholder="Repita a nova senha"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
                <Button type="submit" variant="outline" className="rounded-xl" disabled={savingPassword}>
                  {savingPassword ? "Atualizando..." : "Alterar senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
