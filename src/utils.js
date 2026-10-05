export const fmt = (n, d = 0) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

// higherIsBetter=true: value >= good -> verde, >= warn -> amarelo, senão vermelho.
// higherIsBetter=false: value <= good -> verde, <= warn -> amarelo, senão vermelho.
export function semaphore(value, good, warn, higherIsBetter) {
  const ok = higherIsBetter ? value >= good : value <= good;
  const mid = higherIsBetter ? value >= warn : value <= warn;
  return ok ? "var(--eff)" : mid ? "var(--cost)" : "var(--waste)";
}

export function mesLabel(mes) {
  // "2025-01" -> "01/25"
  return `${mes.slice(5)}/${mes.slice(2, 4)}`;
}

export function diaLabel(dia) {
  // "2025-01-15" -> "15"
  return dia.slice(8, 10);
}

// Junta os últimos `diasHistorico` dias reais com a previsão futura em uma
// única série, com um ponto de emenda para a linha tracejada nascer exatamente
// onde a linha do histórico termina.
export function montaSerieComPrevisao(dailyAll, forecastArr, chave, diasHistorico = 60) {
  const hist = dailyAll.slice(-diasHistorico).map((d) => ({
    dia: d.dia,
    historico: d[chave],
    previsto: null,
  }));
  const fut = forecastArr.map((d) => ({
    dia: d.dia,
    historico: null,
    previsto: d.valor_previsto_estimativa,
  }));
  if (hist.length) {
    hist[hist.length - 1] = { ...hist[hist.length - 1], previsto: hist[hist.length - 1].historico };
  }
  return [...hist, ...fut].map((d) => ({ ...d, label: d.dia.slice(5) }));
}
