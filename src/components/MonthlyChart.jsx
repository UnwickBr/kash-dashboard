import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="text-xs text-muted-foreground">
            {p.dataKey === "receita" ? "Receita" : "Despesa"}: R$ {p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(100, 15%, 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="receita" fill="hsl(160, 84%, 28%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
          <Bar dataKey="despesa" fill="hsl(0, 72%, 55%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}