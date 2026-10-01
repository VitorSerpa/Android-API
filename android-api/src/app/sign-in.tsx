import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthError, useAuth } from '@/auth';
import { validateEmail } from '@/auth/validation';
import { AuthScreen } from '@/components/mente/auth-screen';
import { TextField } from '@/components/mente/text-field';
import { MenteType } from '@/constants/mente-theme';
import { notify } from '@/lib/dialogs';
import { makeStyles } from '@/theme';

export default function SignInScreen() {
  const styles = useStyles();
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const forgotPassword = async () => {
    const emailError = validateEmail(email);
    setErrors({ email: emailError && 'Informe seu e-mail para redefinir a senha.' });
    setFormError(null);
    if (emailError) return;

    setResetting(true);
    try {
      await resetPassword(email.trim());
      // Same answer whether or not the account exists, so the form can't be
      // used to find out who has one.
      notify(
        'Verifique seu e-mail',
        `Se houver uma conta para ${email.trim()}, enviamos um link para redefinir a senha.`,
      );
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : 'Não foi possível enviar o e-mail. Tente novamente.',
      );
    } finally {
      setResetting(false);
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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: resetting }}
        disabled={resetting}
        hitSlop={8}
        onPress={forgotPassword}
        style={styles.forgot}>
        <Text style={styles.forgotText}>{resetting ? 'Enviando…' : 'Esqueci minha senha'}</Text>
      </Pressable>
    </AuthScreen>
  );
}

const useStyles = makeStyles((c) => ({
  forgot: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
}));
