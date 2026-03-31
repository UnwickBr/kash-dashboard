import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BudgetCard from "../components/BudgetCard";
import { useAuth } from "@/lib/AuthContext";

const expenseCategories = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Pet", "Assinaturas", "Cartão de Crédito", "Outros"];

export default function Budgets() {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category: "", limit_amount: "" });

  const currentMonth = format(new Date(), "yyyy-MM");

  const loadData = async () => {
    setLoading(true);
    const email = currentUser?.email;
    const [budgetData, transactionData] = await Promise.all([
      email ? base44.entities.Budget.filter({ created_by: email }, "-created_date", 50) : Promise.resolve([]),
      email ? base44.entities.Transaction.filter({ created_by: email }, "-date", 200) : Promise.resolve([]),
    ]);
    setBudgets(budgetData);
    setTransactions(transactionData);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser]);

  const currentBudgets = useMemo(() => budgets.filter((budget) => budget.month === currentMonth), [budgets, currentMonth]);

  const spentByCategory = useMemo(() => {
    const map = {};
    transactions
      .filter((transaction) => {
        const date = new Date(transaction.date);
        return transaction.type === "despesa" && format(date, "yyyy-MM") === currentMonth;
      })
      .forEach((transaction) => {
        map[transaction.category] = (map[transaction.category] || 0) + transaction.amount;
      });
    return map;
  }, [transactions, currentMonth]);

  const totalBudget = currentBudgets.reduce((sum, budget) => sum + budget.limit_amount, 0);
  const totalSpent = currentBudgets.reduce((sum, budget) => sum + (spentByCategory[budget.category] || 0), 0);

  const handleCreate = async (event) => {
    event.preventDefault();
    await base44.entities.Budget.create({
      ...form,
      limit_amount: parseFloat(form.limit_amount),
      month: currentMonth,
    });
    setDialogOpen(false);
    setForm({ category: "", limit_amount: "" });
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Budget.delete(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "MMMM yyyy")} — {currentBudgets.length} orçamentos ativos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-sm">
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Novo Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limite (R$)</Label>
                <Input
                  className="mt-1.5 rounded-xl"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0,00"
                  value={form.limit_amount}
                  onChange={(event) => setForm({ ...form, limit_amount: event.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={!form.category || !form.limit_amount}>
                Criar Orçamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {currentBudgets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
        >
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Orçado</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              R$ {totalBudget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-12 w-px bg-border hidden sm:block" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Gasto</p>
            <p className={`text-2xl font-bold mt-1 ${totalSpent > totalBudget ? "text-destructive" : "text-primary"}`}>
              R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-12 w-px bg-border hidden sm:block" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disponível</p>
            <p className={`text-2xl font-bold mt-1 ${totalBudget - totalSpent < 0 ? "text-destructive" : "text-foreground"}`}>
              R$ {(totalBudget - totalSpent).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </motion.div>
      )}

      {currentBudgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-2xl border border-border p-12 text-center"
        >
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-semibold text-foreground">Nenhum orçamento definido</p>
          <p className="text-xs text-muted-foreground mt-1">Crie orçamentos para acompanhar seus gastos por categoria.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBudgets.map((budget, index) => (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <BudgetCard
                budget={budget}
                spent={spentByCategory[budget.category] || 0}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
