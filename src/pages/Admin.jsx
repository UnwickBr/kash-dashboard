import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Crown, Trash2, Shield, User, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const statusLabels = { active: "Ativo", inactive: "Inativo", trial: "Trial", trialing: "Teste grátis" };
const statusColors = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
  trial: "bg-yellow-100 text-yellow-700",
  trialing: "bg-yellow-100 text-yellow-700",
};

const levelColors = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

export default function Admin() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [userData, auditLogs] = await Promise.all([
      base44.entities.User.list("-created_date", 200),
      base44.admin.logs(40),
    ]);
    setUsers(userData);
    setLogs(auditLogs);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      load();
      return;
    }
    setLoading(false);
  }, [currentUser]);

  const handleUpdateUser = async (userId, data) => {
    await base44.entities.User.update(userId, data);
    load();
  };

  const handleDelete = async (userId) => {
    await base44.entities.User.delete(userId);
    load();
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Painel Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
        </div>
        <Button variant="outline" size="icon" onClick={load} className="rounded-xl">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      <div className="space-y-3">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * index }}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {user.role === "admin" ? (
                  <Shield className="h-5 w-5 text-primary" />
                ) : user.role === "premium" ? (
                  <Crown className="h-5 w-5 text-amber-500" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.full_name || "Sem nome"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[user.subscription_status] || "bg-muted text-muted-foreground"}`}>
                {statusLabels[user.subscription_status] || "Sem plano"}
              </span>

              <Select value={user.role || "user"} onValueChange={(value) => handleUpdateUser(user.id, { role: value })}>
                <SelectTrigger className="h-8 w-28 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={user.subscription_status || "inactive"} onValueChange={(value) => handleUpdateUser(user.id, { subscription_status: value })}>
                <SelectTrigger className="h-8 w-32 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="trialing">Teste grátis</SelectItem>
                </SelectContent>
              </Select>

              {user.id !== currentUser?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar conta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar a conta de <strong>{user.email}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(user.id)}>
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Eventos recentes</h2>
        </div>

        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${levelColors[log.level] || "bg-muted text-muted-foreground"}`}>
                        {log.level}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{log.event_type}</span>
                    </div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_name || "Sistema"}
                      {log.user_email ? ` · ${log.user_email}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
