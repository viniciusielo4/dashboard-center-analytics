import { useMemo, useState } from "react";
import monthly from "./data/monthly.json";
import daily from "./data/daily.json";
import forecast from "./data/forecast.json";
import metrics from "./data/metrics.json";
import anomaliasPorDia from "./data/anomalias_por_dia.json";
import anomaliasTop from "./data/anomalias_top.json";
import KpiCard from "./components/KpiCard.jsx";
import Panel from "./components/Panel.jsx";
import TrendChart from "./components/TrendChart.jsx";
import Assistant from "./components/Assistant.jsx";
import { fmt, semaphore, mesLabel, diaLabel, montaSerieComPrevisao } from "./utils.js";

const metricaPorAlvo = Object.fromEntries(metrics.map((m) => [m.alvo, m]));

export default function App() {
  const [deIdx, setDeIdx] = useState(0);
  const [ateIdx, setAteIdx] = useState(monthly.length - 1);
  const [mesDetalhe, setMesDetalhe] = useState(monthly[monthly.length - 1].mes);

  const lo = Math.min(deIdx, ateIdx);
  const hi = Math.max(deIdx, ateIdx);
  const rows = useMemo(() => monthly.slice(lo, hi + 1), [lo, hi]);

  const chartData = useMemo(
    () => rows.map((r) => ({ ...r, label: mesLabel(r.mes) })),
    [rows]
  );

  const kpis = useMemo(() => {
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    const avg = (k) => sum(k) / rows.length;
    const pueMedio = avg("pue");
    const wueMedio = avg("wue_l_por_kwh");
    const efEnerg = avg("eficiencia_energetica_pct");
    const efHid = avg("eficiencia_hidrica_pct");
    const despEnerg = avg("desperdicio_energia_pct");
    return [
      { label: "Energia total", value: fmt(sum("energia_total_kwh") / 1000) + "k", unit: "kWh", colorVar: "--energy" },
      { label: "Água total", value: fmt(sum("agua_total_l") / 1000) + "k", unit: "L", colorVar: "--water" },
      { label: "Custo total", value: "R$ " + fmt(sum("custo_total_rs") / 1000) + "k", unit: "", colorVar: "--cost" },
      { label: "CO₂ emitido", value: fmt(sum("co2_emissoes_kg") / 1000) + "k", unit: "kg", colorVar: "--waste" },
      {
        label: "PUE médio",
        value: fmt(pueMedio, 2),
        unit: "",
        colorVar: "--eff",
        semaphore: semaphore(pueMedio, 1.3, 1.5, false),
      },
      { label: "WUE médio", value: fmt(wueMedio, 2), unit: "L/kWh", colorVar: "--water" },
      {
        label: "Efic. energética",
        value: fmt(efEnerg, 1) + "%",
        unit: "",
        colorVar: "--eff",
        semaphore: semaphore(efEnerg, 75, 65, true),
      },
      {
        label: "Efic. hídrica",
        value: fmt(efHid, 1) + "%",
        unit: "",
        colorVar: "--eff",
        semaphore: semaphore(efHid, 35, 25, true),
      },
      {
        label: "Desperdício energia",
        value: fmt(despEnerg, 2) + "%",
        unit: "",
        colorVar: "--waste",
        semaphore: semaphore(despEnerg, 2.5, 3.5, false),
      },
    ];
  }, [rows]);

  const dailyRows = useMemo(
    () => daily.filter((d) => d.dia.startsWith(mesDetalhe)).map((d) => ({ ...d, label: diaLabel(d.dia) })),
    [mesDetalhe]
  );

  const previsaoEnergia = useMemo(
    () => montaSerieComPrevisao(daily, forecast.energia_total_kwh, "energia_total_kwh"),
    []
  );
  const previsaoCusto = useMemo(
    () => montaSerieComPrevisao(daily, forecast.custo_total_rs, "custo_total_rs"),
    []
  );

  return (
    <div className="wrap">
      <header className="topbar">
        <div>
          <h1>Dashboard Center Analytics</h1>
          <p>Consumo, custos e eficiência do Data Center de IA — série mensal simulada de 2025.</p>
        </div>
        <div className="filters">
          <span>Período</span>
          <select value={deIdx} onChange={(e) => setDeIdx(Number(e.target.value))}>
            {monthly.map((m, i) => (
              <option key={m.mes} value={i}>
                {m.mes}
              </option>
            ))}
          </select>
          <span>até</span>
          <select value={ateIdx} onChange={(e) => setAteIdx(Number(e.target.value))}>
            {monthly.map((m, i) => (
              <option key={m.mes} value={i}>
                {m.mes}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="kpis">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid">
        <Panel title="Consumo energético" subtitle="kWh por mês — total e perdido">
          <TrendChart
            data={chartData}
            xKey="label"
            series={[
              { dataKey: "energia_total_kwh", name: "Total", color: "#5CC8FF", type: "area" },
              { dataKey: "energia_perdida_kwh", name: "Perdida", color: "#E86A6A", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Consumo hídrico" subtitle="Litros por mês — total, reaproveitado e perdido">
          <TrendChart
            data={chartData}
            xKey="label"
            series={[
              { dataKey: "agua_total_l", name: "Total", color: "#46D0B0", type: "area" },
              { dataKey: "agua_reaproveitada_l", name: "Reaproveitada", color: "#8FD16B", type: "line" },
              { dataKey: "agua_perdida_l", name: "Perdida", color: "#E86A6A", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Custos" subtitle="R$ por mês — energia + água">
          <TrendChart
            data={chartData}
            xKey="label"
            stacked
            series={[
              { dataKey: "custo_energia_rs", name: "Energia", color: "#5CC8FF", type: "bar" },
              { dataKey: "custo_agua_rs", name: "Água", color: "#46D0B0", type: "bar" },
            ]}
          />
        </Panel>
        <Panel title="Utilização de servidores/GPUs" subtitle="% médio por mês">
          <TrendChart
            data={chartData}
            xKey="label"
            series={[
              { dataKey: "util_servidores", name: "Servidores", color: "#5CC8FF", type: "line" },
              { dataKey: "util_gpus", name: "GPUs", color: "#F2B155", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Temperatura" subtitle="°C médio por mês — interna vs. externa">
          <TrendChart
            data={chartData}
            xKey="label"
            series={[
              { dataKey: "temp_interna", name: "Interna", color: "#8FD16B", type: "line" },
              { dataKey: "temp_externa", name: "Externa", color: "#F2B155", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Emissões de CO₂" subtitle="kg por mês">
          <TrendChart
            data={chartData}
            xKey="label"
            series={[{ dataKey: "co2_emissoes_kg", name: "CO₂ (kg)", color: "#E86A6A", type: "bar" }]}
          />
        </Panel>
        <Panel title="Indicadores de eficiência" subtitle="Eficiência energética e hídrica (%) por mês" span2>
          <TrendChart
            data={chartData}
            xKey="label"
            height={210}
            series={[
              { dataKey: "eficiencia_energetica_pct", name: "Eficiência energética", color: "#5CC8FF", type: "line" },
              { dataKey: "eficiencia_hidrica_pct", name: "Eficiência hídrica", color: "#46D0B0", type: "line" },
            ]}
          />
        </Panel>
      </div>

      <header className="topbar sub-topbar">
        <div>
          <h1 className="small">Detalhe diário</h1>
          <p>Consumo dia a dia dentro do mês selecionado.</p>
        </div>
        <div className="filters">
          <span>Mês</span>
          <select value={mesDetalhe} onChange={(e) => setMesDetalhe(e.target.value)}>
            {monthly.map((m) => (
              <option key={m.mes} value={m.mes}>
                {m.mes}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid">
        <Panel title="Energia por dia" subtitle="kWh — total e perdida">
          <TrendChart
            data={dailyRows}
            xKey="label"
            series={[
              { dataKey: "energia_total_kwh", name: "Total", color: "#5CC8FF", type: "area" },
              { dataKey: "energia_perdida_kwh", name: "Perdida", color: "#E86A6A", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Utilização por dia" subtitle="% médio — servidores e GPUs">
          <TrendChart
            data={dailyRows}
            xKey="label"
            series={[
              { dataKey: "util_servidores", name: "Servidores", color: "#5CC8FF", type: "line" },
              { dataKey: "util_gpus", name: "GPUs", color: "#F2B155", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Temperatura por dia" subtitle="°C médio — interna vs. externa">
          <TrendChart
            data={dailyRows}
            xKey="label"
            series={[
              { dataKey: "temp_interna", name: "Interna", color: "#8FD16B", type: "line" },
              { dataKey: "temp_externa", name: "Externa", color: "#F2B155", type: "line" },
            ]}
          />
        </Panel>
        <Panel title="Custo por dia" subtitle="R$ — energia + água">
          <TrendChart
            data={dailyRows}
            xKey="label"
            series={[{ dataKey: "custo_total_rs", name: "Custo total (R$)", color: "#F2B155", type: "bar" }]}
          />
        </Panel>
      </div>

      <header className="topbar sub-topbar">
        <div>
          <h1 className="small">Ciência de dados (Fase 4)</h1>
          <p>Previsões e detecção de anomalias — modelos treinados sobre o histórico, não medições diretas.</p>
        </div>
      </header>

      <div className="grid">
        <Panel
          title="Energia projetada"
          subtitle={`Próximos 30 dias (estimativa) — erro do modelo ${metricaPorAlvo.energia_total_kwh.mape_modelo_pct.toFixed(1)}% vs. baseline ${metricaPorAlvo.energia_total_kwh.mape_baseline_pct.toFixed(1)}%`}
        >
          <TrendChart
            data={previsaoEnergia}
            xKey="label"
            series={[
              { dataKey: "historico", name: "Histórico", color: "#5CC8FF", type: "line" },
              { dataKey: "previsto", name: "Previsão", color: "#F2B155", type: "line", dash: "5 4" },
            ]}
          />
        </Panel>
        <Panel
          title="Custo projetado"
          subtitle={`Próximos 30 dias (estimativa) — erro do modelo ${metricaPorAlvo.custo_total_rs.mape_modelo_pct.toFixed(1)}% vs. baseline ${metricaPorAlvo.custo_total_rs.mape_baseline_pct.toFixed(1)}%`}
        >
          <TrendChart
            data={previsaoCusto}
            xKey="label"
            series={[
              { dataKey: "historico", name: "Histórico", color: "#46D0B0", type: "line" },
              { dataKey: "previsto", name: "Previsão", color: "#F2B155", type: "line", dash: "5 4" },
            ]}
          />
        </Panel>
        <Panel
          title="Anomalias por dia"
          subtitle={`${anomaliasTop.length > 0 ? "Isolation Forest" : ""} — ${anomaliasPorDia.reduce((a, d) => a + d.qtd_anomalias, 0)} horas suspeitas em ${anomaliasPorDia.length} dias do ano (a validar)`}
        >
          <TrendChart
            data={anomaliasPorDia.map((d) => ({ ...d, label: d.dia.slice(5) }))}
            xKey="label"
            series={[{ dataKey: "qtd_anomalias", name: "Horas anômalas", color: "#E86A6A", type: "bar" }]}
          />
        </Panel>
        <Panel title="Top anomalias" subtitle="As 15 horas mais suspeitas, por pontuação do modelo" span2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ color: "var(--dim)", textAlign: "left" }}>
                  <th style={{ padding: "4px 8px" }}>Data/hora</th>
                  <th style={{ padding: "4px 8px" }}>Energia (kWh)</th>
                  <th style={{ padding: "4px 8px" }}>Temp. interna</th>
                  <th style={{ padding: "4px 8px" }}>Temp. externa</th>
                  <th style={{ padding: "4px 8px" }}>Utiliz. servidores</th>
                  <th style={{ padding: "4px 8px" }}>Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {anomaliasTop.map((a, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="mono" style={{ padding: "4px 8px" }}>{a.data_hora}</td>
                    <td className="mono" style={{ padding: "4px 8px" }}>{fmt(a.energia_total_kwh)}</td>
                    <td className="mono" style={{ padding: "4px 8px" }}>{fmt(a.temperatura_interna_c, 1)}°C</td>
                    <td className="mono" style={{ padding: "4px 8px" }}>{fmt(a.temperatura_externa_c, 1)}°C</td>
                    <td className="mono" style={{ padding: "4px 8px" }}>{fmt(a.utilizacao_servidores_pct, 1)}%</td>
                    <td className="mono" style={{ padding: "4px 8px" }}>{fmt(a.pontuacao_anomalia, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <footer>
        Dataset sintético gerado para o Projeto Integrador — os valores não representam medições reais. PUE, WUE e
        as demais fórmulas seguem as regras de negócio definidas na Fase 0 do projeto. Previsões e anomalias da
        Fase 4 são estimativas de modelo, não medições, e dependem de validação humana (RN27/RN28).
      </footer>

      <Assistant dadosDiariosDoMes={dailyRows} mesEmExibicao={mesDetalhe} />
    </div>
  );
}
