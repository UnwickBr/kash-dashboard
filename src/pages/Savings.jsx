import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, PiggyBank } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ICONS = ["🐷", "🏠", "✈️", "🚗", "📱", "🎓", "💍", "🏖️", "💊", "🎯", "💼", "🌟"];

function getEstimatedDate(amount, goal_amount, monthly_deposit) {
  if (!goal_amount || !monthly_deposit || monthly_deposit <= 0) return null;
  const remaining = goal_amount - amount;
  if (remaining <= 0) return null;
  const months = Math.ceil(remaining / monthly_deposit);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return { date, months };
}

function SavingsForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || { name: "", amount: "", goal_amount: "", monthly_deposit: "", description: "", icon: "🐷" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      goal_amount: form.goal_amount ? parseFloat(form.goal_amount) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ícone</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setForm({ ...form, icon: ic })}
              className={`text-xl h-9 w-9 rounded-xl flex items-center justify-center transition-all border-2 ${
                form.icon === ic ? "border-primary bg-primary/10" : "border-transparent bg-secondary hover:border-border"
              }`}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</Label>
        <Input className="mt-1.5 rounded-xl" placeholder="Ex: Reserva de emergência" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor guardado (R$)</Label>
          <Input className="mt-1.5 rounded-xl" type="number" step="0.01" min="0" placeholder="0,00"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meta (R$)</Label>
          <Input className="mt-1.5 rounded-xl" type="number" step="0.01" min="0" placeholder="Opcional"
            value={form.goal_amount} onChange={(e) => setForm({ ...form, goal_amount: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Depósito mensal (R$)</Label>
        <Input className="mt-1.5 rounded-xl" type="number" step="0.01" min="0" placeholder="Quanto você deposita por mês?"
          value={form.monthly_deposit} onChange={(e) => setForm({ ...form, monthly_deposit: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</Label>
        <Input className="mt-1.5 rounded-xl" placeholder="Opcional" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={loading || !form.name || !form.amount}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

export default function Savings() {
  const { currentUser } = useAuth();
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = currentUser?.email
      ? await base44.entities.Savings.filter({ created_by: currentUser.email }, "-created_date", 100)
      : [];
    setSavings(data);
    setLoading(false);
  };

  useEffect(() => { if (currentUser) loadData(); }, [currentUser]);

  const handleAdd = async (data) => {
    setSaving(true);
    await base44.entities.Savings.create({ ...data, monthly_deposit: data.monthly_deposit ? parseFloat(data.monthly_deposit) : null });
    setSaving(false);
    setAddOpen(false);
    loadData();
  };

  const handleEdit = async (data) => {
    setSaving(true);
    await base44.entities.Savings.update(editItem.id, { ...data, monthly_deposit: data.monthly_deposit ? parseFloat(data.monthly_deposit) : null });
    setSaving(false);
    setEditItem(null);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Savings.delete(id);
    loadData();
  };

  const total = savings.reduce((s, i) => s + i.amount, 0);
  const totalGoal = savings.filter((i) => i.goal_amount).reduce((s, i) => s + i.goal_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Poupança</h1>
          <p className="text-sm text-muted-foreground mt-1">{savings.length} {savings.length === 1 ? "reserva" : "reservas"} cadastradas</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-sm"><Plus className="h-4 w-4" /> Nova Poupança</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-lg font-bold">Nova Poupança</DialogTitle></DialogHeader>
            <SavingsForm onSubmit={handleAdd} loading={saving} />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Total summary */}
      {savings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-primary rounded-2xl p-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-3xl">
              <PiggyBank className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">Total guardado</p>
              <p className="text-3xl font-bold tracking-tight">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          {totalGoal > 0 && (
            <>
              <div className="h-px sm:h-12 sm:w-px bg-primary-foreground/20" />
              <div>
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">Meta total</p>
                <p className="text-xl font-bold">R$ {totalGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {((total / totalGoal) * 100).toFixed(0)}% atingido
                </p>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Cards */}
      {savings.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-4xl mb-3">🐷</p>
          <p className="text-sm font-semibold text-foreground">Nenhuma poupança cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione suas reservas para acompanhar quanto você tem guardado.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savings.map((item, i) => {
            const pct = item.goal_amount ? Math.min((item.amount / item.goal_amount) * 100, 100) : null;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="bg-card rounded-2xl border border-border p-5 group hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-2xl">{item.icon || "🐷"}</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditItem(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir poupança?</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza que deseja excluir "{item.name}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(item.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <p className="text-2xl font-bold text-foreground tabular-nums">
                  R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>

                {item.goal_amount && (
                  <div className="mt-3">
                    <Progress value={pct} className="h-2 rounded-full" />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% da meta</span>
                      <span className="text-xs font-semibold text-primary">
                        R$ {item.goal_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(() => {
                      const est = getEstimatedDate(item.amount, item.goal_amount, item.monthly_deposit);
                      if (!est) return item.monthly_deposit ? null : (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">Defina um depósito mensal para ver a previsão</p>
                      );
                      return (
                        <div className="mt-2 bg-primary/8 rounded-xl px-3 py-2">
                          <p className="text-xs text-muted-foreground">Depósito mensal: <span className="font-semibold text-foreground">R$ {item.monthly_deposit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                          <p className="text-xs font-semibold text-primary mt-0.5">
                            🎯 Meta em {est.months} {est.months === 1 ? "mês" : "meses"} — {est.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">Editar Poupança</DialogTitle></DialogHeader>
          {editItem && (
            <SavingsForm
              initial={{ ...editItem, goal_amount: editItem.goal_amount ?? "", monthly_deposit: editItem.monthly_deposit ?? "" }}
              onSubmit={handleEdit}
              loading={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}