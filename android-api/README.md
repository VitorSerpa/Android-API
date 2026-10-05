# Mente Equilibrada

App Android (Expo SDK 57 / React Native 0.86) de autocuidado emocional: check-ins de humor, diário com fotos e áudios, saúde física, histórico com gráficos, respiração e meditação, modo de emergência, PIN, modo offline, relatórios em PDF, metas e autoavaliações e personalização. Estão desativados no app, com o código comentado: os lembretes/medicamentos com alertas e a tela *Pessoa de confiança e integrações* (grupos, convites, Spotify e Health Connect) — ver `src/components/mente/background-tasks.tsx` e `src/app/(app)/community.tsx`. O backend dessas funções fica em [`../server`](../server/README.md) e hoje não é usado pelo app.

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha (veja abaixo)
npx expo run:android          # build de desenvolvimento no emulador/aparelho
npm run web                   # prévia web (sem recursos nativos)
```

Recursos nativos — notificações, câmera, microfone, GPS, SQLite, PDF, Health Connect — exigem o build de desenvolvimento (`expo-dev-client`); não funcionam no Expo Go nem por completo na web. Depois de mudar `app.json` ou instalar módulos nativos, rode `npx expo prebuild --clean` ou um novo `npx expo run:android`.

Verificações:

```bash
npx tsc --noEmit        # tipos
npm run lint            # ESLint
npm run check:contrast  # contraste ≥ 4.5:1 em todas as paletas (RNF-04)
```

Passo a passo completo para rodar no emulador do Android Studio: veja o [README da raiz](../README.md#como-rodar-emulador-do-android-studio).

## Variáveis de ambiente (`.env.local`)

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Login por e-mail e senha (Firebase Authentication). |
| `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | Opcional: usa o Auth Emulator local. |
| `EXPO_PUBLIC_API_URL` | Servidor de `../server`. Hoje sem uso (convites e grupos desativados). No emulador Android: `http://10.0.2.2:3000`. |
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
| `src/data/insights.ts`, `assessments.ts`, `thoughts.ts`, `report.ts`, `phrases.ts` | Domínio | Regras puras: médias, correlações, metas, sugestões, testes, reestruturação cognitiva, relatório. |
| `src/data/types.ts`, `defaults.ts`, `repository*.ts`, `user-data-context.tsx` | Dados | Modelo (v2 + migração do v1), SQLite no Android / AsyncStorage na web, store com as ações. |
| `src/lib/` | Infra | Notificações, mídia, arquivos/PDF, localização, PIN, API, chat, Spotify, Health Connect. |

Equivalências com as bibliotecas citadas no backlog: `expo-image-picker` (react-native-image-picker), `expo-audio` (react-native-audio-recorder-player e react-native-sound), `expo-secure-store` (react-native-encrypted-storage), `expo-file-system` + `expo-sharing` (react-native-fs / react-native-share), `expo-print` (react-native-html-to-pdf), `expo-location` (react-native-geolocation-service), `expo-sqlite` (SQLite), `react-native-svg` (gráfico de radar), `Animated` (animações de respiração), WebSocket nativo do React Native (react-native-websocket). A API do Google Fit foi descontinuada em 2026; o sono de vestíveis vem do **Health Connect**, que a substitui.
