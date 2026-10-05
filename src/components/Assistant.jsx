import { useRef, useState, useEffect } from "react";

// Renderizador de Markdown bem simples, só para o que o assistente costuma usar:
// **negrito**, *itálico*, `código`, listas com "-"/"*"/"1." e quebras de linha.
// Sem biblioteca externa de propósito, para não engordar o bundle por causa disso.
function renderInline(texto, prefixo) {
  const regex = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*/g;
  const nodes = [];
  let ultimoIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(texto))) {
    if (match.index > ultimoIndex) nodes.push(texto.slice(ultimoIndex, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={`${prefixo}-b-${i}`}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<code key={`${prefixo}-c-${i}`}>{match[2]}</code>);
    else if (match[3] !== undefined) nodes.push(<em key={`${prefixo}-i-${i}`}>{match[3]}</em>);
    ultimoIndex = regex.lastIndex;
    i += 1;
  }
  if (ultimoIndex < texto.length) nodes.push(texto.slice(ultimoIndex));
  return nodes;
}

function renderMarkdown(texto) {
  const blocos = texto.trim().split(/\n{2,}/);
  return blocos.map((bloco, bi) => {
    const linhas = bloco
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const ehLista = linhas.length > 0 && linhas.every((l) => /^[-*]\s+/.test(l));
    const ehListaNumerada = linhas.length > 0 && linhas.every((l) => /^\d+\.\s+/.test(l));

    if (ehLista || ehListaNumerada) {
      const Tag = ehListaNumerada ? "ol" : "ul";
      return (
        <Tag key={bi} className="assistant-list">
          {linhas.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^(?:[-*]|\d+\.)\s+/, ""), `${bi}-${li}`)}</li>
          ))}
        </Tag>
      );
    }

    return (
      <p key={bi} className="assistant-paragraph">
        {linhas.map((l, li) => (
          <span key={li}>
            {renderInline(l, `${bi}-${li}`)}
            {li < linhas.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export default function Assistant({ dadosDiariosDoMes, mesEmExibicao }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([
    {
      role: "assistant",
      content:
        "Oi! Eu respondo perguntas sobre os dados deste dashboard (energia, água, custos, eficiência, previsões e anomalias). Se a pergunta for sobre outra coisa, eu aviso que não tenho essa informação.",
    },
  ]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  async function enviar(e) {
    e.preventDefault();
    const pergunta = entrada.trim();
    if (!pergunta || carregando) return;

    const historico = mensagens.map((m) => ({ role: m.role, content: m.content }));
    setMensagens((m) => [...m, { role: "user", content: pergunta }]);
    setEntrada("");
    setCarregando(true);
    setErro(null);

    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta,
          historico,
          contexto_diario: dadosDiariosDoMes,
          mes_em_exibicao: mesEmExibicao,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro desconhecido");
      setMensagens((m) => [...m, { role: "assistant", content: data.resposta }]);
    } catch (err) {
      setErro(err.message || "Não consegui falar com a IA agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button className="assistant-fab" onClick={() => setAberto((v) => !v)} aria-label="Abrir assistente">
        {aberto ? "✕" : "💬"}
      </button>

      {aberto && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <strong>Assistente de dados</strong>
            <span className="sub">Respostas baseadas somente nos dados deste dashboard</span>
          </div>

          <div className="assistant-messages">
            {mensagens.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.role}`}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            ))}
            {carregando && <div className="assistant-msg assistant">Consultando os dados…</div>}
            {erro && <div className="assistant-msg erro">{erro}</div>}
            <div ref={fimRef} />
          </div>

          <form className="assistant-input" onSubmit={enviar}>
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Ex.: qual mês teve mais desperdício de energia?"
              disabled={carregando}
            />
            <button type="submit" disabled={carregando || !entrada.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
