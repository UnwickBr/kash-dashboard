import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Search, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import TransactionItem from "../components/TransactionItem";
import AddTransactionDialog from "../components/AddTransactionDialog";
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

export default function Transactions() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

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

  const handleDelete = async (id) => {
    await base44.entities.Transaction.delete(id);
    loadData();
  };

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((transaction) => transaction.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const monthOptions = useMemo(() => {
    const map = new Map();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
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

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchSearch = transaction.description.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || transaction.type === filterType;
      const matchCategory = filterCategory === "all" || transaction.category === filterCategory;
      const matchMonth = filterMonth === "all" || format(new Date(transaction.date), "yyyy-MM") === filterMonth;

      return matchSearch && matchType && matchCategory && matchMonth;
    });
  }, [transactions, search, filterType, filterCategory, filterMonth]);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Transacoes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {transactions.length} transacoes registradas e salvas no seu historico
          </p>
        </div>
        <AddTransactionDialog onSuccess={loadData} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-4 flex flex-col xl:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl"
            placeholder="Buscar transacao..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full xl:w-40 rounded-xl">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full xl:w-44 rounded-xl">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-full xl:w-52 rounded-xl">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5 sm:p-6"
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {search || filterType !== "all" || filterCategory !== "all" || filterMonth !== "all"
              ? "Nenhuma transacao encontrada com esses filtros."
              : "Nenhuma transacao registrada ainda."}
          </p>
        ) : (
          <div>
            {filtered.map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-2 group">
                <div className="flex-1">
                  <TransactionItem transaction={transaction} />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-xl opacity-100 transition-all hover:bg-destructive/10 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Excluir transacao ${transaction.description}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir transacao?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir "{transaction.description}"? Esta acao nao pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(transaction.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
