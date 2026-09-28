import { useState } from 'react';

import { AuthError, useAuth } from '@/auth';
import { validateEmail } from '@/auth/validation';
import { AuthScreen } from '@/components/mente/auth-screen';
import { TextField } from '@/components/mente/text-field';

export default function SignInScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = { email: validateEmail(email), password: password ? null : 'Informe sua senha.' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      // On success the auth gate in the root layout moves us to /home.
      await signIn({ email: email.trim(), password });
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : 'Não foi possível entrar. Tente novamente.',
      );
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      subtitle="Respire fundo e recupere o seu bem-estar diário."
      submitLabel="Entrar"
      onSubmit={submit}
      busy={busy}
      error={formError}
      footerText="Não tem uma conta?"
      footerLink="Criar conta"
      footerHref="/sign-up">
      <TextField
        label="E-mail"
        placeholder="seuemail@exemplo.com.br"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        textContentType="emailAddress"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <TextField
        label="Senha"
        placeholder="••••••••"
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        error={errors.password}
      />
    </AuthScreen>
  );
}
