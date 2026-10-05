import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useAuth } from '@/auth';
import { PinPad } from '@/components/mente/pin-pad';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, TopBar } from '@/components/mente/ui';
import { MenteType } from '@/constants/mente-theme';
import { notify } from '@/lib/dialogs';
import { clearPin, hasPin, PIN_LENGTH, pinErrorMessage, setPin, verifyPin } from '@/lib/pin';
import { makeStyles } from '@/theme';

type Step = 'loading' | 'menu' | 'verify-change' | 'verify-remove' | 'new' | 'confirm';

/** RF-36: create, change or remove the PIN. Changing or removing asks for the current one first. */
export default function PinScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>('loading');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasPin(userId).then(
      (value) => {
        setEnabled(value);
        setStep(value ? 'menu' : 'new');
      },
      // SecureStore failed: assume a PIN exists, so it can only be changed after verifying it.
      () => {
        setEnabled(true);
        setStep('menu');
      },
    );
  }, [userId]);

  const verify = async (pin: string, next: () => Promise<void> | void) => {
    setBusy(true);
    const result = await verifyPin(userId, pin);
    setBusy(false);
    if (!result.ok) {
      setError(pinErrorMessage(result.retryInSec));
      return;
    }
    setError(null);
    await next();
  };

  const submit = async (pin: string) => {
    if (step === 'verify-change') return verify(pin, () => setStep('new'));
    if (step === 'verify-remove') {
      return verify(pin, async () => {
        await clearPin(userId);
        notify('PIN removido', 'O app abre sem pedir PIN.');
        router.back();
      });
    }
    if (step === 'new') {
      setFirst(pin);
      setError(null);
      setStep('confirm');
      return;
    }
    if (step === 'confirm') {
      if (pin !== first) {
        setError('Os PINs não conferem. Digite o novo PIN novamente.');
        setStep('new');
        return;
      }
      setBusy(true);
      try {
        await setPin(userId, pin);
        notify('PIN ativado', 'Seu diário e seus dados só abrem com o PIN.');
        router.back();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o PIN.');
      } finally {
        setBusy(false);
      }
    }
  };

  const titles: Record<Exclude<Step, 'loading' | 'menu'>, string> = {
    'verify-change': 'Digite o PIN atual',
    'verify-remove': 'Digite o PIN para removê-lo',
    new: enabled ? 'Digite o novo PIN' : 'Crie um PIN',
    confirm: 'Confirme o PIN',
  };

  return (
    <StackScreen>
      <TopBar title="PIN de segurança" />
      {step === 'loading' ? null : step === 'menu' ? (
        <Card style={styles.card}>
          <Text style={styles.title}>O PIN está ativo</Text>
          <Text style={styles.detail}>
            Ele é pedido ao abrir o app e ao voltar depois de 1 minuto fora. Só um resumo criptográfico (hash) fica guardado, no armazenamento
            seguro do Android — nunca o PIN em si.
          </Text>
          <Button label="Trocar PIN" onPress={() => setStep('verify-change')} />
          <Button label="Remover PIN" variant="secondary" onPress={() => setStep('verify-remove')} />
        </Card>
      ) : (
        <>
          <PinPad
            key={step}
            title={titles[step]}
            subtitle={step === 'new' ? `De ${PIN_LENGTH.min} a ${PIN_LENGTH.max} números. Toque em OK para confirmar.` : undefined}
            error={error}
            busy={busy}
            onSubmit={submit}
          />
        </>
      )}
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    gap: 12,
  },
  title: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  detail: {
    ...MenteType.body,
    color: c.textMuted,
  },
}));
