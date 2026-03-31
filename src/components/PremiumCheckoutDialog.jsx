import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const onlyDigits = (value) => value.replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatZip = (value) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const emptyForm = {
  fullName: "",
  cpfCnpj: "",
  phone: "",
  postalCode: "",
  addressNumber: "",
  address: "",
  province: "",
  city: "",
  state: "",
};

export default function PremiumCheckoutDialog({ open, onOpenChange, user, loading, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm((current) => ({
      ...current,
      fullName: user?.full_name || current.fullName,
    }));
  }, [open, user]);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length >= 3 &&
      onlyDigits(form.cpfCnpj).length === 11 &&
      onlyDigits(form.phone).length >= 10 &&
      onlyDigits(form.postalCode).length === 8 &&
      form.addressNumber.trim() &&
      form.address.trim() &&
      form.province.trim() &&
      form.city.trim() &&
      form.state.trim().length === 2
    );
  }, [form]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      fullName: form.fullName.trim(),
      cpfCnpj: onlyDigits(form.cpfCnpj),
      phone: onlyDigits(form.phone),
      postalCode: onlyDigits(form.postalCode),
      addressNumber: form.addressNumber.trim(),
      address: form.address.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dados para assinatura</DialogTitle>
          <DialogDescription>
            Preencha os dados do pagador para abrir o checkout do Asaas com a assinatura do Kash Premium.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={form.cpfCnpj}
                onChange={(event) => setForm((current) => ({ ...current, cpfCnpj: formatCpf(event.target.value) }))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: formatPhone(event.target.value) }))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({ ...current, postalCode: formatZip(event.target.value) }))}
                placeholder="00000-000"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Numero</Label>
              <Input
                value={form.addressNumber}
                onChange={(event) => setForm((current) => ({ ...current, addressNumber: event.target.value }))}
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rua / endereco</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Rua, avenida, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={form.province}
              onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))}
              placeholder="Seu bairro"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_90px]">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Sua cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                value={form.state}
                onChange={(event) => setForm((current) => ({ ...current, state: event.target.value.slice(0, 2).toUpperCase() }))}
                placeholder="SP"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="submit" className="rounded-xl" disabled={loading || !canSubmit}>
              {loading ? "Abrindo checkout..." : "Continuar para pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
