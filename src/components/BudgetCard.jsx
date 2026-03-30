import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
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

const categoryIcons = {
  "Alimentação": "🍽️",
  "Transporte": "🚗",
  "Moradia": "🏠",
  "Saúde": "💊",
  "Educação": "📚",
  "Lazer": "🎮",
  "Outros": "📦",
};

export default function BudgetCard({ budget, spent, onDelete }) {
  const percentage = budget.limit_amount > 0 ? Math.min((spent / budget.limit_amount) * 100, 100) : 0;
  const remaining = budget.limit_amount - spent;
  const overBudget = remaining < 0;
  const icon = categoryIcons[budget.category] || "📦";

  return (
    <div className="bg-card rounded-2xl border border-border p-5 group hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-lg">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{budget.category}</p>
            <p className="text-xs text-muted-foreground">
              R$ {spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ {budget.limit_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o orçamento de "{budget.category}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => onDelete(budget.id)}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Progress
        value={percentage}
        className={`h-2 rounded-full ${overBudget ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {percentage.toFixed(0)}% utilizado
        </span>
        <span className={`text-xs font-bold ${overBudget ? "text-destructive" : "text-primary"}`}>
          {overBudget ? `R$ ${Math.abs(remaining).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acima` : `R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} restante`}
        </span>
      </div>
    </div>
  );
}