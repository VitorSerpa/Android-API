/**
 * Client-side checks for the auth forms. They only improve feedback — the
 * backend must validate the same rules on its own.
 */

export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Informe seu e-mail.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'E-mail inválido.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe sua senha.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return null;
}

export function validateName(name: string): string | null {
  if (name.trim().length < 2) return 'Informe seu nome.';
  return null;
}
