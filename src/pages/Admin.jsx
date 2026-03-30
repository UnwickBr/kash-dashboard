import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Crown, Trash2, Shield, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusLabels = { active: "Ativo", inactive: "Inativo", trial: "Trial" };
const statusColors = { active: "bg-green-100 text-green-700", inactive: "bg-red-100 text-red-700", trial: "bg-yellow-100 text-yellow-700" };

export default function Admin() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.User.list("-created_date", 200);
    setUsers(data);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuários cadastrados</p>
        </div>
        <Button variant="outline" size="icon" onClick={load} className="rounded-xl">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      <div className="space-y-3">
        {users.map((user, i) => (
          <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {user.role === "admin" ? <Shield className="h-5 w-5 text-primary" /> :
                  user.role === "premium" ? <Crown className="h-5 w-5 text-amber-500" /> :
                  <User className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{user.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[user.subscription_status] || "bg-muted text-muted-foreground"}`}>
                {statusLabels[user.subscription_status] || "Sem plano"}
              </span>

              <Select value={user.role || "user"} onValueChange={(v) => handleUpdateUser(user.id, { role: v })}>
                <SelectTrigger className="h-8 w-28 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={user.subscription_status || "inactive"} onValueChange={(v) => handleUpdateUser(user.id, { subscription_status: v })}>
                <SelectTrigger className="h-8 w-28 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
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
                      <AlertDialogDescription>Tem certeza que deseja deletar a conta de <strong>{user.email}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(user.id)}>Deletar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
