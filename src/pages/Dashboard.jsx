import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "../components/StatCard";
import { useAuth } from "@/lib/AuthContext";
import { parseStoredDate } from "@/lib/date";
import TransactionItem from "../components/TransactionItem";
import SpendingChart from "../components/SpendingChart";
import MonthlyChart from "../components/MonthlyChart";
import AddTransactionDialog from "../components/AddTransactionDialog";
import OnboardingChecklist from "../components/OnboardingChecklist";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("current");
  const firstName = (currentUser?.full_name || "usuário").trim().split(/\s+/)[0];

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

  const monthOptions = useMemo(() => {
    const map = new Map();

    transactions.forEach((transaction) => {
      const date = parseStoredDate(transaction.date);
      const key = format(date, "yyyy-MM");
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
          sortKey: date.getTime(),
        });
      }
    });

    return Array.from(map.values()).sort((left, right) => right.sortKey - left.sortKey);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === "all") {
      return transactions;
    }

    const targetMonth = selectedMonth === "current" ? format(new Date(), "yyyy-MM") : selectedMonth;
    return transactions.filter((transaction) => format(parseStoredDate(transaction.date), "yyyy-MM") === targetMonth);
  }, [transactions, selectedMonth]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "all") {
      return "todos os meses";
    }

    if (selectedMonth === "current") {
      return format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
    }

    return monthOptions.find((option) => option.value === selectedMonth)?.label || "mês selecionado";
  }, [monthOptions, selectedMonth]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter((transaction) => transaction.type === "receita").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = filteredTransactions.filter((transaction) => transaction.type === "despesa").reduce((sum, transaction) => sum + transaction.amount, 0);
    const balance = income - expenses;

    return { income, expenses, balance };
  }, [filteredTransactions]);

  const spendingByCategory = useMemo(() => {
    const expenses = filteredTransactions.filter((transaction) => transaction.type === "despesa");
    const categorySet = new Set();
    const dayMap = new Map();

    expenses.forEach((transaction) => {
      const date = parseStoredDate(transaction.date);
      const key = format(date, "yyyy-MM-dd");
      const label = format(date, "dd/MM", { locale: ptBR });

      categorySet.add(transaction.category);

      if (!dayMap.has(key)) {
        dayMap.set(key, { key, label, sortKey: date.getTime() });
      }

      const entry = dayMap.get(key);
      entry[transaction.category] = (entry[transaction.category] || 0) + transaction.amount;
    });

    const categories = Array.from(categorySet);
    const data = Array.from(dayMap.values())
      .sort((left, right) => left.sortKey - right.sortKey)
      .map((entry) => {
        const normalized = { label: entry.label };
        categories.forEach((category) => {
          normalized[category] = entry[category] || 0;
        });
        return normalized;
      });

    return { data, categories };
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const source = selectedMonth === "all" ? transactions : filteredTransactions;
    const map = {};

    source.forEach((transaction) => {
      const date = parseStoredDate(transaction.date);
      const key = format(date, "MMM yy", { locale: ptBR });
      if (!map[key]) {
        map[key] = { month: key, receita: 0, despesa: 0, sortKey: date.getTime() };
      }

      if (transaction.type === "receita") {
        map[key].receita += transaction.amount;
      } else {
        map[key].despesa += transaction.amount;
      }
    });

    return Object.values(map).sort((left, right) => left.sortKey - right.sortKey).slice(-6);
  }, [filteredTransactions, selectedMonth, transactions]);

  const futureInstallments = useMemo(() => {
    const now = new Date();
    const next3 = [];

    for (let i = 1; i <= 3; i += 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = format(monthDate, "MMM yy", { locale: ptBR });
      const total = transactions
        .filter((transaction) => {
          const date = parseStoredDate(transaction.date);
          return transaction.type === "despesa" && format(date, "MMM yy", { locale: ptBR }) === monthKey;
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      if (total > 0) {
        next3.push({ month: monthKey, value: total });
      }
    }

    return next3;
  }, [transactions]);

  const recentTransactions = filteredTransactions.slice(0, 5);
  const formatCurrency = (value) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Painel Financeiro</h1>
          <p className="mt-1 text-sm font-medium text-primary sm:text-base">
            {greeting}, {firstName}
          </p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">Dados salvos de {selectedMonthLabel}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="min-w-[220px] rounded-xl">
              <SelectValue placeholder="Filtrar mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês atual</SelectItem>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddTransactionDialog onSuccess={loadData} />
        </div>
      </motion.div>

      <OnboardingChecklist user={currentUser} transactionCount={transactions.length} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Saldo do mês" value={formatCurrency(stats.balance)} icon={Wallet} />
        <StatCard title="Receitas" value={formatCurrency(stats.income)} icon={TrendingUp} />
        <StatCard title="Despesas" value={formatCurrency(stats.expenses)} icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.45fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="min-h-[320px] rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Receitas vs Despesas</h3>
          <MonthlyChart data={monthlyData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-h-[400px] rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Gastos por Categoria</h3>
          <SpendingChart data={spendingByCategory.data} categories={spendingByCategory.categories} />
        </motion.div>
      </div>

      {futureInstallments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Parcelas nos Próximos Meses</h3>
          <div className="flex flex-wrap gap-3">
            {futureInstallments.map((item) => (
              <div key={item.month} className="min-w-[100px] flex-1 rounded-xl bg-secondary/40 p-3">
                <p className="text-xs font-semibold capitalize text-muted-foreground">{item.month}</p>
                <p className="mt-1 text-base font-bold text-foreground">
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
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Transações Recentes</h3>
          <Link to="/transacoes" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação encontrada para esse período.</p>
        ) : (
          <div>
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
