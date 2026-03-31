import { useEffect, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Bell, Trash2, Check, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { parseStoredDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

const categories = ["Moradia", "Cartão de Crédito", "Saúde", "Assinatura", "Empréstimo", "Água/Luz/Gás", "Internet/Telefone", "Outros"];

const emptyForm = { description: "", amount: "", due_date: "", category: "Outros", recurrent: false };

export default function Reminders() {
  const { currentUser } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    const data = await base44.entities.PaymentReminder.filter({ created_by: currentUser.email }, "due_date", 200);
    setReminders(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [currentUser]);

  const handleAdd = async (event) => {
    event.preventDefault();
    setSaving(true);
    await base44.entities.PaymentReminder.create({
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      paid: false,
    });
    setSaving(false);
    setAddOpen(false);
    setForm(emptyForm);
    load();
  };

  const handleTogglePaid = async (reminder) => {
    await base44.entities.PaymentReminder.update(reminder.id, { paid: !reminder.paid });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.PaymentReminder.delete(id);
    load();
  };

  const getUrgency = (reminder) => {
    if (reminder.paid) return "paid";
    const days = differenceInDays(parseStoredDate(reminder.due_date), new Date());
    if (days < 0) return "overdue";
    if (days <= 3) return "urgent";
    if (days <= 7) return "soon";
    return "ok";
  };

  const urgencyConfig = {
    paid: { color: "border-border bg-muted/30", badge: "bg-green-100 text-green-700", label: "Pago" },
    overdue: { color: "border-destructive/40 bg-destructive/5", badge: "bg-red-100 text-red-700", label: "Vencido" },
    urgent: { color: "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10", badge: "bg-amber-100 text-amber-700", label: "Urgente" },
    soon: { color: "border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-950/10", badge: "bg-yellow-100 text-yellow-700", label: "Em breve" },
    ok: { color: "border-border", badge: "bg-blue-100 text-blue-700", label: "Pendente" },
  };

  const pending = reminders.filter((reminder) => !reminder.paid);
  const paid = reminders.filter((reminder) => reminder.paid);
  const totalPending = pending.reduce((sum, reminder) => sum + (reminder.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lembretes</h1>
          <p className="text-sm text-muted-foreground mt-1">{pending.length} contas pendentes</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-sm">
              <Plus className="h-4 w-4" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Nova Conta / Lembrete</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</Label>
                <Input
                  className="mt-1.5 rounded-xl"
                  placeholder="Ex: Aluguel, Fatura Nubank..."
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor (R$)</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                <div>
                  <p className="text-sm font-semibold">Recorrente (mensal)</p>
                  <p className="text-xs text-muted-foreground">Repete todo mês na mesma data</p>
                </div>
                <Switch checked={form.recurrent} onCheckedChange={(value) => setForm({ ...form, recurrent: value })} />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={saving || !form.description || !form.due_date}>
                {saving ? "Salvando..." : "Adicionar Lembrete"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
        <Bell className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Lembretes por email</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            O Kash envia emails automáticos para lembretes que vencem amanhã, vencem hoje ou acabaram de vencer. Push, SMS e WhatsApp ainda não estão disponíveis.
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Notificações de lembrete com integração ao calendário do celular estarão disponíveis apenas para contas conectadas com Google.
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-primary rounded-2xl p-5 flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Total pendente</p>
            <p className="text-2xl font-bold text-primary-foreground">
              R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right text-primary-foreground/70 text-sm">
            <p>{pending.filter((reminder) => getUrgency(reminder) === "overdue").length} vencidas</p>
            <p>{pending.filter((reminder) => getUrgency(reminder) === "urgent").length} urgentes</p>
          </div>
        </motion.div>
      )}

      {reminders.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-sm font-semibold">Nenhum lembrete cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione suas contas para não esquecer de pagar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pendentes ({pending.length})</p>
              <AnimatePresence>
                {pending.map((reminder, index) => {
                  const urgency = getUrgency(reminder);
                  const config = urgencyConfig[urgency];
                  const days = differenceInDays(parseStoredDate(reminder.due_date), new Date());

                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.03 * index }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border ${config.color}`}
                    >
                      <button
                        onClick={() => handleTogglePaid(reminder)}
                        className="h-6 w-6 rounded-full border-2 border-border hover:border-primary transition-all shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{reminder.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseStoredDate(reminder.due_date), "dd/MM/yyyy")}
                          </p>
                          {reminder.category && <span className="text-xs text-muted-foreground">· {reminder.category}</span>}
                          {reminder.recurrent && <span className="text-xs text-muted-foreground">· 🔁 Mensal</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {reminder.amount > 0 && <p className="text-sm font-bold">R$ {reminder.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${config.badge}`}>
                          {urgency === "overdue"
                            ? `${Math.abs(days)}d atraso`
                            : urgency === "ok" || urgency === "soon" || urgency === "urgent"
                              ? `${days}d`
                              : config.label}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover lembrete?</AlertDialogTitle>
                              <AlertDialogDescription>Deseja remover o lembrete de "{reminder.description}"?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(reminder.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {paid.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pagos ({paid.length})</p>
              {paid.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 p-4 rounded-2xl border border-border opacity-50">
                  <button
                    onClick={() => handleTogglePaid(reminder)}
                    className="h-6 w-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center shrink-0"
                  >
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-through truncate">{reminder.description}</p>
                    <p className="text-xs text-muted-foreground">{format(parseStoredDate(reminder.due_date), "dd/MM/yyyy")}</p>
                  </div>
                  {reminder.amount > 0 && <p className="text-sm font-bold text-muted-foreground">R$ {reminder.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover?</AlertDialogTitle>
                        <AlertDialogDescription>Deseja remover "{reminder.description}"?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(reminder.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
