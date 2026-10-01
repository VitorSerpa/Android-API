# Mente Equilibrada

App Android (Expo SDK 57 / React Native 0.86) de autocuidado emocional: check-ins de humor, diário com fotos e áudios, saúde física, lembretes e medicamentos, histórico com gráficos, respiração e meditação, modo de emergência, PIN, modo offline, relatórios em PDF, metas e autoavaliações, personalização e uma comunidade anônima de apoio. O backend (grupos em tempo real e convites para pessoa de confiança) fica em [`../server`](../server/README.md).

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

## Passo a passo: rodando no emulador do Android Studio

Para uma máquina que já tem o Android Studio instalado, com o dispositivo virtual **Medium Phone** criado no Device Manager. O login usa o Auth Emulator local do Firebase, então não é preciso criar um projeto no Firebase.

### 1. Pré-requisitos (uma vez)

- **Node.js 22 ou mais recente** (`node -v`).
- **`ANDROID_HOME`** apontando para o SDK do Android Studio e as ferramentas no `PATH`:

  | Sistema | `ANDROID_HOME` | `JAVA_HOME` (JDK que vem com o Android Studio) |
  |---|---|---|
  | Linux | `~/Android/Sdk` | `<pasta do android-studio>/jbr` |
  | macOS | `~/Library/Android/sdk` | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` |
  | Windows | `%LOCALAPPDATA%\Android\Sdk` | `C:\Program Files\Android\Android Studio\jbr` |

  Linux/macOS (coloque no `~/.bashrc` ou `~/.zshrc`):

  ```bash
  export ANDROID_HOME=~/Android/Sdk              # ajuste conforme a tabela
  export JAVA_HOME=/caminho/do/android-studio/jbr
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$JAVA_HOME/bin:$PATH"
  ```

  No Windows, crie as mesmas variáveis em *Variáveis de ambiente do sistema* e adicione `%ANDROID_HOME%\platform-tools` e `%ANDROID_HOME%\emulator` ao `Path`.

  Confira com `adb version` e `java -version` (Java 17 ou mais recente).

### 2. Instalar as dependências (uma vez)

Na raiz do repositório:

```bash
cd android-api && npm ci && cd ..
cd server && npm ci && cd ..
```

### 3. Configurar o `.env.local` (uma vez)

Crie `android-api/.env.local` com:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=demo-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-mente
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-mente.firebaseapp.com
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

`demo-key`/`demo-mente` não são credenciais reais: com `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` definido, o login fala só com o emulador local. `10.0.2.2` é o endereço do computador visto de dentro do emulador Android.

### 4. Iniciar o emulador Android

No Android Studio, abra **Device Manager** e clique em ▶ no **Medium Phone**. Ou, pelo terminal:

```bash
emulator -avd Medium_Phone -gpu host
```

Espere a tela inicial do Android aparecer. Se o emulador fechar sozinho ou travar ao iniciar, use **Cold Boot Now** no menu ⋮ do Device Manager e, nas configurações do dispositivo (✎ *Edit*), mude **Graphics acceleration** para *Hardware*. Feche outros programas pesados se a máquina tiver pouca RAM (o Medium Phone sugere 16 GB).

### 5. Subir os serviços locais (um terminal para cada, deixe abertos)

**Terminal A — login (Firebase Auth Emulator):**

```bash
npx firebase-tools@13 emulators:start --only auth --project demo-mente
```

Precisa de Java no `PATH` (passo 1). As contas criadas ficam só na memória e somem ao fechar o terminal; crie uma conta nova no app a cada vez.

**Terminal B — backend (grupos e convites):**

```bash
cd server
npm start
```

Opcional: só a tela *Perfil → Grupos, pessoa de confiança e integrações* depende dele.

### 6. Rodar o app (Terminal C)

Com o emulador ligado:

```bash
cd android-api
adb reverse tcp:9099 tcp:9099   # deixa o app alcançar o Auth Emulator
npx expo run:android
```

Na **primeira vez**, o `run:android` gera a pasta `android/`, compila o app (cerca de 10 minutos), instala no emulador, inicia o Metro e abre o app. Pronto: crie uma conta em **Criar conta** e permita as notificações quando o Android pedir.

### Nas próximas vezes

O app já fica instalado no emulador. Com o emulador e os terminais A e B rodando:

```bash
cd android-api
adb reverse tcp:9099 tcp:9099   # repita sempre que o emulador reiniciar
npx expo start --dev-client     # depois aperte "a" para abrir no emulador
```

Só é preciso rodar `npx expo run:android` de novo depois de mudar o `app.json`, instalar um módulo nativo ou atualizar dependências.

### Problemas comuns

| Sintoma | Solução |
|---|---|
| Login fica carregando ou dá erro de rede | O Terminal A não está rodando, ou falta o `adb reverse tcp:9099 tcp:9099` (repita após reiniciar o emulador). |
| "Servidor não configurado" na tela de grupos | Falta `EXPO_PUBLIC_API_URL` no `.env.local`; reinicie o Metro depois de editar. |
| Grupos não carregam | O Terminal B não está rodando. |
| `SDK location not found` ou `adb: command not found` | `ANDROID_HOME`/`PATH` do passo 1. |
| Erro de versão do Java no build ou no Auth Emulator | Aponte `JAVA_HOME` para o `jbr` do Android Studio. |
| Erros de "module not found" | Rode `npm ci` em `android-api` de novo. |
| `No Android connected device found` | Ligue o emulador (passo 4) antes do `run:android`; confira com `adb devices`. |

## Variáveis de ambiente (`.env.local`)

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Login por e-mail e senha (Firebase Authentication). |
| `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | Opcional: usa o Auth Emulator local. |
| `EXPO_PUBLIC_API_URL` | Servidor de `../server` (grupos e convites). No emulador Android: `http://10.0.2.2:3000`. |
| `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` | Opcional: conexão com o Spotify (OAuth com PKCE). Cadastre o redirect `androidapi://spotify-auth` no app do Spotify. |

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
| `src/app/` | Apresentação | Telas (Expo Router). `(app)/` só abre logado, atrás do PIN e do descanso digital. |
| `src/components/mente/` | Apresentação | Componentes reutilizáveis (campos, gráficos, teclado do PIN, respiração, áudio). |
| `src/theme/` | Apresentação | Paletas (Sereno, Pastel, Neutro) × claro/escuro e `makeStyles`/`useColors`. |
| `src/data/insights.ts`, `assessments.ts`, `thoughts.ts`, `report.ts`, `phrases.ts` | Domínio | Regras puras: médias, correlações, metas, sugestões, testes, reestruturação cognitiva, relatório. |
| `src/data/types.ts`, `defaults.ts`, `repository*.ts`, `user-data-context.tsx` | Dados | Modelo (v2 + migração do v1), SQLite no Android / AsyncStorage na web, store com as ações. |
| `src/lib/` | Infra | Notificações, mídia, arquivos/PDF, localização, PIN, API, chat, Spotify, Health Connect. |

Equivalências com as bibliotecas citadas no backlog: `expo-image-picker` (react-native-image-picker), `expo-audio` (react-native-audio-recorder-player e react-native-sound), `expo-secure-store` (react-native-encrypted-storage), `expo-file-system` + `expo-sharing` (react-native-fs / react-native-share), `expo-print` (react-native-html-to-pdf), `expo-location` (react-native-geolocation-service), `expo-sqlite` (SQLite), `react-native-svg` (gráfico de radar), `Animated` (animações de respiração), WebSocket nativo do React Native (react-native-websocket). A API do Google Fit foi descontinuada em 2026; o sono de vestíveis vem do **Health Connect**, que a substitui.
