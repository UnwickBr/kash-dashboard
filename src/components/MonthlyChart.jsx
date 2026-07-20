import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(160, 84%, 28%)", "hsl(0, 72%, 55%)"];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, payload: item } = payload[0];
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs font-semibold text-foreground">{item.percent.toFixed(0)}%</p>
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

  const totalReceita = data.reduce((sum, item) => sum + (item.receita || 0), 0);
  const totalDespesa = data.reduce((sum, item) => sum + (item.despesa || 0), 0);
  const rawPieData = [
    { name: "Receitas", value: totalReceita },
    { name: "Despesas", value: totalDespesa },
  ].filter((item) => item.value > 0);

  if (rawPieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  const total = rawPieData.reduce((sum, item) => sum + item.value, 0);
  const pieData = rawPieData.map((item) => ({ ...item, percent: (item.value / total) * 100 }));

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div className="w-56 h-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pieData.map((item, index) => (
          <div
            key={item.name}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-secondary/50 px-2.5 py-1.5"
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs font-medium text-foreground">
              {item.name} · {item.percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
