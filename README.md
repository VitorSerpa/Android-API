# Mente Equilibrada

Aplicativo Android de autocuidado emocional: check-in de humor, diário com fotos e áudios, saúde física, histórico com gráficos, respiração e meditação, modo de emergência, PIN e modo offline, relatório em PDF, metas e autoavaliações e personalização. Estão desativados no app por enquanto, com o código comentado: lembretes/medicamentos (alertas) e a tela *Pessoa de confiança e integrações* (grupos de apoio, convites, Spotify e sono do Health Connect) — ver `background-tasks.tsx`, `community.tsx`, Início e Perfil.

| Pasta | Conteúdo |
|---|---|
| [`android-api/`](android-api/README.md) | App (Expo SDK 57 / React Native). Organização do código e variáveis de ambiente no README da pasta. |
| [`server/`](server/README.md) | Backend Node.js: convites para pessoa de confiança e grupos de apoio em tempo real. **Hoje não é usado pelo app** (essas telas estão desativadas). |
| [`docs/`](docs/backlog_menteequilibrada_completo.pdf) | Backlog do produto em PDF. |

## Como rodar (emulador do Android Studio)

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

### 2. Clonar e instalar as dependências (uma vez)

Todos os comandos abaixo partem da raiz do repositório:

```bash
git clone https://github.com/VitorSerpa/Android-API.git
cd Android-API
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
```

`demo-key`/`demo-mente` não são credenciais reais: com `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` definido, o login fala só com o emulador local.

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

**Terminal B — backend (opcional, hoje sem uso):**

```bash
cd server
npm start
```

Não é preciso rodar: a tela de convites e integrações, única que usava o backend, está desativada no app. Se ela for reativada, defina também `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` no `.env.local` (`10.0.2.2` é o computador visto de dentro do emulador).

### 6. Rodar o app (Terminal C)

Com o emulador ligado:

```bash
cd android-api
adb reverse tcp:9099 tcp:9099   # deixa o app alcançar o Auth Emulator
npx expo run:android
```

Na **primeira vez**, o `run:android` gera a pasta `android/`, compila o app (cerca de 10 minutos), instala no emulador, inicia o Metro e abre o app. Pronto: crie uma conta em **Criar conta**.

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
| `SDK location not found` ou `adb: command not found` | `ANDROID_HOME`/`PATH` do passo 1. |
| Erro de versão do Java no build ou no Auth Emulator | Aponte `JAVA_HOME` para o `jbr` do Android Studio. |
| Erros de "module not found" | Rode `npm ci` em `android-api` de novo. |
| `No Android connected device found` | Ligue o emulador (passo 4) antes do `run:android`; confira com `adb devices`. |

## Backlog

Aluno: Vitor Serpa da Silva · Sprints 1, 2 e 3 · versão em PDF: [`docs/backlog_menteequilibrada_completo.pdf`](docs/backlog_menteequilibrada_completo.pdf). Clique em cada user story para ver os requisitos e os critérios de aceitação.

### Requisitos não funcionais

Valem para todo o produto. Cada user story indica quais RNF precisa atender.

| Código | Requisito |
|---|---|
| RNF-01 | O aplicativo deve ter tempo de carregamento inicial inferior a 3 segundos em dispositivos com 2 GB de RAM. |
| RNF-02 | O aplicativo deve ocupar menos de 30 MB de armazenamento interno, excluindo os dados do usuário. |
| RNF-03 | O código deve ser modularizado nas camadas de apresentação, domínio e dados (clean architecture). |
| RNF-04 | A interface deve seguir as diretrizes de acessibilidade do Android: área de toque mínima de 44 pontos e contraste de pelo menos 4.5:1. |
| RNF-05 | O aplicativo deve funcionar sem internet por até 14 dias, armazenando tudo localmente e sincronizando quando houver rede. |
| RNF-06 | O consumo de bateria deve ser inferior a 3% por hora em uso moderado, com GPS e microfone desligados fora de uso ativo. |
| RNF-07 | As operações de banco de dados devem ter taxa de falhas inferior a 1%, com tratamento de exceções em todas as consultas SQL. |
| RNF-08 | O código deve ser versionado no GitHub com commits semânticos e um arquivo CONTRIBUTING.md. |
| RNF-09 | O aplicativo deve ser compatível com Android 7.0 (API 24) ou superior. |
| RNF-10 | A documentação técnica deve incluir diagramas de arquitetura e fluxo de dados, descrição de cada módulo e guia de configuração do ambiente com Node.js e React Native. |

### Sprint 1

**Objetivo:** Funcionalidades principais do aplicativo.

<details>
<summary><b>US-01 — Check-in diário e resumo do dia</b></summary>

*Como usuário, quero registrar humor (escala de 5 níveis), ansiedade (0-10) e energia (1-5) em um check-in único, ser lembrado pela manhã e ver um resumo ao final do dia.*

**Requisitos funcionais**

- RF-01 — O sistema deve permitir registrar o humor em uma escala de cinco níveis, de muito triste a muito feliz, armazenando data e horário.
- RF-02 — O sistema deve permitir classificar a ansiedade de 0 a 10, com um campo opcional de observações.
- RF-03 — O sistema deve permitir registrar o nível de energia de 1 a 5 ao longo do dia, para análise de padrões circadianos.
- RF-04 — O sistema deve permitir definir lembretes diários de registro de humor em horários específicos (ao acordar, ao meio-dia e ao dormir).
- RF-05 — O sistema deve exibir, ao final do registro, um resumo do dia com o humor médio, as atividades feitas e uma frase de incentivo.

**Requisitos não funcionais:** RNF-01, RNF-04

**Critérios de aceitação**

- CA-01 — Dado que o usuário abre o check-in, quando informa humor, ansiedade e energia e confirma, então os três valores são salvos em um único registro com data e hora.
- CA-02 — O campo de observações da ansiedade é opcional e o registro é salvo mesmo vazio.
- CA-03 — Valores fora das escalas (humor 1-5, ansiedade 0-10, energia 1-5) não podem ser selecionados.
- CA-04 — Um lembrete configurado dispara a notificação no horário definido e, ao tocá-la, abre a tela de check-in.

> **Situação atual:** os lembretes estão desativados no app (ver US-04), então o CA-04 não está mais atendido.
- CA-05 — Após salvar, o resumo do dia é exibido com o humor médio recalculado e uma frase de incentivo.

</details>

<details>
<summary><b>US-02 — Diário emocional com multimídia</b></summary>

*Como usuário, quero escrever livremente sobre meus sentimentos com salvamento automático, registrar gratidão e sonhos, anexar fotos e áudios e usar um modo de escrita em tela cheia.*

**Requisitos funcionais**

- RF-06 — O sistema deve oferecer um diário de escrita livre com salvamento automático a cada 30 segundos durante a digitação.
- RF-07 — O sistema deve oferecer um diário de gratidão para o usuário escrever três coisas boas que aconteceram no dia.
- RF-08 — O sistema deve oferecer um diário de sonhos, com classificação da emoção associada.
- RF-09 — O sistema deve permitir associar fotos da câmera ou da galeria aos registros diários (react-native-image-picker).
- RF-10 — O sistema deve permitir gravar um áudio de até 30 segundos e anexá-lo ao registro diário (react-native-audio-recorder-player).
- RF-11 — O sistema deve oferecer um modo de escrita livre em tela cheia, sem interrupções e com fundo calmo.

**Requisitos não funcionais:** RNF-06, RNF-07

**Critérios de aceitação**

- CA-01 — Com o diário aberto, o texto é salvo automaticamente a cada 30 segundos, sem ação do usuário.
- CA-02 — Se o app for fechado durante a escrita, o texto salvo por último é recuperado ao reabrir.
- CA-03 — O diário de gratidão só é salvo com os três campos preenchidos.
- CA-04 — A gravação de áudio é interrompida automaticamente ao atingir 30 segundos e o microfone é liberado.
- CA-05 — Fotos e áudios anexados aparecem no registro do dia e podem ser removidos pelo usuário.

</details>

<details>
<summary><b>US-03 — Saúde física e correlação com humor</b></summary>

*Como usuário, quero registrar sintomas físicos, qualidade do sono, atividades diárias, peso e exercícios, e ver correlações automáticas entre esses dados e meu humor.*

**Requisitos funcionais**

- RF-12 — O sistema deve permitir cadastrar sintomas físicos (dor de cabeça, cansaço, tensão muscular) em uma lista de seleção múltipla.
- RF-13 — O sistema deve permitir registrar o sono com horas dormidas, número de despertares e avaliação subjetiva da qualidade.
- RF-14 — O sistema deve permitir registrar atividades do dia (exercício, meditação, leitura, interações sociais) associadas ao humor.
- RF-15 — O sistema deve permitir informar peso corporal e nível de atividade física diária em campos numéricos.
- RF-16 — O sistema deve sugerir correlações entre atividades e humor, como “nos dias em que você medita, seu humor tende a ser melhor”.

**Requisitos não funcionais:** RNF-07

**Critérios de aceitação**

- CA-01 — O usuário consegue selecionar mais de um sintoma no mesmo registro.
- CA-02 — Campos numéricos de sono, peso e atividade aceitam apenas valores válidos e positivos.
- CA-03 — Com pelo menos 7 dias de registros, o app exibe ao menos uma mensagem de correlação entre atividade e humor.
- CA-04 — Sem dados suficientes, o app informa que ainda não há correlações disponíveis.

</details>

<details>
<summary><b>US-04 — Lembretes, medicamentos e autocuidado</b></summary>

*Como usuário, quero definir horários de lembrete para humor, medicamentos, hidratação e alongamento, com confirmação de uso e um período noturno sem notificações.*

**Requisitos funcionais**

- RF-17 — O sistema deve permitir registrar medicamentos ou suplementos com horário e dosagem, para correlacionar com o estado emocional.
- RF-18 — O sistema deve enviar lembretes de medicação com notificação persistente até que o consumo seja confirmado.
- RF-19 — O sistema deve permitir configurar alarmes de hidratação, pausas ativas e alongamento.
- RF-20 — O sistema deve permitir definir um horário de silêncio noturno, durante o qual nenhuma notificação é enviada.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — A notificação de medicação permanece na barra de status até o usuário tocar em “tomei”, e a confirmação é gravada com horário.
- CA-02 — Cada tipo de lembrete pode ser ativado, editado e desativado separadamente.
- CA-03 — Nenhuma notificação é exibida dentro do horário de silêncio; lembretes desse período são adiados para o fim do silêncio.

> **Situação atual:** lembretes, alarmes e medicamentos (RF-17 a RF-20) foram retirados do app. As telas `reminders.tsx` e `medications.tsx` continuam no código, sem acesso, e o agendamento está comentado em `background-tasks.tsx`; ao abrir, o app apaga qualquer alerta deixado por versões anteriores.

</details>

<details>
<summary><b>US-05 — Visualização do histórico emocional</b></summary>

*Como usuário, quero ver gráficos de linha e de radar, médias semanal e mensal e um calendário mensal colorido por humor.*

**Requisitos funcionais**

- RF-21 — O sistema deve exibir um gráfico de linha com a variação do humor nos últimos 30 dias (react-native-chart-kit).
- RF-22 — O sistema deve exibir um gráfico de radar comparando humor, sono, ansiedade, estresse e atividade física.
- RF-23 — O sistema deve calcular e exibir as médias de humor semanal e mensal, comparando com os períodos anteriores.
- RF-24 — O sistema deve exibir um calendário mensal com cada dia colorido de acordo com o humor registrado (react-native-calendars).

**Requisitos não funcionais:** RNF-01, RNF-04

**Critérios de aceitação**

- CA-01 — O gráfico de linha mostra exatamente os últimos 30 dias, e dias sem registro aparecem como lacuna.
- CA-02 — As médias exibidas conferem com a média aritmética dos registros do período.
- CA-03 — Tocar em um dia do calendário abre os registros daquele dia.
- CA-04 — As cores do calendário possuem legenda e contraste mínimo de 4.5:1.

</details>

<details>
<summary><b>US-06 — Respiração, meditação e grounding</b></summary>

*Como usuário, quero acessar exercícios de respiração animados (incluindo a técnica 4-7-8), meditações guiadas com histórico e técnicas de grounding, com atalho de acesso rápido de qualquer tela.*

**Requisitos funcionais**

- RF-25 — O sistema deve oferecer exercícios de respiração com animações que indicam inspirar, segurar e expirar (react-native-lottie).
- RF-26 — O sistema deve exibir um cronômetro para a técnica 4-7-8 (inspirar 4 s, segurar 7 s, expirar 8 s).
- RF-27 — O sistema deve oferecer meditação guiada por áudio pré-carregado (react-native-sound).
- RF-28 — O sistema deve armazenar o histórico de sessões de meditação e respiração.
- RF-29 — O sistema deve oferecer técnicas de grounding com base nos cinco sentidos, com instruções interativas.
- RF-30 — O sistema deve oferecer um botão “respirar agora”, acessível de qualquer tela, que inicia uma mini-sessão de 60 segundos.

**Requisitos não funcionais:** RNF-04, RNF-06

**Critérios de aceitação**

- CA-01 — Na técnica 4-7-8, cada fase dura exatamente 4, 7 e 8 segundos, com a instrução visual correspondente.
- CA-02 — Cada sessão concluída é gravada no histórico com data, tipo e duração.
- CA-03 — O botão “respirar agora” aparece em todas as telas principais e inicia a sessão de 60 segundos com um toque.
- CA-04 — O grounding avança etapa por etapa pelos cinco sentidos até a conclusão.

</details>

<details>
<summary><b>US-07 — Modo de emergência e registro de crises</b></summary>

*Como usuário, quero ativar um modo de emergência com contatos de apoio e plano de ação, e registrar rapidamente picos de ansiedade com intensidade, gatilhos e localização opcional.*

**Requisitos funcionais**

- RF-31 — O sistema deve oferecer um modo de emergência, ativado com um único toque na tela principal, que exibe contatos de apoio e frases de conforto.
- RF-32 — O sistema deve permitir cadastrar um plano de ação para crises e exibi-lo quando o modo de emergência for ativado.
- RF-33 — O sistema deve oferecer um botão de registro rápido de pico de ansiedade, que salva data, hora e intensidade.
- RF-34 — O sistema deve perguntar sobre possíveis gatilhos de cada pico (situações, locais ou pensamentos) e armazená-los.
- RF-35 — O sistema deve registrar a localização do pico (react-native-geolocation-service) somente com autorização explícita do usuário.

**Requisitos não funcionais:** RNF-04, RNF-06

**Critérios de aceitação**

- CA-01 — O modo de emergência abre com um único toque a partir da tela inicial, mesmo sem internet.
- CA-02 — Tocar em um contato de apoio inicia a ligação ou a mensagem para aquele contato.
- CA-03 — O registro rápido de crise é salvo em no máximo dois toques.
- CA-04 — Se o usuário negar a permissão de localização, o registro é salvo normalmente sem esse dado.

</details>

<details>
<summary><b>US-08 — Privacidade, modo offline e exportação</b></summary>

*Como usuário, quero proteger o app com um PIN, usá-lo totalmente offline e exportar todos os meus dados em um arquivo JSON.*

**Requisitos funcionais**

- RF-36 — O sistema deve permitir configurar um PIN de segurança para proteger o diário e os dados pessoais, armazenado com react-native-encrypted-storage.
- RF-37 — O sistema deve oferecer um modo offline completo, em que os dados ficam apenas no aparelho, sem tentativa de sincronização.
- RF-38 — O sistema deve permitir exportar todos os dados em um único arquivo JSON (react-native-fs), para backup ou migração.

**Requisitos não funcionais:** RNF-05, RNF-07

**Critérios de aceitação**

- CA-01 — Com o PIN ativo, o diário e os dados pessoais só abrem após a digitação do PIN correto.
- CA-02 — O PIN nunca é gravado em texto puro no aparelho.
- CA-03 — Com o modo offline completo ativo, nenhuma requisição de rede é feita pelo app.
- CA-04 — O JSON exportado contém todos os tipos de registro e pode ser aberto em outro dispositivo.

</details>

<details>
<summary><b>US-09 — Reestruturação de pensamentos e afirmações</b></summary>

*Como usuário, quero registrar pensamentos automáticos negativos e receber sugestões alternativas, além de afirmações positivas e mensagens motivacionais configuráveis.*

**Requisitos funcionais**

- RF-39 — O sistema deve permitir registrar pensamentos negativos automáticos e sugerir pensamentos alternativos mais realistas (reestruturação cognitiva).
- RF-40 — O sistema deve exibir frases de afirmação positiva aleatórias em um card na tela inicial, com opção de salvar favoritas.
- RF-41 — O sistema deve permitir que o usuário cadastre e edite suas próprias afirmações e mensagens motivacionais.

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — Ao registrar um pensamento negativo, o app apresenta pelo menos uma sugestão de pensamento alternativo.
- CA-02 — Cada abertura da tela inicial pode mostrar uma afirmação diferente.
- CA-03 — Frases marcadas como favoritas aparecem na lista pessoal e podem ser removidas.

> **Situação atual:** o card de afirmação da tela inicial foi retirado. As afirmações aleatórias continuam na prática *Ferramentas → Afirmações*, com "Outra afirmação" e favoritas; RF-40 e o CA-02 (tela inicial) não estão mais atendidos como descritos.

</details>

<details>
<summary><b>US-10 — Relatório em PDF e compartilhamento</b></summary>

*Como usuário, quero gerar um relatório semanal em PDF e compartilhá-lo por e-mail ou mensagem.*

**Requisitos funcionais**

- RF-42 — O sistema deve gerar um relatório semanal em PDF com resumo de humor, sono, ansiedade e atividades (react-native-html-to-pdf).
- RF-43 — O sistema deve permitir compartilhar o relatório por e-mail ou aplicativos de mensagem (react-native-share).

**Requisitos não funcionais:** RNF-09

**Critérios de aceitação**

- CA-01 — O PDF gerado contém os dados dos últimos 7 dias, com o período indicado no cabeçalho.
- CA-02 — O botão compartilhar abre o seletor nativo do Android com o PDF anexado.
- CA-03 — Em uma semana sem registros, o app avisa que não há dados em vez de gerar um PDF vazio.

</details>

<details>
<summary><b>US-11 — Metas, sugestões e autoavaliações</b></summary>

*Como usuário, quero definir metas de bem-estar, receber e avaliar sugestões de atividades conforme meu humor, e responder a testes de estresse, bem-estar geral (WHO-5) e resiliência.*

**Requisitos funcionais**

- RF-44 — O sistema deve permitir criar metas de bem-estar (ex.: “meditar 10 minutos por dia”) e acompanhar o progresso diário.
- RF-45 — O sistema deve sugerir atividades com base no humor atual (ex.: “você está ansioso, que tal uma meditação de 5 minutos?”).
- RF-46 — O sistema deve permitir avaliar a utilidade de cada exercício ou técnica sugerida com um sistema de estrelas.
- RF-47 — O sistema deve oferecer um teste rápido de estresse com cinco questões e salvar a pontuação no histórico.
- RF-48 — O sistema deve oferecer o teste de bem-estar WHO-5, com cinco perguntas, e acompanhar a pontuação ao longo do tempo.
- RF-49 — O sistema deve oferecer um teste de resiliência baseado na escala de Connor-Davidson adaptada, com 10 questões e pontuação interpretativa.

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — O progresso de cada meta é atualizado no mesmo dia em que a atividade é registrada.
- CA-02 — A sugestão exibida muda de acordo com o humor informado no último check-in.
- CA-03 — Cada teste só calcula a pontuação após todas as perguntas serem respondidas.
- CA-04 — As pontuações dos testes ficam no histórico com data e podem ser comparadas.

</details>

<details>
<summary><b>US-12 — Personalização, perfis de vida e descanso digital</b></summary>

*Como usuário, quero escolher paletas de cores e modo escuro automático, organizar registros por perfis (trabalho, família, lazer) e ativar períodos de descanso digital.*

**Requisitos funcionais**

- RF-50 — O sistema deve permitir escolher entre paletas de cores predefinidas, como tons pastel ou tons neutros.
- RF-51 — O sistema deve ter modo escuro com ativação automática no período noturno, usando as preferências de sistema do React Native.
- RF-52 — O sistema deve permitir criar perfis de contexto de vida (trabalho, família, lazer) e associar registros de humor a cada perfil.
- RF-53 — O sistema deve permitir definir um período de descanso digital, em que o app bloqueia as demais funções e exibe apenas a tela de respiração.

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — A paleta escolhida é aplicada imediatamente em todas as telas e mantida após reiniciar o app.
- CA-02 — O modo escuro liga e desliga sozinho no horário noturno definido.
- CA-03 — Durante o descanso digital, somente a tela de respiração fica acessível.

> **Situação atual:** o descanso digital (RF-53 / CA-03) está desativado no app — a opção saiu das Configurações e o `DigitalRestGate` está comentado em `android-api/src/app/(app)/_layout.tsx`.

</details>

<details>
<summary><b>US-13 — Comunidade e integrações externas</b></summary>

*Como usuário, quero participar de grupos de apoio anônimos, convidar alguém de confiança para acompanhar meu progresso e sincronizar meus dados com Spotify e Google Fit.*

**Requisitos funcionais**

- RF-54 — O sistema deve permitir a criação de grupos de suporte virtuais com mensagens anônimas em tempo real (WebSockets no Node.js e react-native-websocket).
- RF-55 — O sistema deve permitir convidar um amigo ou familiar como “apoio” por link, que passa a receber um resumo semanal anônimo.
- RF-56 — O sistema deve permitir conectar a conta do Spotify ao aplicativo.
- RF-57 — O sistema deve permitir sincronizar as horas de sono com um dispositivo vestível pela API do Google Fit.

**Requisitos não funcionais:** RNF-05

**Critérios de aceitação**

- CA-01 — As mensagens do grupo chegam aos demais membros em tempo real, sem mostrar nome ou dados do autor.
- CA-02 — O link de convite pode ser enviado por aplicativos de mensagem e o convite pode ser revogado.
- CA-03 — Após autorizar o Google Fit, as horas de sono importadas aparecem nos registros de sono.

> **Situação atual:** toda a US-13 está desativada no app. A tela *Pessoa de confiança e integrações* (`android-api/src/app/(app)/community.tsx`: grupos, convites, Spotify e sono do Health Connect) não tem mais acesso, e o envio do resumo semanal e a importação de sono estão comentados em `background-tasks.tsx`. O backend continua em `server/`.

</details>

### Sprint 2

**Objetivo:** Aprofundar os registros e as análises, garantir a sincronização dos dados e completar as ferramentas de cuidado imediato.

<details>
<summary><b>US-14 — Sincronização com o servidor e restauração de sessão</b></summary>

*Como usuário, quero que meus dados salvos localmente sejam sincronizados automaticamente com o servidor quando houver internet, mesmo após até 14 dias offline, e que o app reabra exatamente na tela e na posição em que parei.*

**Requisitos funcionais**

- RF-58 — O sistema deve sincronizar automaticamente os dados do SQLite com o servidor Node.js sempre que houver conexão (exceto no modo offline completo).
- RF-59 — O sistema deve salvar o estado de cada tela ao fechar o aplicativo e restaurar a posição exata quando o usuário retornar.

**Requisitos não funcionais:** RNF-05, RNF-07

**Critérios de aceitação**

- CA-01 — Registros feitos sem internet são enviados ao servidor quando a conexão volta, sem duplicar dados.
- CA-02 — Registros de até 14 dias offline são sincronizados corretamente.
- CA-03 — Ao reabrir o app, o usuário volta à mesma tela e posição de rolagem em que estava.

</details>

<details>
<summary><b>US-15 — Transcrição de áudio e notas de conquistas</b></summary>

*Como usuário, quero que os áudios de até 30 segundos do meu diário sejam transcritos automaticamente para texto e poder gravar notas de voz curtas sobre as pequenas vitórias do meu dia.*

**Requisitos funcionais**

- RF-60 — O sistema deve transcrever automaticamente os áudios gravados para texto (react-native-voice).
- RF-61 — O sistema deve permitir gravar notas de voz curtas como lembretes de conquistas diárias.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — Após a gravação, o texto transcrito aparece junto ao áudio e pode ser editado.
- CA-02 — Se a transcrição falhar, o áudio continua salvo e o usuário é avisado.
- CA-03 — As notas de conquistas ficam listadas por data e podem ser reproduzidas.

</details>

<details>
<summary><b>US-16 — Linha do tempo do dia e nuvem de palavras</b></summary>

*Como usuário, quero ver uma linha do tempo interativa com todos os eventos registrados no dia, como humor, atividades e sintomas, e uma nuvem com as palavras que mais escrevo no diário, para identificar padrões.*

**Requisitos funcionais**

- RF-62 — O sistema deve exibir uma linha do tempo interativa com todos os eventos do dia (humor, atividades e sintomas) em ordem cronológica.
- RF-63 — O sistema deve gerar uma nuvem de palavras com os termos mais frequentes do diário emocional (react-native-word-cloud).

**Requisitos não funcionais:** RNF-01

**Critérios de aceitação**

- CA-01 — Os eventos aparecem ordenados por horário e tocar em um deles abre o registro completo.
- CA-02 — A nuvem de palavras ignora palavras comuns (artigos, preposições) e o tamanho de cada palavra é proporcional à frequência.

</details>

<details>
<summary><b>US-17 — Análises comparativas de sono e perfis</b></summary>

*Como usuário, quero ver um gráfico de dispersão entre minhas horas de sono e o humor do dia seguinte e acompanhar a evolução do humor separadamente em cada perfil de vida, comparando quais áreas estão mais equilibradas.*

**Requisitos funcionais**

- RF-64 — O sistema deve exibir um gráfico de dispersão relacionando as horas de sono com o humor do dia seguinte.
- RF-65 — O sistema deve permitir visualizar a evolução do humor separadamente para cada perfil de vida.

**Requisitos não funcionais:** RNF-01, RNF-04

**Critérios de aceitação**

- CA-01 — Cada ponto do gráfico corresponde a um par (horas de sono da noite, humor do dia seguinte).
- CA-02 — O usuário pode alternar entre perfis e comparar as curvas de humor de cada um.

</details>

<details>
<summary><b>US-18 — Sessões de respiração e meditação personalizadas</b></summary>

*Como usuário, quero escolher a duração dos exercícios de respiração (1, 3 ou 5 minutos) e ter essa preferência salva, ver um contador regressivo com sinal sonoro suave ao final da meditação, saber quantas sessões completei na semana e salvar minhas técnicas favoritas em uma lista de atalhos.*

**Requisitos funcionais**

- RF-66 — O sistema deve permitir escolher a duração dos exercícios de respiração entre 1, 3 ou 5 minutos e salvar a preferência.
- RF-67 — O sistema deve exibir um contador regressivo durante a meditação, com um sinal sonoro suave ao final.
- RF-68 — O sistema deve mostrar quantas sessões de meditação e respiração o usuário completou na semana.
- RF-69 — O sistema deve permitir salvar técnicas de relaxamento favoritas em uma lista de atalhos.

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — A duração escolhida é usada como padrão nas próximas sessões.
- CA-02 — O sinal sonoro toca apenas quando o contador chega a zero.
- CA-03 — O total semanal de sessões é reiniciado toda segunda-feira.

</details>

<details>
<summary><b>US-19 — Check-in ao desbloquear e objetivo de humor semanal</b></summary>

*Como usuário, quero que o app pergunte como estou me sentindo ao desbloquear o telefone pela primeira vez pela manhã e poder definir um humor mínimo para a semana, acompanhando se esse objetivo está sendo alcançado.*

**Requisitos funcionais**

- RF-70 — O sistema deve, se o usuário ativar a opção, perguntar como ele está ao desbloquear o telefone pela primeira vez pela manhã.
- RF-71 — O sistema deve permitir definir um objetivo de humor mínimo para a semana e monitorar se ele está sendo alcançado.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — A pergunta aparece apenas no primeiro desbloqueio da manhã, uma vez por dia.
- CA-02 — O app mostra durante a semana se a média de humor está acima ou abaixo do objetivo definido.

</details>

<details>
<summary><b>US-20 — Controle de localização e distração em crises</b></summary>

*Como usuário, quero desativar o rastreamento de localização a qualquer momento nas configurações e ter um jogo de associação de palavras por categoria para me distrair em momentos de ansiedade.*

**Requisitos funcionais**

- RF-72 — O sistema deve permitir desativar o rastreamento de localização a qualquer momento nas configurações.
- RF-73 — O sistema deve oferecer um jogo de associação de palavras por categoria para distração em momentos de ansiedade.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — Com a localização desativada, nenhum registro novo salva coordenadas e o GPS não é acionado.
- CA-02 — O jogo pode ser aberto a partir do modo de emergência e funciona sem internet.

</details>

<details>
<summary><b>US-21 — Confiabilidade dos dados</b></summary>

*Como usuário, quero que meus registros nunca se percam nem corrompam, com tratamento de erros em todas as operações do banco de dados e taxa de falhas inferior a 1%.*

**Requisitos funcionais**

- RF-74 — O sistema deve gravar os registros em transações, desfazendo alterações parciais e avisando o usuário quando uma operação falhar.

**Requisitos não funcionais:** RNF-03, RNF-07

**Critérios de aceitação**

- CA-01 — Todas as consultas SQL possuem tratamento de exceção e registram o erro.
- CA-02 — Uma falha durante a gravação não deixa registros incompletos no banco.
- CA-03 — Em testes de carga, menos de 1% das operações de banco falham.

</details>

### Sprint 3

**Objetivo:** Aumentar o engajamento com resumos, incentivos e conteúdos, e preparar o aplicativo para entrega com desempenho, acessibilidade e documentação.

<details>
<summary><b>US-22 — Resumo semanal de progresso e carta mensal</b></summary>

*Como usuário, quero receber um alerta semanal destacando minhas melhorias em relação à semana anterior e um resumo mensal em formato de carta com os altos e baixos do mês, podendo salvá-lo como imagem.*

**Requisitos funcionais**

- RF-75 — O sistema deve exibir um alerta semanal com resumo de progresso, destacando melhorias em relação à semana anterior.
- RF-76 — O sistema deve gerar um resumo mensal em formato de carta, com os altos e baixos do mês, e opção de salvar como imagem.

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — O alerta semanal compara os indicadores da semana atual com os da semana anterior.
- CA-02 — A carta mensal pode ser salva como imagem na galeria do aparelho.

</details>

<details>
<summary><b>US-23 — Mensagens de incentivo e afirmações ao longo do dia</b></summary>

*Como usuário, quero receber notificações com mensagens motivacionais em horários aleatórios e afirmações positivas a cada hora, sempre respeitando o meu horário de silêncio noturno.*

**Requisitos funcionais**

- RF-77 — O sistema deve enviar notificações de incentivo com mensagens motivacionais em horários aleatórios.
- RF-78 — O sistema deve permitir configurar afirmações para serem exibidas a cada hora como lembretes positivos.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — As notificações aleatórias e horárias podem ser ligadas e desligadas separadamente.
- CA-02 — Nenhuma notificação de incentivo é enviada durante o horário de silêncio noturno.

</details>

<details>
<summary><b>US-24 — Incentivo anônimo entre membros do grupo</b></summary>

*Como usuário, quero enviar uma mensagem de incentivo anônima para outro membro do meu grupo de apoio e ver as mensagens que recebo como cards motivacionais no meu painel.*

**Requisitos funcionais**

- RF-79 — O sistema deve permitir enviar uma mensagem de incentivo anônima para outro usuário do grupo, exibida como card motivacional no painel do destinatário.

**Requisitos não funcionais:** RNF-05

**Critérios de aceitação**

- CA-01 — O destinatário vê o card sem nenhuma informação que identifique o remetente.
- CA-02 — Mensagens enviadas sem internet são entregues quando a conexão volta.

</details>

<details>
<summary><b>US-25 — Playlists relaxantes e conteúdos de saúde mental</b></summary>

*Como usuário, quero montar uma lista de músicas ou playlists relaxantes que toquem com um único toque e receber sugestões de podcasts e leituras sobre saúde mental de acordo com as minhas preferências.*

**Requisitos funcionais**

- RF-80 — O sistema deve permitir criar uma lista de músicas ou playlists relaxantes e iniciar a reprodução com um toque (react-native-track-player).
- RF-81 — O sistema deve sugerir leituras ou podcasts sobre saúde mental com base nas preferências do usuário, usando a API do Spotify.

**Requisitos não funcionais:** RNF-06

**Critérios de aceitação**

- CA-01 — Tocar em uma playlist inicia a reprodução, que continua com o app em segundo plano.
- CA-02 — As sugestões de podcasts mudam quando o usuário altera suas preferências.

</details>

<details>
<summary><b>US-26 — Recomendações refinadas e tempo de uso</b></summary>

*Como usuário, quero que as avaliações com estrelas que dou a cada exercício ou técnica refinem as recomendações futuras, e quero acompanhar quanto tempo passo no app em cada sessão para evitar uso excessivo.*

**Requisitos funcionais**

- RF-82 — O sistema deve usar as avaliações com estrelas para priorizar as técnicas mais bem avaliadas nas recomendações futuras.
- RF-83 — O sistema deve registrar a duração de cada sessão de uso do aplicativo e exibi-la ao usuário.

**Requisitos não funcionais:** RNF-03

**Critérios de aceitação**

- CA-01 — Técnicas com avaliação mais alta aparecem primeiro nas sugestões.
- CA-02 — A tela de uso mostra a duração de cada sessão e o total do dia.

</details>

<details>
<summary><b>US-27 — Desempenho, bateria e compatibilidade</b></summary>

*Como usuário, quero que o app abra em menos de 3 segundos em aparelhos com 2 GB de RAM, ocupe menos de 30 MB, consuma menos de 3% de bateria por hora (com GPS e microfone desligados quando não estiverem em uso) e funcione a partir do Android 7.0.*

**Requisitos não funcionais:** RNF-01, RNF-02, RNF-06, RNF-09

**Critérios de aceitação**

- CA-01 — O carregamento inicial medido em um aparelho de 2 GB de RAM é inferior a 3 segundos.
- CA-02 — O tamanho do app instalado, sem dados do usuário, é inferior a 30 MB.
- CA-03 — Em uma hora de uso moderado, o consumo de bateria é inferior a 3%.
- CA-04 — O app instala e executa todas as funções em um aparelho ou emulador com Android 7.0 (API 24).

</details>

<details>
<summary><b>US-28 — Acessibilidade da interface</b></summary>

*Como usuário, quero uma interface acessível, com áreas de toque de no mínimo 44 pontos e contraste de cores de pelo menos 4.5:1 em todas as telas e paletas.*

**Requisitos não funcionais:** RNF-04

**Critérios de aceitação**

- CA-01 — Todos os botões e controles têm área de toque de no mínimo 44 pontos.
- CA-02 — Todas as combinações de texto e fundo, em todas as paletas e no modo escuro, têm contraste de pelo menos 4.5:1.
- CA-03 — Os elementos interativos possuem rótulos lidos corretamente pelo leitor de tela TalkBack.

</details>

<details>
<summary><b>US-29 — Documentação e padrões do projeto</b></summary>

*Como desenvolvedor, quero o código organizado em clean architecture (apresentação, domínio e dados), versionado no GitHub com commits semânticos e CONTRIBUTING.md, e uma documentação com diagramas de arquitetura e fluxo de dados, descrição de cada módulo e guia de configuração do ambiente com Node.js e React Native.*

**Requisitos não funcionais:** RNF-03, RNF-08, RNF-10

**Critérios de aceitação**

- CA-01 — O código está separado nas camadas de apresentação, domínio e dados.
- CA-02 — O repositório tem CONTRIBUTING.md e o histórico usa commits semânticos.
- CA-03 — A documentação contém diagramas de arquitetura e de fluxo de dados, a descrição de cada módulo e o guia de configuração do ambiente.
- CA-04 — Um novo integrante consegue rodar o projeto seguindo apenas o guia.

</details>
