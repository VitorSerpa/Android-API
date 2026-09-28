import { useState } from 'react';

import { AuthError, useAuth } from '@/auth';
import { validateEmail, validateName, validatePassword } from '@/auth/validation';
import { AuthScreen } from '@/components/mente/auth-screen';
import { TextField } from '@/components/mente/text-field';

type Errors = {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
};

export default function SignUpScreen() {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm === password ? null : 'As senhas não coincidem.',
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password });
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : 'Não foi possível criar a conta. Tente novamente.',
      );
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      subtitle="Crie sua conta e comece a cuidar do seu bem-estar."
      submitLabel="Criar conta"
      onSubmit={submit}
      busy={busy}
      error={formError}
      footerText="Já tem uma conta?"
      footerLink="Entrar"
      footerHref="/sign-in">
      <TextField
        label="Nome"
        placeholder="Como podemos te chamar?"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <TextField
        label="E-mail"
        placeholder="seuemail@exemplo.com.br"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <TextField
        label="Senha"
        placeholder="Mínimo de 8 caracteres"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      <TextField
        label="Confirmar senha"
        placeholder="••••••••"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={confirm}
        onChangeText={setConfirm}
        onSubmitEditing={submit}
        error={errors.confirm}
      />
    </AuthScreen>
  );
}
