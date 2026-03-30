import { useState } from "react";
import { addMonths, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";

const categories = {
  despesa: ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Outros"],
  receita: ["Salário", "Freelance", "Investimentos", "Outros"],
};

export default function AddTransactionDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "despesa",
    category: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    installments: "1",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const totalAmount = parseFloat(form.amount);
    const installments = parseInt(form.installments) || 1;
    if (installments > 1) {
      const parcela = totalAmount / installments;
      const baseDate = new Date(form.date);
      const creates = [];
      for (let i = 0; i < installments; i++) {
        const d = addMonths(baseDate, i);
        creates.push(base44.entities.Transaction.create({
          ...form,
          amount: parseFloat(parcela.toFixed(2)),
          date: format(d, "yyyy-MM-dd"),
          description: `${form.description} (${i + 1}/${installments})`,
          notes: form.notes,
        }));
      }
      await Promise.all(creates);
    } else {
      await base44.entities.Transaction.create({ ...form, amount: totalAmount });
    }
    setLoading(false);
    setOpen(false);
    setForm({ description: "", amount: "", type: "despesa", category: "", date: new Date().toISOString().split("T")[0], notes: "", installments: "1" });
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Transação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</Label>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="Ex: Supermercado"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor (R$)</Label>
              <Input
                className="mt-1.5 rounded-xl"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
              <Input
                className="mt-1.5 rounded-xl"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories[form.type].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === "despesa" && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parcelado em</Label>
                <Select value={form.installments} onValueChange={(v) => setForm({ ...form, installments: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n === 1 ? "À vista" : `${n}x`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parseInt(form.installments) > 1 && form.amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.installments}x de R$ {(parseFloat(form.amount) / parseInt(form.installments)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</Label>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="Opcional"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={loading || !form.description || !form.amount || !form.category}>
            {loading ? "Salvando..." : "Adicionar Transação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}