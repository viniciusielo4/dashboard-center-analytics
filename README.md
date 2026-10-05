# Dashboard Center Analytics

Dashboard de eficiência e sustentabilidade de um Data Center de IA — Projeto Integrador 2026/02 (UniSENAI).

Feito com React + Vite + Recharts. Os dados (mensais e diários) são os mesmos gerados/tratados nas Fases 1 e 2
do projeto, exportados como JSON estático em `src/data/`.

## Assistente de dados (Fase 5 — IA)

O dashboard tem um assistente de chat (botão 💬 no canto inferior direito) que responde perguntas em
linguagem natural **somente com base nos dados deste projeto** (KPIs mensais, previsões, anomalias e o
detalhe diário do mês em exibição). Ele roda em duas partes:

- **Front-end** (`src/components/Assistant.jsx`): a interface de chat, que manda a pergunta para `/api/assistant`.
- **Back-end** (`api/assistant.js`): uma função serverless que guarda a chave da API em segredo, monta o
  contexto (RAG simples) e chama a API do **Gemini** (modelo `gemini-3.8-flash` — rápido, barato e com nível
  gratuito, ideal para perguntas curtas sobre dados já estruturados).

**Por que uma função serverless e não chamar a API direto do navegador?** Qualquer chave colocada no código
do front-end fica visível para quem abrir o site (F12 → Network ou até o próprio JS baixado) — dá para
qualquer pessoa roubar sua chave e gastar sua cota. A função serverless é a única parte que enxerga a chave;
o navegador só fala com ela, nunca com o Google diretamente.

### Configurar sua chave

1. Crie uma chave gratuita em [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (login com
   conta Google, sem cartão de crédito).
2. Copie `.env.example` para `.env.local` e cole sua chave:
   ```
   GEMINI_API_KEY=AIza...
   ```
   Esse arquivo já está no `.gitignore` — nunca vai parar no GitHub.

### Rodar localmente (com o assistente funcionando)

O `npm run dev` comum (Vite) **não** executa a pasta `api/` — ele só serve o front-end. Para testar o
assistente localmente, rode em **dois terminais ao mesmo tempo**, dentro da pasta do projeto:

```bash
# Terminal 1 - o servidor local do assistente (lê o .env.local sozinho)
npm run dev:api

# Terminal 2 - o dashboard em si
npm run dev
```

Abra o endereço que o `npm run dev` mostrar (geralmente `http://localhost:5173`). O Vite encaminha
automaticamente as chamadas de `/api/assistant` para o servidor do Terminal 1 (configurado em
`vite.config.js`), então o chat funciona normalmente. O `dev-server.cjs` é só para desenvolvimento local -
ele não é usado no deploy; na Vercel, `api/assistant.cjs` roda direto como função serverless.

Se quiser só mexer no visual/gráficos sem a IA, rode apenas `npm run dev` (Terminal 2) — o botão de chat
aparece, mas dá erro ao responder, já que o Terminal 1 não está no ar.

<details>
<summary>Alternativa: CLI da Vercel (<code>vercel dev</code>)</summary>

Também é possível testar com a própria CLI da Vercel, que simula o ambiente de produção mais fielmente:

```bash
npm install -g vercel   # só uma vez
vercel dev
```

Isso sobe o site e a função juntos em um único endereço (geralmente `http://localhost:3000`). Na prática,
porém, o `vercel dev` tem se mostrado instável em algumas instalações do Windows (travamentos ao salvar
arquivos, respostas vazias) - se isso acontecer, prefira o caminho dos dois terminais acima.
</details>

## Rodar localmente (sem a IA)

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Gerar a versão de produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos estáticos prontos para deploy.

```bash
npm run preview
```

Serve a pasta `dist/` localmente, para conferir antes de publicar.

## Deploy

Agora que o projeto tem uma função serverless (`api/assistant.js`), o deploy precisa de uma plataforma que
rode essa função — não é mais só arquivo estático. **GitHub Pages não serve** (só hospeda HTML/CSS/JS puro,
sem back-end).

- **Vercel** (recomendado, é o que este projeto já está configurado para):
  1. Suba o projeto pro GitHub e importe no [vercel.com](https://vercel.com).
  2. A Vercel detecta o Vite e o `vercel.json` automaticamente — não precisa configurar build command nem output.
  3. **Antes de fazer o primeiro deploy**, vá em Project Settings → Environment Variables e adicione
     `GEMINI_API_KEY` com sua chave (a mesma do `.env.local`). Sem isso, o botão de chat aparece mas o
     assistente responde com erro.
- **Netlify**: dá pra fazer, mas a função precisa ser reescrita no formato de Netlify Functions
  (`netlify/functions/assistant.js`, com uma assinatura de handler diferente) — não é um simples copiar e
  colar do `api/assistant.js`. Se for esse o caminho, me avise que eu adapto.

Se em algum momento você quiser voltar a ter só o dashboard (sem o assistente/back-end), o projeto antigo
sem a pasta `api/` continua funcionando como site 100% estático em qualquer lugar, GitHub Pages incluso.

## Estrutura

```
src/
  App.jsx              -> layout principal, filtros e KPIs
  components/
    KpiCard.jsx         -> cartão de indicador (com semáforo)
    Panel.jsx           -> moldura de cada painel/gráfico
    TrendChart.jsx       -> gráfico genérico (linha/área/barra) usando Recharts
  data/
    monthly.json        -> 12 registros mensais (KPIs, energia, água, custos, CO2, temperatura, utilização)
    daily.json           -> 365 registros diários, usados no detalhe por mês
  utils.js               -> formatação de números e cálculo dos semáforos
```

## Atualizando os dados

Os JSONs em `src/data/` são estáticos — para atualizar (por exemplo, depois de rodar de novo o pipeline de
limpeza/análise em Python), é só gerar um novo `monthly.json`/`daily.json` no mesmo formato e substituir os
arquivos aqui. Não precisa mexer em nenhum componente.

## Limitações e premissas assumidas

- Os limiares de semáforo (PUE, eficiência energética/hídrica, desperdício) em `src/utils.js` são estimativas
  iniciais — ajuste conforme a orientação da disciplina.
- O dataset é sintético, gerado para fins do projeto; os valores não são medições reais de um Data Center.
