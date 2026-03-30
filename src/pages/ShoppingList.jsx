import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ShoppingCart, Check, BadgeCheck, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const UNITS = ["unidade", "kg", "g", "litro", "ml", "pacote", "caixa", "dúzia", "outro"];
const emptyForm = { name: "", price: "", quantity: "1", unit: "unidade" };

function ItemForm({ initial, onSubmit, loading, submitLabel = "Adicionar" }) {
  const [form, setForm] = useState(initial || emptyForm);
  useEffect(() => { setForm(initial || emptyForm); }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, price: form.price ? parseFloat(form.price) : null, quantity: parseFloat(form.quantity) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item</Label>
        <Input className="mt-1.5 rounded-xl" placeholder="Ex: Arroz" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qtd</Label>
          <Input className="mt-1.5 rounded-xl" type="number" step="0.01" min="0.01" placeholder="1"
            value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unidade</Label>
          <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
            <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço (R$)</Label>
          <Input className="mt-1.5 rounded-xl" type="number" step="0.01" min="0" placeholder="0,00"
            value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={loading || !form.name || !form.quantity}>
        {loading ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function PaidListAccordion({ paidList }) {
  const [open, setOpen] = useState(false);
  const items = JSON.parse(paidList.items_data || "[]");
  const checkedItems = items.filter((i) => i.checked);
  const uncheckedItems = items.filter((i) => !i.checked);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BadgeCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">
              Lista paga dia {format(new Date(paidList.paid_date), "dd/MM/yy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {items.length} itens · {checkedItems.length} pagos · R$ {paidList.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border">
            <div className="p-4 space-y-3">
              {uncheckedItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Não pegados ({uncheckedItems.length})</p>
                  <div className="space-y-1.5">
                    {uncheckedItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 opacity-60">
                        <div className="h-5 w-5 rounded-full border-2 border-border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                        </div>
                        {item.price && <p className="text-xs text-muted-foreground tabular-nums">R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {checkedItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagos ({checkedItems.length})</p>
                  <div className="space-y-1.5">
                    {checkedItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5">
                        <div className="h-5 w-5 rounded-full bg-primary border-2 border-primary flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                        </div>
                        {item.price && <p className="text-xs font-semibold text-foreground tabular-nums">R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [paidLists, setPaidLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeTab, setActiveTab] = useState("current");

  const load = async () => {
    setLoading(true);
    const [data, paid] = await Promise.all([
      base44.entities.ShoppingItem.list("created_date", 200),
      base44.entities.PaidList.list("-paid_date", 50),
    ]);
    setItems(data);
    setPaidLists(paid);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    setSaving(true);
    await base44.entities.ShoppingItem.create({ ...data, checked: false });
    setSaving(false);
    setAddOpen(false);
    load();
  };

  const handleEdit = async (data) => {
    setSaving(true);
    await base44.entities.ShoppingItem.update(editItem.id, data);
    setSaving(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.ShoppingItem.delete(id);
    load();
  };

  const handleToggle = async (item) => {
    await base44.entities.ShoppingItem.update(item.id, { checked: !item.checked });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i));
  };

  const handleMarkAsPaid = async () => {
    const today = new Date().toISOString().split("T")[0];
    await Promise.all([
      base44.entities.Transaction.create({
        description: "Compras de Supermercado",
        amount: totalChecked,
        type: "despesa",
        category: "Alimentação",
        date: today,
        notes: `Lista de compras - ${checkedItems.length} itens`,
      }),
      base44.entities.PaidList.create({
        paid_date: today,
        total: totalChecked,
        items_data: JSON.stringify(items),
      }),
    ]);
    // Clear all items from current list
    await Promise.all(items.map((i) => base44.entities.ShoppingItem.delete(i.id)));
    load();
  };

  const { checkedItems, uncheckedItems, totalChecked, totalAll } = useMemo(() => {
    const checked = items.filter((i) => i.checked);
    const unchecked = items.filter((i) => !i.checked);
    const calcTotal = (list) => list.reduce((s, i) => s + (i.price ? i.price * i.quantity : 0), 0);
    return { checkedItems: checked, uncheckedItems: unchecked, totalChecked: calcTotal(checked), totalAll: calcTotal(items) };
  }, [items]);

  const ItemRow = ({ item }) => (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${item.checked ? "bg-muted/40 border-border/40 opacity-60" : "bg-card border-border"}`}>
      <button onClick={() => handleToggle(item)}
        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? "bg-primary border-primary" : "border-border hover:border-primary"}`}>
        {item.checked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}{item.price ? ` · R$ ${item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada` : ""}</p>
      </div>
      {item.price && (
        <p className={`text-sm font-bold tabular-nums shrink-0 ${item.checked ? "text-muted-foreground" : "text-foreground"}`}>
          R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
              <AlertDialogTitle>Remover item?</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja remover "{item.name}" da lista?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(item.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Lista de Compras</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} {items.length === 1 ? "item" : "itens"} na lista</p>
        </div>
        {activeTab === "current" && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl shadow-sm"><Plus className="h-4 w-4" /> Adicionar Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="text-lg font-bold">Novo Item</DialogTitle></DialogHeader>
              <ItemForm onSubmit={handleAdd} loading={saving} />
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        <button onClick={() => setActiveTab("current")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === "current" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Lista Atual
        </button>
        <button onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Histórico
          {paidLists.length > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">{paidLists.length}</span>}
        </button>
      </div>

      {activeTab === "current" ? (
        <>
          {/* Total bar */}
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-primary rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Total no carrinho</p>
                  <p className="text-2xl font-bold text-primary-foreground">
                    R$ {totalChecked.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary-foreground/70">Total da lista</p>
                <p className="text-lg font-bold text-primary-foreground/80">R$ {totalAll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-primary-foreground/60">{checkedItems.length}/{items.length} pegos</p>
              </div>
            </motion.div>
          )}

          {items.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm font-semibold text-foreground">Lista vazia</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione itens para começar sua lista de compras.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uncheckedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">A pegar ({uncheckedItems.length})</p>
                  <AnimatePresence>
                    {uncheckedItems.map((item) => <ItemRow key={item.id} item={item} />)}
                  </AnimatePresence>
                </div>
              )}
              {checkedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pegos ({checkedItems.length})</p>
                  <AnimatePresence>
                    {checkedItems.map((item) => <ItemRow key={item.id} item={item} />)}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {items.length > 0 && totalChecked > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full rounded-xl gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <BadgeCheck className="h-4 w-4" />
                  Marcar lista como paga
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar pagamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Será adicionado ao seu painel de gastos uma despesa de <strong>R$ {totalChecked.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> na categoria <strong>Alimentação</strong> (Supermercado). A lista será arquivada no histórico.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl" onClick={handleMarkAsPaid}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {paidLists.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-semibold text-foreground">Nenhuma lista paga ainda</p>
              <p className="text-xs text-muted-foreground mt-1">As listas finalizadas aparecerão aqui.</p>
            </div>
          ) : (
            paidLists.map((pl) => <PaidListAccordion key={pl.id} paidList={pl} />)
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">Editar Item</DialogTitle></DialogHeader>
          {editItem && (
            <ItemForm
              initial={{ name: editItem.name, price: editItem.price ?? "", quantity: editItem.quantity, unit: editItem.unit }}
              onSubmit={handleEdit}
              loading={saving}
              submitLabel="Salvar"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
