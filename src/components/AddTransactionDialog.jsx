import { useEffect, useMemo, useState } from "react";
import { addMonths, format, isValid, parse } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { parseStoredDate } from "@/lib/date";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";

const categories = {
  despesa: ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Pet", "Assinaturas", "Cartão de Crédito", "Outros"],
  receita: ["Salário", "Freelance", "Investimentos", "Outros"],
};

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export default function AddTransactionDialog({ onSuccess }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savings, setSavings] = useState([]);
  const today = new Date();
  const initialDate = format(today, "yyyy-MM-dd");
  const initialDateLabel = format(today, "dd/MM/yyyy");
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "despesa",
    category: "",
    date: initialDate,
    notes: "",
    installments: "1",
  });
  const [dateInput, setDateInput] = useState(initialDateLabel);

  useEffect(() => {
    const loadSavings = async () => {
      if (!currentUser?.email) {
        setSavings([]);
        return;
      }

      try {
        const data = await base44.entities.Savings.filter({ created_by: currentUser.email }, "-created_date", 100);
        setSavings(data);
      } catch {
        setSavings([]);
      }
    };

    loadSavings();
  }, [currentUser]);

  const cofrinhoCategories = useMemo(() => savings.map((item) => item.name).filter(Boolean), [savings]);
  const currentCategories = form.type === "cofrinho" ? cofrinhoCategories : categories[form.type];
  const hasCofrinhoOptions = cofrinhoCategories.length > 0;

  const handleDateChange = (value) => {
    const maskedValue = formatDateInput(value);
    setDateInput(maskedValue);

    if (maskedValue.length !== 10) {
      return;
    }

    const parsedDate = parse(maskedValue, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate) || format(parsedDate, "dd/MM/yyyy") !== maskedValue) {
      return;
    }

    setForm((current) => ({
      ...current,
      date: format(parsedDate, "yyyy-MM-dd"),
    }));
  };

  const resetForm = () => {
    const nextToday = new Date();
    setForm({
      description: "",
      amount: "",
      type: "despesa",
      category: "",
      date: format(nextToday, "yyyy-MM-dd"),
      notes: "",
      installments: "1",
    });
    setDateInput(format(nextToday, "dd/MM/yyyy"));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parsedDate = parse(dateInput, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate) || format(parsedDate, "dd/MM/yyyy") !== dateInput) {
      toast({
        variant: "destructive",
        title: "Data inválida",
        description: "Preencha a data no formato DD/MM/AAAA.",
      });
      return;
    }

    setLoading(true);

    try {
      const totalAmount = parseFloat(form.amount);
      const installments = form.type === "despesa" ? parseInt(form.installments, 10) || 1 : 1;

      if (installments > 1) {
        const installmentAmount = totalAmount / installments;
        const baseDate = parseStoredDate(form.date);
        const creates = [];

        for (let index = 0; index < installments; index += 1) {
          const installmentDate = addMonths(baseDate, index);
          creates.push(
            base44.entities.Transaction.create({
              ...form,
              amount: parseFloat(installmentAmount.toFixed(2)),
              date: format(installmentDate, "yyyy-MM-dd"),
              description: `${form.description} (${index + 1}/${installments})`,
            })
          );
        }

        await Promise.all(creates);
      } else {
        await base44.entities.Transaction.create({
          ...form,
          amount: totalAmount,
        });
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
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
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</Label>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="Ex: Supermercado"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
              <Input
                className="mt-1.5 rounded-xl"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                value={dateInput}
                onChange={(event) => handleDateChange(event.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value, category: "", installments: "1" }))}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="cofrinho">Cofrinho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</Label>
              {form.type === "cofrinho" && !hasCofrinhoOptions ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1.5 h-11 w-full rounded-xl text-lg"
                  onClick={() => {
                    setOpen(false);
                    navigate("/poupanca");
                  }}
                  aria-label="Criar poupança"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : (
                <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {form.type === "despesa" && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parcelado em</Label>
                <Select value={form.installments} onValueChange={(value) => setForm((current) => ({ ...current, installments: value }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((number) => (
                      <SelectItem key={number} value={String(number)}>
                        {number === 1 ? "À vista" : `${number}x`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parseInt(form.installments, 10) > 1 && form.amount && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.installments}x de R${" "}
                    {(parseFloat(form.amount) / parseInt(form.installments, 10)).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
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
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={loading || !form.description || !form.amount || !form.category || dateInput.length !== 10}
          >
            {loading ? "Salvando..." : "Adicionar Transação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
