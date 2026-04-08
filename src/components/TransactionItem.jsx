import { ArrowDownRight, ArrowUpRight, PiggyBank } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseStoredDate } from "@/lib/date";

const categoryIcons = {
  "Alimentação": "🍽️",
  Transporte: "🚗",
  Moradia: "🏠",
  Saúde: "💊",
  Educação: "📚",
  Lazer: "🎮",
  Salário: "💼",
  Freelance: "💻",
  Investimentos: "📈",
  Pet: "🐾",
  Assinaturas: "🔁",
  "Cartão de Crédito": "💳",
  Outros: "📦",
};

export default function TransactionItem({ transaction }) {
  const isIncome = transaction.type === "receita";
  const isSavings = transaction.type === "cofrinho";
  const icon = categoryIcons[transaction.category] || (isSavings ? "🐷" : "📦");

  return (
    <div className="-mx-1 flex items-center gap-4 rounded-lg border-b border-border/50 px-3 py-3.5 transition-colors last:border-0 hover:bg-secondary/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {transaction.category} • {format(parseStoredDate(transaction.date), "dd MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums ${isIncome ? "text-primary" : isSavings ? "text-foreground" : "text-destructive"}`}>
            {isIncome ? "+" : isSavings ? "" : "-"} R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`rounded-full p-1 ${isIncome ? "bg-primary/10" : isSavings ? "bg-secondary" : "bg-destructive/10"}`}>
          {isIncome ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          ) : isSavings ? (
            <PiggyBank className="h-3.5 w-3.5 text-foreground" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
      </div>
    </div>
  );
}
