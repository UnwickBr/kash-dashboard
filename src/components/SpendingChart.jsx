import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          R$ {payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }

  return null;
};

export default function SpendingChart({ data }) {
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
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(100, 15%, 90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(160, 84%, 28%)"
            strokeWidth={3}
            dot={{ r: 4, fill: "hsl(160, 84%, 28%)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
