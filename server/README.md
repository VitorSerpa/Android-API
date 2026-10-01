# Mente Equilibrada — servidor

Backend pequeno do app **Mente Equilibrada**. Ele oferece:

- **Grupos de apoio anônimos** com chat em tempo real (WebSocket) e histórico via HTTP;
- **Convites de apoiador**: a pessoa gera um link e compartilha com alguém de confiança, que passa a ver um **resumo semanal anônimo** de bem-estar numa página web simples.

Feito com Node.js puro (ESM, módulo `http`) e uma única dependência: [`ws`](https://github.com/websockets/ws). Os dados ficam num arquivo JSON.

**Anonimato:** o servidor nunca armazena nem transmite id de usuário, nome, IP ou identificador de socket junto das mensagens. Dos convites, guarda apenas o token, o hash SHA-256 do `ownerKey`, datas e o último resumo, sem nenhuma identidade de quem o criou.

## Como executar

Requer Node.js 22 ou mais recente.

```bash
cd server
npm install
npm start        # produção
npm run dev      # reinicia sozinho ao alterar arquivos
npm test         # testes (node:test)
```

### Variáveis de ambiente

| Variável     | Padrão                         | Descrição                                                      |
|--------------|--------------------------------|----------------------------------------------------------------|
| `PORT`       | `3000`                         | Porta HTTP/WebSocket.                                           |
| `HOST`       | `0.0.0.0`                      | Interface de rede.                                              |
| `PUBLIC_URL` | `http://localhost:${PORT}`     | Base usada para montar os links de convite (`${PUBLIC_URL}/i/<token>`). |
| `DATA_FILE`  | `./data/db.json`               | Arquivo de persistência (criado se não existir). Gravação atômica (arquivo temporário + rename) com debounce de ~200 ms. |

A pasta `data/` está no `.gitignore`. Na primeira execução, três grupos são criados: "Ansiedade no dia a dia", "Rotina e sono" e "Trabalho e estresse".

### Conectando o app Android

- **Emulador Android:** use `http://10.0.2.2:3000` (e `ws://10.0.2.2:3000/ws`). `10.0.2.2` é o endereço do computador visto de dentro do emulador.
- **Aparelho físico via USB:** rode `adb reverse tcp:3000 tcp:3000` e use `http://localhost:3000` no app.
- Para que os links de convite abram em outros aparelhos, defina `PUBLIC_URL` com um endereço acessível por eles (ex.: `PUBLIC_URL=https://meu-servidor.exemplo`).

## Contrato da API

Todas as respostas trazem CORS (`Access-Control-Allow-Origin: *`, métodos `GET,POST,PUT,DELETE,OPTIONS`, cabeçalhos `Content-Type, Authorization`). Requisições `OPTIONS` recebem `204`. Os corpos são JSON UTF-8, com limite de **64 KB** (acima disso, `413`). Os erros vêm no formato `{ "error": "<mensagem>" }` com o status adequado (`400`, `401`, `404`, `405`, `410`, `413`, `500`).

### HTTP

#### `GET /health`
`200` → `{ "ok": true }`

#### `GET /groups`
`200` → `[{ id, name, description, createdAt, online }]`, em que `online` é o número de sockets conectados ao grupo naquele momento.

#### `POST /groups`
Corpo: `{ "name": "...", "description": "..." }`. O `name` é obrigatório e tem de 3 a 60 caracteres; a `description` é opcional, com até 200 caracteres. Os dois campos passam por trim.
`201` → o grupo criado (mesmo formato da listagem). Dados inválidos → `400`.

#### `GET /groups/:id/messages?since=<ISO>`
`200` → até as **últimas 200** mensagens do grupo, da mais antiga para a mais nova. Com `since`, retorna só as de `createdAt > since`.
Formato: `{ id, groupId, text, createdAt, clientId }`.
Grupo desconhecido → `404`. `since` que não é data válida → `400`.

### Convites de apoiador

#### `POST /invites`
Sem corpo. `201` →
```json
{ "token": "<16 bytes base64url>", "ownerKey": "<32 bytes base64url>", "url": "${PUBLIC_URL}/i/<token>" }
```
O servidor guarda apenas o hash SHA-256 do `ownerKey`. **O app deve guardá-lo com segurança**, porque ele não pode ser recuperado.

#### `PUT /invites/:token/summary`
Cabeçalho `Authorization: Bearer <ownerKey>`. Corpo:
```json
{ "periodLabel": "22 Set a 28 Set", "generatedAt": "2026-09-28T21:00:00.000Z", "lines": ["Humor médio: 3,8 / 5", "..."] }
```
Limites: até 30 linhas, cada uma com até 200 caracteres; `periodLabel` com até 100 caracteres; `generatedAt` em ISO 8601. O novo resumo substitui o anterior.
`204` em caso de sucesso · `401` chave inválida · `404` token desconhecido · `410` convite revogado · `400` dados inválidos.

#### `DELETE /invites/:token`
Mesmo cabeçalho `Authorization`. `204` → o convite é marcado como revogado: fica um registro mínimo (tombstone) e o resumo é descartado. Repetir a chamada também devolve `204`. `401` chave inválida · `404` token desconhecido.

#### `GET /invites/:token/summary`
`200` → `{ periodLabel, generatedAt, lines }` · `404` token desconhecido ou ainda sem resumo · `410` revogado.

#### `GET /i/:token`
Página HTML em pt-BR, autocontida e acessível, feita para celular, que a pessoa apoiadora abre pelo link:
- com resumo: mostra o período, a data de geração e as linhas (todo o conteúdo passa por escape de HTML);
- sem resumo: mensagem "Ainda não há resumo disponível";
- revogado: "Este convite foi revogado" (status `410`);
- token desconhecido: página "Convite não encontrado" (status `404`).

A página nunca mostra nome ou identidade de quem compartilhou.

### WebSocket — `ws://<host>:<porta>/ws`

Todas as mensagens são JSON (texto).

**Cliente → servidor**

| Mensagem | Resposta |
|---|---|
| `{ "type": "join", "groupId": "..." }` | `{ "type": "joined", "groupId", "messages": [últimas 50] }` ou `{ "type": "error", "error" }` se o grupo não existir |
| `{ "type": "leave", "groupId": "..." }` | sem resposta |
| `{ "type": "message", "groupId": "...", "text": "...", "clientId": "<uuid>" }` | broadcast + `ack` (veja abaixo) |
| `{ "type": "ping" }` | `{ "type": "pong" }` |

**Regras de `message`:**
- o socket precisa ter feito `join` no grupo;
- o `text` passa por trim e deve ter de 1 a 1000 caracteres;
- `clientId` é um UUID gerado pelo app, com até 100 caracteres;
- **Idempotência por `clientId`:** se já existe no grupo uma mensagem com esse `clientId`, o servidor só reenvia o `ack` e não faz novo broadcast. Assim o app pode reenviar a fila com segurança depois de reconectar;
- a mensagem é salva e enviada a **todos** os sockets do grupo (inclusive o remetente):
  `{ "type": "message", "message": { id, groupId, text, createdAt, clientId } }`;
- o remetente também recebe `{ "type": "ack", "clientId", "id" }`;
- limite de taxa: no máximo 10 mensagens novas a cada 10 s por socket. Acima disso, o servidor responde `{ "type": "error", "error": "...", "clientId" }`;
- cada grupo guarda no máximo 500 mensagens; as mais antigas são descartadas.

**Erros:** sempre `{ "type": "error", "error": "<mensagem>" }`. Quando o erro se refere a uma mensagem enviada, inclui também o `clientId` dela; quando se refere a um `join`, inclui o `groupId`.

**Heartbeat:** o servidor envia ping a cada 30 s e encerra as conexões que não respondem. O app pode usar `{ "type": "ping" }` para medir a conexão.

## Estrutura

```
server/
├── src/
│   ├── index.js     # ponto de entrada (env, sinais de encerramento)
│   ├── config.js    # leitura das variáveis de ambiente
│   ├── server.js    # monta HTTP + WebSocket (createApp)
│   ├── http.js      # rotas HTTP, CORS, limite de corpo, erros
│   ├── ws.js        # chat em tempo real dos grupos
│   ├── store.js     # persistência JSON (atômica, com debounce)
│   ├── invites.js   # regras dos convites de apoiador
│   ├── html.js      # página pública do convite
│   ├── errors.js    # HttpError
│   └── logger.js    # log conciso (sem conteúdo de mensagens, IPs ou tokens)
└── test/
    └── server.test.js
```
