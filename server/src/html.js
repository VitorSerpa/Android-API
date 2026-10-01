// Página pública do convite de apoiador (HTML autocontido, apenas CSS inline).

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

function formatDate(iso) {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : dateFormatter.format(new Date(time));
}

// Paleta azul calma; todos os pares texto/fundo têm contraste ≥ 4,5:1 (AA).
const STYLE = `
:root{--bg:#eef4fa;--card:#ffffff;--border:#c9daea;--text:#1a2b3c;--title:#1d4e7a;--muted:#44576a;--soft:#e3eef8}
@media (prefers-color-scheme:dark){:root{--bg:#0f1c2a;--card:#16283a;--border:#2c4760;--text:#e6eef6;--title:#a9ccf0;--muted:#b7c7d6;--soft:#1c3349}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:1.0625rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{max-width:40rem;margin:0 auto;padding:1.5rem 1rem 2.5rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:1rem;padding:1.25rem 1.25rem 1.5rem;margin-bottom:1rem}
.brand{margin:0 0 .25rem;color:var(--muted);font-size:.95rem;font-weight:600;letter-spacing:.02em}
h1{margin:0 0 .75rem;color:var(--title);font-size:1.5rem;line-height:1.3}
h2{margin:0 0 .5rem;color:var(--title);font-size:1.2rem;line-height:1.35}
p{margin:0 0 .75rem}
.meta{color:var(--muted);font-size:.95rem;margin:0 0 1rem}
.meta div{margin:.1rem 0}
ul.lines{list-style:none;margin:0;padding:0}
ul.lines li{background:var(--soft);border-radius:.6rem;padding:.65rem .85rem;margin:0 0 .5rem;overflow-wrap:anywhere}
.notice{background:var(--soft);border-radius:.75rem;padding:1rem;margin:0}
footer{color:var(--muted);font-size:.9rem}
footer p{margin:0 0 .5rem}
strong{font-weight:700}
`;

function layout({ title, content }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)} · Mente Equilibrada</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${content}
<footer>
<p>Este resumo é anônimo: nenhum nome ou dado de identificação de quem o compartilha é exibido ou armazenado.</p>
<p>Se perceber sinais de sofrimento intenso, ofereça escuta e apoio. Em situação de risco, ligue para o CVV (188) ou para o SAMU (192).</p>
</footer>
</main>
</body>
</html>`;
}

const INTRO = `<p class="brand">Mente Equilibrada</p>
<h1>Resumo semanal de bem-estar</h1>
<p>Alguém que confia em você compartilha aqui um resumo anônimo e semanal do próprio bem-estar. Obrigado por estar por perto.</p>`;

/**
 * Renderiza a página conforme o estado do convite.
 * @param {{state:'ready'|'empty'|'revoked'|'unknown', summary?:{periodLabel:string, generatedAt:string, lines:string[]}}} info
 * @returns {{status:number, html:string}}
 */
export function renderInvitePage({ state, summary }) {
  if (state === 'unknown') {
    return {
      status: 404,
      html: layout({
        title: 'Convite não encontrado',
        content: `<section class="card" aria-labelledby="t">
<p class="brand">Mente Equilibrada</p>
<h1 id="t">Convite não encontrado</h1>
<p class="notice">Não encontramos este convite. Confira se o link foi copiado por completo ou peça um novo link à pessoa que o enviou.</p>
</section>`,
      }),
    };
  }

  if (state === 'revoked') {
    return {
      status: 410,
      html: layout({
        title: 'Convite revogado',
        content: `<section class="card" aria-labelledby="t">
<p class="brand">Mente Equilibrada</p>
<h1 id="t">Este convite foi revogado</h1>
<p class="notice">A pessoa que compartilhou este link encerrou o acesso ao resumo. Nenhuma informação está mais disponível aqui.</p>
</section>`,
      }),
    };
  }

  if (state === 'empty') {
    return {
      status: 200,
      html: layout({
        title: 'Resumo semanal',
        content: `<section class="card">
${INTRO}
<p class="notice" role="status">Ainda não há resumo disponível. Assim que o primeiro resumo semanal for compartilhado, ele aparecerá nesta página.</p>
</section>`,
      }),
    };
  }

  const lines = summary.lines.length
    ? `<ul class="lines">
${summary.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('\n')}
</ul>`
    : '<p class="notice">O resumo desta semana não tem itens.</p>';

  return {
    status: 200,
    html: layout({
      title: 'Resumo semanal',
      content: `<section class="card">
${INTRO}
</section>
<section class="card" aria-labelledby="resumo">
<h2 id="resumo">Resumo da semana</h2>
<div class="meta">
<div><strong>Período:</strong> ${escapeHtml(summary.periodLabel)}</div>
<div><strong>Gerado em:</strong> <time datetime="${escapeHtml(summary.generatedAt)}">${escapeHtml(formatDate(summary.generatedAt))}</time></div>
</div>
${lines}
</section>`,
    }),
  };
}
