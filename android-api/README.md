# Mente Equilibrada

App Android (Expo SDK 57 / React Native 0.86) de autocuidado emocional: check-ins de humor, diário com fotos e áudios transcritos, notas de conquistas, saúde física, histórico com gráficos (linha, radar, dispersão sono × humor, humor por perfil, nuvem de palavras), linha do tempo do dia, respiração e meditação, jogo de distração, modo de emergência, PIN, modo offline, sincronização com o servidor, restauração da última tela, relatórios em PDF, metas e autoavaliações e personalização. Estão desativados no app, com o código comentado: os lembretes/medicamentos com alertas e a tela *Pessoa de confiança e integrações* (grupos, convites, Spotify e Health Connect) — ver `src/components/mente/background-tasks.tsx` e `src/app/(app)/community.tsx`. O backend fica em [`../server`](../server/README.md) e é usado pela sincronização (US-14).

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha (veja abaixo)
npx expo run:android          # build de desenvolvimento no emulador/aparelho
npm run web                   # prévia web (sem recursos nativos)
```

**iPhone sem Mac:** `eas build -p ios --profile ios-sideload-dev` compila um `.ipa` sem assinatura na nuvem do EAS, e o Impactor o instala pelo Linux com Apple ID gratuito. O passo a passo está em [Como rodar no iPhone](../README.md#como-rodar-no-iphone-sem-mac). `src/lib/transcription.ios.ts` mantém o `expo-speech-recognition` fora do bundle de iOS, onde a transcrição não é usada.

Recursos nativos — notificações, câmera, microfone, GPS, SQLite, PDF, Health Connect — exigem o build de desenvolvimento (`expo-dev-client`); não funcionam no Expo Go nem por completo na web. Depois de mudar `app.json` ou instalar módulos nativos, rode `npx expo prebuild --clean` ou um novo `npx expo run:android`.

Verificações:

```bash
npx tsc --noEmit        # tipos
npm run lint            # ESLint
npm run check:contrast  # contraste ≥ 4.5:1 em todas as paletas (RNF-04)
npm test                # testes automatizados (node:test, sem dependências extras)
npm run typecheck:test  # tipos dos testes
```

### Testes automatizados (`test/`)

Rodam no Node 22.7+ com `node --test`: o `test/register.mjs` resolve o alias `@/` e troca os módulos nativos (React Native, reconhecimento de voz, SQLite, arquivos) por simulações em `test/mocks/`.

| Arquivo | O que cobre |
|---|---|
| `sync-merge.test.ts` | Mesclagem em três vias (RF-58): adições sem duplicar, exclusões, edição × exclusão, conflitos, primeira sincronização, ordem cronológica. |
| `sync-engine.test.ts` | Integração com o **servidor real** de `../server`: dois aparelhos, 14 dias offline (CA-01/CA-02), conflito 409, exclusões, modo offline, sessão inválida, falha do banco (RNF-07). |
| `transcription.test.ts` | Gravação com transcrição (RF-60): texto parcial e final, áudio entregue mesmo sem fala (CA-02), limite de 30 s, cancelamento, reconhecedor indisponível. |
| `domain.test.ts` | Linha do tempo (RF-62), nuvem de palavras (RF-63), sono × humor e perfis (RF-64/65), sessões da semana (RF-68), pergunta da manhã (RF-70), objetivo semanal (RF-71), jogo de palavras (RF-73). |
| `data-layer.test.ts` | Ações do store (transcrição editável, conquistas, atalhos, apagar locais), migração dos documentos antigos e backup JSON com os novos dados. |

Passo a passo completo para rodar no emulador do Android Studio: veja o [README da raiz](../README.md#como-rodar-emulador-do-android-studio).

## Variáveis de ambiente (`.env.local`)

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Login por e-mail e senha (Firebase Authentication). |
| `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | Opcional: usa o Auth Emulator local. |
| `EXPO_PUBLIC_API_URL` | Servidor de `../server`, usado pela sincronização (RF-58). No emulador Android: `http://10.0.2.2:3000`. Sem ela, os dados ficam só no aparelho e Configurações mostra a sincronização como indisponível. |
| `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` | Conexão com o Spotify (OAuth com PKCE). Hoje sem uso (integrações desativadas). |

As variáveis `EXPO_PUBLIC_*` são lidas quando o Metro inicia — reinicie-o depois de editar.

### Login (Firebase Authentication)

1. No [Console do Firebase](https://console.firebase.google.com), crie um projeto e adicione um **app Web**.
2. Em **Authentication → Método de login**, ative **E-mail/senha**.
3. Preencha as variáveis `EXPO_PUBLIC_FIREBASE_*` em `.env.local`.

Para desenvolver sem um projeto real, use o emulador local:

```bash
npx firebase-tools emulators:start --only auth --project demo-mente
adb reverse tcp:9099 tcp:9099   # só para o emulador Android
```

e em `.env.local` use `EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-mente`, qualquer `EXPO_PUBLIC_FIREBASE_API_KEY` e `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.

## Organização do código

| Pasta | Camada | Conteúdo |
|---|---|---|
| `src/app/` | Apresentação | Telas (Expo Router). `(app)/` só abre logado e atrás do PIN (o descanso digital está desativado). |
| `src/components/mente/` | Apresentação | Componentes reutilizáveis (campos, gráficos, teclado do PIN, respiração, áudio). |
| `src/theme/` | Apresentação | Paletas (Sereno, Pastel, Neutro) × claro/escuro e `makeStyles`/`useColors`. |
| `src/data/insights.ts`, `assessments.ts`, `thoughts.ts`, `report.ts`, `phrases.ts`, `timeline.ts`, `word-cloud.ts`, `comparisons.ts`, `word-game.ts`, `sync-merge.ts` | Domínio | Regras puras: médias, correlações, metas, sugestões, testes, reestruturação cognitiva, relatório, linha do tempo, nuvem de palavras, sono × humor e perfis, jogo de palavras, mesclagem da sincronização. |
| `src/data/types.ts`, `defaults.ts`, `repository*.ts`, `user-data-context.tsx`, `sync-engine.ts`, `sync-context.tsx` | Dados | Modelo (v2 + migração do v1), SQLite no Android / AsyncStorage na web, store com as ações, motor de sincronização. |
| `src/lib/` | Infra | Notificações, mídia, transcrição, arquivos/PDF, localização, PIN, API, estado das telas, chat, Spotify, Health Connect. |

### Sprint 2 — onde está cada requisito

| Requisito | Arquivos |
|---|---|
| RF-58 sincronização | `data/sync-merge.ts` (mesclagem em três vias), `data/sync-engine.ts`, `data/sync-context.tsx`, `lib/api.ts`, `repository.native.ts` (tabela `sync_state`), `../server/src/auth.js`, `../server/src/sync-store.js` |
| RF-59 restaurar tela | `lib/screen-state.tsx` (rota, rolagem e rascunhos), usado por `Screen`/`StackScreen`, check-in, Diário e Histórico |
| RF-60/61 transcrição e conquistas | `lib/transcription.ts`, `components/mente/audio.tsx`, `app/(app)/achievements.tsx` |
| RF-62/63 linha do tempo e nuvem | `data/timeline.ts`, `components/mente/day-timeline.tsx`, `data/word-cloud.ts`, `components/mente/word-cloud.tsx` |
| RF-64/65 sono × humor e perfis | `data/comparisons.ts`, `components/mente/scatter-chart.tsx`, cartões no fim de `(tabs)/history.tsx` |
| RF-66 a 69 respiração, semana e atalhos | `app/(app)/practice.tsx`, `insights.ts` (`weeklyCalmSessions`), `components/mente/techniques.ts`, `(tabs)/tools.tsx` |
| RF-70/71 pergunta da manhã e objetivo | `components/mente/morning-check-in.tsx`, `insights.ts` (`weeklyMoodGoalStatus`), Configurações → Rotina, Início |
| RF-72/73 localização e jogo | `components/mente/crisis-quick-log.tsx`, Configurações → Privacidade, `data/word-game.ts`, `app/(app)/word-game.tsx` |
| RF-74 confiabilidade | `repository.native.ts` (transações, `stressTest`), Configurações → Confiabilidade do banco |

Equivalências com as bibliotecas citadas no backlog: `expo-image-picker` (react-native-image-picker), `expo-audio` (react-native-audio-recorder-player e react-native-sound), `expo-secure-store` (react-native-encrypted-storage), `expo-file-system` + `expo-sharing` (react-native-fs / react-native-share), `expo-print` (react-native-html-to-pdf), `expo-location` (react-native-geolocation-service), `expo-sqlite` (SQLite), `react-native-svg` (gráfico de radar), `Animated` (animações de respiração), WebSocket nativo do React Native (react-native-websocket), `expo-speech-recognition` (react-native-voice, que não suporta a New Architecture), `expo-network` (detecção de conexão para a sincronização) e um componente próprio de nuvem de palavras com `Text` (react-native-word-cloud, sem manutenção). A API do Google Fit foi descontinuada em 2026; o sono de vestíveis vem do **Health Connect**, que a substitui.
