import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const axisStyle = { fontSize: 10, fill: "#8fa3ab" };

// Abrevia números grandes (500000 -> "500k", 1200000 -> "1,2M") para caberem no eixo Y.
function tickAbrev(v) {
  if (v == null) return "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  if (abs >= 1_000) return (v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "k";
  return v.toLocaleString("pt-BR");
}

export default function TrendChart({ data, xKey, series, height = 230, stacked = false }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(143,163,171,0.08)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: "#25313650" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={46} tickFormatter={tickAbrev} />
        <Tooltip
          contentStyle={{
            background: "#182126",
            border: "1px solid #25313650",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8fa3ab" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) =>
          s.type === "area" ? (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.15}
              dot={false}
            />
          ) : s.type === "bar" ? (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color}
              stackId={stacked ? "stack" : undefined}
            />
          ) : s.type === "scatter" ? (
            <Scatter key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} />
          ) : (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              dot={false}
              strokeWidth={2}
              strokeDasharray={s.dash}
              connectNulls={s.connectNulls}
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
