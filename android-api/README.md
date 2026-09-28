# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Login (Firebase Authentication)

O login usa e-mail e senha do [Firebase Authentication](https://firebase.google.com/docs/auth) via Firebase JS SDK (Android, iOS e web).

1. No [Console do Firebase](https://console.firebase.google.com), crie um projeto e adicione um **app Web**.
2. Em **Authentication → Método de login**, ative **E-mail/senha**.
3. Copie `.env.example` para `.env.local` e preencha com a configuração do app Web.
4. Reinicie o Metro (`npx expo start`) — variáveis `EXPO_PUBLIC_*` são lidas na inicialização.

Para desenvolver sem um projeto real, use o emulador local:

```bash
npx firebase-tools emulators:start --only auth --project demo-mente
adb reverse tcp:9099 tcp:9099   # só para o emulador Android
```

e em `.env.local` use `EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-mente`, qualquer `EXPO_PUBLIC_FIREBASE_API_KEY` e `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. A interface do emulador (http://127.0.0.1:4000) mostra as contas criadas e os links de redefinição de senha.

Toda a autenticação passa por `src/auth/service.ts`; as telas só conhecem a interface `AuthService`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
