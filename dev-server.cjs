// Servidor local bem simples, só para testar a função api/assistant.cjs durante o
// desenvolvimento, sem depender do "vercel dev" (que tem se mostrado instável no
// Windows). Isso NÃO é usado no deploy - a Vercel usa api/assistant.cjs diretamente
// como função serverless, sem precisar deste arquivo.
//
// Rode com: npm run dev:api
// (em outro terminal, ao mesmo tempo, rode: npm run dev)
const http = require("node:http");
const handler = require("./api/assistant.cjs");

const PORT = 8787;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  let corpo = "";
  req.on("data", (chunk) => (corpo += chunk));
  req.on("end", async () => {
    try {
      req.body = corpo ? JSON.parse(corpo) : {};
    } catch {
      req.body = {};
    }

    const resShim = {
      _status: 200,
      status(codigo) {
        this._status = codigo;
        return this;
      },
      json(obj) {
        res.writeHead(this._status, { "Content-Type": "application/json", ...corsHeaders() });
        res.end(JSON.stringify(obj));
      },
    };

    try {
      await handler(req, resShim);
    } catch (err) {
      console.error("Erro não tratado na função:", err);
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders() });
      res.end(JSON.stringify({ error: "Erro interno no servidor local de testes." }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Assistente de dados rodando em http://localhost:${PORT}`);
  console.log(`Deixe este terminal aberto e rode "npm run dev" em outro, para o dashboard.`);
});
