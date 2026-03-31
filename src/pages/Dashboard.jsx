import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import StatCard from "../components/StatCard";
import { useAuth } from "@/lib/AuthContext";
import TransactionItem from "../components/TransactionItem";
import SpendingChart from "../components/SpendingChart";
import MonthlyChart from "../components/MonthlyChart";
import AddTransactionDialog from "../components/AddTransactionDialog";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = currentUser?.email
      ? await base44.entities.Transaction.filter({ created_by: currentUser.email }, "-date", 200)
      : [];
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthTransactions.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
    const expenses = monthTransactions.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;

    return { income, expenses, balance };
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const map = {};
    transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === "despesa" && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = format(d, "MMM yy", { locale: ptBR });
      if (!map[key]) map[key] = { month: key, receita: 0, despesa: 0, sortKey: d.getTime() };
      if (t.type === "receita") map[key].receita += t.amount;
      else map[key].despesa += t.amount;
    });
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey).slice(-6);
  }, [transactions]);

  const futureInstallments = useMemo(() => {
    const now = new Date();
    const next3 = [];
    for (let i = 1; i <= 3; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = format(m, "MMM yy", { locale: ptBR });
      const total = transactions
        .filter((t) => {
          const d = new Date(t.date);
          return t.type === "despesa" && format(d, "MMM yy", { locale: ptBR }) === key;
        })
        .reduce((s, t) => s + t.amount, 0);
      if (total > 0) next3.push({ month: key, value: total });
    }
    return next3;
  }, [transactions]);

  const recentTransactions = transactions.slice(0, 5);
  const currentMonthName = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  const formatCurrency = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{currentMonthName}</p>
        </div>
        <AddTransactionDialog onSuccess={loadData} />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Saldo do Mes" value={formatCurrency(stats.balance)} icon={Wallet} />
        <StatCard title="Receitas" value={formatCurrency(stats.income)} icon={TrendingUp} />
        <StatCard title="Despesas" value={formatCurrency(stats.expenses)} icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 sm:p-6 min-h-[360px]"
        >
          <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Receitas vs Despesas</h3>
          <MonthlyChart data={monthlyData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 sm:p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Gastos por Categoria</h3>
          <SpendingChart data={spendingByCategory} />
        </motion.div>
      </div>

      {futureInstallments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border p-5 sm:p-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Parcelas nos Proximos Meses</h3>
          <div className="flex gap-3 flex-wrap">
            {futureInstallments.map((item) => (
              <div key={item.month} className="flex-1 min-w-[100px] bg-secondary/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground capitalize">{item.month}</p>
                <p className="text-base font-bold text-foreground mt-1">
                  R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Transacoes Recentes</h3>
          <Link to="/transacoes" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma transacao registrada. Comece adicionando uma!
          </p>
        ) : (
          <div>
            {recentTransactions.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
