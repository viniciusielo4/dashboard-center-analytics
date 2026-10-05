// Função serverless (roda no servidor da Vercel, nunca no navegador do usuário).
// É AQUI, e só aqui, que a chave da API fica — o front-end nunca vê GEMINI_API_KEY.
//
// Este arquivo usa CommonJS (require/module.exports) de propósito, com extensão .cjs:
// isso remove qualquer ambiguidade sobre o formato do módulo (evita conflitos com o
// "type": "module" do package.json, que é usado pelo resto do projeto/Vite) e é o
// formato mais testado para funções serverless da Vercel.
const { GoogleGenAI } = require("@google/genai");
const fs = require("node:fs");
const path = require("node:path");

// Carrega os dados que servem de "base de conhecimento" do assistente (RAG simples):
// o mesmo conteúdo que já alimenta os gráficos do dashboard, só que aqui como texto
// para o modelo ler. Ficam copiados em api/data/ para o bundle da função não
// depender de arquivos de fora da pasta api/.
function carregaJSON(nome) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", nome), "utf-8"));
}

const monthly = carregaJSON("monthly.json");
const metrics = carregaJSON("metrics.json");
const forecast = carregaJSON("forecast.json");
const anomaliasTop = carregaJSON("anomalias_top.json");
const anomaliasPorDia = carregaJSON("anomalias_por_dia.json");
const totalAnomalias = anomaliasPorDia.reduce((a, d) => a + d.qtd_anomalias, 0);

const SYSTEM_PROMPT = `Você é o assistente de dados do "Dashboard Center Analytics", projeto integrador sobre
um Data Center de IA. O dataset é SINTÉTICO (gerado para fins acadêmicos) - não são medições reais.

Regras obrigatórias, sem exceção:
- Responda SOMENTE com base nos dados fornecidos no contexto da mensagem. Nunca invente, estime ou complete
  números que não estejam explicitamente nos dados.
- Se a pergunta não puder ser respondida com esses dados (ex.: assunto fora do projeto, período não coberto,
  dado que não existe), diga claramente: "Não tenho essa informação nos dados do dashboard." Não tente adivinhar.
- Sempre que citar um número, diga a que mês (ou dia, se disponível) ele se refere.
- A seção de previsão contém ESTIMATIVAS de um modelo estatístico, não medições - deixe isso claro sempre que
  usar algum valor dela.
- A seção de anomalias contém horas SUSPEITAS sinalizadas por um modelo, que dependem de validação humana -
  nunca afirme que algo é um problema confirmado.
- Se fizer alguma recomendação, deixe explícito que é uma sugestão, não uma decisão - a decisão final é de quem
  opera o Data Center.
- Seja direto e conciso: poucos parágrafos, sem enrolação.`;

function montaContexto(dadosDiariosDoMes, mesEmExibicao) {
  const partes = [
    `## KPIs mensais do ano de 2025 (energia, água, custos, CO2, eficiências, temperatura, utilização)\n${JSON.stringify(monthly)}`,
    `## Métricas dos modelos de previsão (erro no conjunto de teste, MAE/MAPE, comparado a um baseline ingênuo)\n${JSON.stringify(metrics)}`,
    `## Previsão para os 30 dias seguintes ao fim do histórico (ESTIMATIVA de modelo, não medição)\n${JSON.stringify(forecast)}`,
    `## Detecção de anomalias (Isolation Forest)\nTotal: ${totalAnomalias} horas suspeitas em ${anomaliasPorDia.length} dias do ano.\nAs 15 mais suspeitas:\n${JSON.stringify(anomaliasTop)}`,
  ];
  if (dadosDiariosDoMes && dadosDiariosDoMes.length) {
    partes.push(
      `## Dados diários do mês atualmente em exibição no dashboard (${mesEmExibicao || "?"})\n${JSON.stringify(dadosDiariosDoMes)}`
    );
  }
  return partes.join("\n\n");
}

// O Gemini às vezes responde 503 "model overloaded" em picos de demanda - é passageiro.
// Tenta de novo algumas vezes, com uma pequena espera crescente entre as tentativas,
// antes de desistir e mostrar erro pro usuário.
async function geraComRetentativa(ai, params, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const sobrecarregado = err?.status === 503;
      const ultimaTentativa = i === tentativas - 1;
      if (!sobrecarregado || ultimaTentativa) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1))); // 800ms, depois 1600ms
    }
  }
}

// Gemini usa role "model" para o assistente, não "assistant" como guardamos no front-end.
function paraFormatoGemini(mensagensInternas) {
  return mensagensInternas.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    return;
  }

  const { pergunta, historico = [], contexto_diario = [], mes_em_exibicao } = req.body || {};
  if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
    res.status(400).json({ error: "Campo 'pergunta' é obrigatório." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const mensagens = paraFormatoGemini([
      ...historico.slice(-6),
      {
        role: "user",
        content: `${montaContexto(contexto_diario, mes_em_exibicao)}\n\nPergunta do usuário: ${pergunta}`,
      },
    ]);

    const resposta = await geraComRetentativa(ai, {
      model: "gemini-3.8-flash",
      contents: mensagens,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: "low" },
      },
    });

    res.status(200).json({ resposta: resposta.text ?? "" });
  } catch (err) {
    console.error("Erro ao chamar a API do Gemini:", err);
    const sobrecarregado = err?.status === 503;
    res.status(503).json({
      error: sobrecarregado
        ? "O modelo está sobrecarregado agora (instabilidade do Google, não do seu projeto). Tente de novo em alguns segundos."
        : "Erro ao consultar a IA. Tente novamente em instantes.",
    });
  }
};
