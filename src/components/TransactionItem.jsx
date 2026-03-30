import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryIcons = {
  "Alimentação": "🍽️",
  "Transporte": "🚗",
  "Moradia": "🏠",
  "Saúde": "💊",
  "Educação": "📚",
  "Lazer": "🎮",
  "Salário": "💼",
  "Freelance": "💻",
  "Investimentos": "📈",
  "Outros": "📦",
};

export default function TransactionItem({ transaction, onDelete }) {
  const isIncome = transaction.type === "receita";
  const icon = categoryIcons[transaction.category] || "📦";

  return (
    <div className="flex items-center gap-4 py-3.5 px-1 border-b border-border/50 last:border-0 group hover:bg-secondary/30 rounded-lg transition-colors -mx-1 px-3">
      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-lg shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {transaction.category} • {format(new Date(transaction.date), "dd MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums ${isIncome ? "text-primary" : "text-destructive"}`}>
            {isIncome ? "+" : "-"} R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`p-1 rounded-full ${isIncome ? "bg-primary/10" : "bg-destructive/10"}`}>
          {isIncome ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
      </div>
    </div>
  );
}