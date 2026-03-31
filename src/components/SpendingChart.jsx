import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = [
  "hsl(160, 84%, 28%)",
  "hsl(200, 70%, 50%)",
  "hsl(45, 93%, 58%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(20, 80%, 55%)",
  "hsl(100, 50%, 45%)",
  "hsl(220, 75%, 55%)",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {payload.map((item) => (
          <p key={item.dataKey} className="text-xs text-muted-foreground">
            {item.name}: R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default function SpendingChart({ data, categories = [] }) {
  if (!data || data.length === 0 || !categories.length) {
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
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
          <Tooltip content={<CustomTooltip />} />
          {categories.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={3}
              dot={{ r: 3, fill: COLORS[index % COLORS.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
