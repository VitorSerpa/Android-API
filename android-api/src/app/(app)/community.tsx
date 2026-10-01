import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { importSleep } from '@/components/mente/background-tasks';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Chevron, Input, MIN_TOUCH, SectionEyebrow, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { createSupporterInvite, revokeSupporterInvite } from '@/data/community';
import type { SupporterInvite } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { apiConfigured, createGroup, listGroups, type Group } from '@/lib/api';
import { formatShortDate } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialogs';
import { loadChatCache, type JoinedGroup } from '@/lib/group-chat';
import { connectHealthConnect, healthConnectAvailability, openHealthConnectSettings, type Availability } from '@/lib/health-connect';
import { shareText } from '@/lib/share';
import { completeSpotifyLogin, disconnectSpotify, spotifyConfigured, spotifyRedirectUri, useSpotifyAuthRequest } from '@/lib/spotify';
import { makeStyles } from '@/theme';

export default function CommunityScreen() {
  const styles = useStyles();
  const { data } = useUserData();
  const offline = data.settings.offlineMode;

  return (
    <StackScreen>
      <TopBar title="Apoio e integrações" />
      {offline ? (
        <Card style={styles.warning}>
          <Text style={styles.warningText}>
            O modo offline completo está ativo, então nada aqui usa a internet. Desative-o em Configurações para participar de grupos, enviar
            resumos e conectar integrações.
          </Text>
        </Card>
      ) : !apiConfigured ? (
        <Card style={styles.warning}>
          <Text style={styles.warningText}>
            Servidor não configurado. Defina EXPO_PUBLIC_API_URL (veja o README) para usar grupos e convites.
          </Text>
        </Card>
      ) : null}
      <GroupsCard disabled={offline || !apiConfigured} />
      <InvitesCard disabled={offline || !apiConfigured} />
      <SpotifyCard disabled={offline} />
      <HealthConnectCard disabled={offline} />
    </StackScreen>
  );
}

/* RF-54 --------------------------------------------------------------- */

function GroupsCard({ disabled }: { disabled: boolean }) {
  const styles = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [joined, setJoined] = useState<JoinedGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) loadChatCache(user.id).then((cache) => setJoined(cache.joined));
    }, [user]),
  );

  useEffect(() => {
    if (disabled) return;
    listGroups().then(
      (list) => {
        setGroups(list);
        setError(null);
      },
      (reason) => setError(reason instanceof Error ? reason.message : 'Sem conexão.'),
    );
  }, [disabled]);

  const open = (group: { id: string; name: string }) => router.push({ pathname: '/group/[id]', params: { id: group.id, name: group.name } });

  const create = async () => {
    try {
      const group = await createGroup(name.trim(), description.trim());
      setGroups((current) => [...(current ?? []), group]);
      setName('');
      setDescription('');
      setCreating(false);
      open(group);
    } catch (reason) {
      notify('Não foi possível criar o grupo', reason instanceof Error ? reason.message : undefined);
    }
  };

  const others = (groups ?? []).filter((group) => !joined.some((item) => item.id === group.id));

  return (
    <Card style={styles.card}>
      <SectionEyebrow>GRUPOS DE APOIO ANÔNIMOS</SectionEyebrow>
      <Text style={styles.detail}>As mensagens chegam em tempo real e nunca mostram seu nome, e-mail ou qualquer dado seu.</Text>

      {joined.map((group) => (
        <GroupRow key={group.id} title={group.name} subtitle="Você participa · conversa salva no aparelho" onPress={() => open(group)} />
      ))}
      {disabled ? null : groups === null && !error ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={styles.detail}>{error}</Text>
      ) : (
        others.map((group) => (
          <GroupRow key={group.id} title={group.name} subtitle={`${group.description || 'Grupo de apoio'} · ${group.online} online`} onPress={() => open(group)} />
        ))
      )}

      {!disabled ? (
        creating ? (
          <View style={styles.editor}>
            <Input accessibilityLabel="Nome do grupo" placeholder="Nome do grupo (3 a 60 letras)" value={name} onChangeText={setName} />
            <Input accessibilityLabel="Descrição" placeholder="Sobre o que é o grupo? (opcional)" value={description} onChangeText={setDescription} />
            <Button label="Criar grupo" onPress={create} disabled={name.trim().length < 3} />
            <Button label="Cancelar" variant="secondary" onPress={() => setCreating(false)} />
          </View>
        ) : (
          <Button label="Criar um grupo" variant="secondary" onPress={() => setCreating(true)} />
        )
      ) : null}
    </Card>
  );
}

function GroupRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{subtitle}</Text>
      </View>
      <Chevron />
    </Pressable>
  );
}

/* RF-55 --------------------------------------------------------------- */

function InvitesCard({ disabled }: { disabled: boolean }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const share = (invite: SupporterInvite) =>
    shareText(
      'Convite — Mente Equilibrada',
      `Oi! Estou cuidando do meu bem-estar e queria você por perto. Por este link você vê um resumo semanal anônimo de como estou: ${invite.url}`,
    );

  const invite = async () => {
    setBusy(true);
    try {
      const created = await createSupporterInvite(label, data, actions);
      setLabel('');
      await share(created);
    } catch (reason) {
      notify('Não foi possível criar o convite', reason instanceof Error ? reason.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (item: SupporterInvite) => {
    if (!(await confirm('Revogar convite', `${item.label} deixa de ver seus resumos e o link para de funcionar.`, 'Revogar'))) return;
    try {
      await revokeSupporterInvite(item, actions);
    } catch (reason) {
      notify('Não foi possível revogar agora', reason instanceof Error ? `${reason.message} Tente de novo quando estiver online.` : undefined);
    }
  };

  return (
    <Card style={styles.card}>
      <SectionEyebrow>PESSOA DE CONFIANÇA</SectionEyebrow>
      <Text style={styles.detail}>
        Convide um amigo ou familiar por link. Toda semana ele recebe um resumo anônimo (humor, ansiedade, sono e práticas) — sem seu nome e sem o
        conteúdo do diário.
      </Text>
      {data.invites.map((item) => (
        <View key={item.token} style={styles.inviteRow}>
          <View style={styles.flex}>
            <Text style={styles.title}>{item.label}</Text>
            <Text style={styles.detail}>
              Desde {formatShortDate(new Date(item.createdAt))}
              {item.lastSentWeek ? ` · último resumo na semana de ${formatShortDate(new Date(`${item.lastSentWeek}T12:00:00`))}` : ' · resumo pendente'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Compartilhar link de ${item.label}`} onPress={() => share(item)} style={styles.action}>
            <Text style={styles.link}>Enviar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Revogar convite de ${item.label}`} onPress={() => revoke(item)} disabled={disabled} style={styles.action}>
            <Text style={styles.danger}>Revogar</Text>
          </Pressable>
        </View>
      ))}
      {!disabled ? (
        <>
          <Input accessibilityLabel="Nome de quem vai receber" placeholder="Para quem? (ex.: Ana, irmã)" value={label} onChangeText={setLabel} />
          <Button label={busy ? 'Criando…' : 'Criar convite e enviar'} onPress={invite} disabled={busy} />
        </>
      ) : null}
    </Card>
  );
}

/* RF-56 --------------------------------------------------------------- */

function SpotifyCard({ disabled }: { disabled: boolean }) {
  const styles = useStyles();
  const { user } = useAuth();
  const { data, actions } = useUserData();
  const [request, response, promptAsync] = useSpotifyAuthRequest();
  const connected = data.integrations.spotify;

  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier || !user) return;
    completeSpotifyLogin(user.id, response.params.code, request.codeVerifier).then(
      (displayName) => actions.setIntegration('spotify', { displayName, connectedAt: new Date().toISOString() }),
      (error) => notify('Não foi possível conectar ao Spotify', error instanceof Error ? error.message : undefined),
    );
  }, [response, request, user, actions]);

  const disconnect = async () => {
    if (!user || !(await confirm('Desconectar Spotify', 'O app deixa de acessar sua conta do Spotify.', 'Desconectar'))) return;
    await disconnectSpotify(user.id);
    actions.setIntegration('spotify', null);
  };

  return (
    <Card style={styles.card}>
      <SectionEyebrow>SPOTIFY</SectionEyebrow>
      {connected ? (
        <>
          <Text style={styles.title}>Conectado como {connected.displayName}</Text>
          <Button label="Desconectar" variant="secondary" onPress={disconnect} />
        </>
      ) : spotifyConfigured ? (
        <>
          <Text style={styles.detail}>Conecte sua conta para usar playlists relaxantes no app.</Text>
          <Button label="Conectar ao Spotify" onPress={() => promptAsync()} disabled={disabled || !request} />
        </>
      ) : (
        <Text style={styles.detail}>
          Para ativar, crie um app em developer.spotify.com, cadastre o redirect {spotifyRedirectUri} e defina EXPO_PUBLIC_SPOTIFY_CLIENT_ID.
        </Text>
      )}
    </Card>
  );
}

/* RF-57 --------------------------------------------------------------- */

function HealthConnectCard({ disabled }: { disabled: boolean }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = data.integrations.healthConnect;

  useEffect(() => {
    healthConnectAvailability().then(setAvailability);
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      const imported = await importSleep(data, actions);
      notify('Sono sincronizado', imported ? `${imported} ${imported === 1 ? 'noite importada' : 'noites importadas'} para os registros de sono.` : 'Nenhuma noite nova nos últimos 14 dias.');
    } catch (error) {
      notify('Não foi possível ler o sono', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    try {
      if (!(await connectHealthConnect())) {
        notify('Permissão não concedida', 'Autorize a leitura de sono no Health Connect para importar suas horas de sono.');
        return;
      }
      actions.setIntegration('healthConnect', { connectedAt: new Date().toISOString(), lastSyncAt: null });
    } finally {
      setBusy(false);
    }
    await sync();
  };

  return (
    <Card style={styles.card}>
      <SectionEyebrow>SONO DO SEU RELÓGIO OU PULSEIRA</SectionEyebrow>
      <Text style={styles.detail}>
        Importa as horas de sono do Google Fit e de outros apps e vestíveis pelo Health Connect, o serviço do Android que substituiu a API do Google Fit.
      </Text>
      {availability === 'unsupported' ? (
        <Text style={styles.detail}>Disponível no Android 8.0 ou mais recente, no app instalado.</Text>
      ) : availability === 'needs-install' ? (
        <Button label="Instalar ou atualizar o Health Connect" variant="secondary" onPress={openHealthConnectSettings} />
      ) : connected ? (
        <>
          <Text style={styles.title}>
            Conectado{connected.lastSyncAt ? ` · última leitura em ${formatShortDate(new Date(connected.lastSyncAt))}` : ''}
          </Text>
          <Button label={busy ? 'Sincronizando…' : 'Sincronizar agora'} onPress={sync} disabled={busy || disabled} />
          <Button label="Desconectar" variant="secondary" onPress={() => actions.setIntegration('healthConnect', null)} />
        </>
      ) : (
        <Button label={busy ? 'Conectando…' : 'Conectar ao Health Connect'} onPress={connect} disabled={busy || disabled || availability === null} />
      )}
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  card: {
    gap: 12,
  },
  warning: {
    backgroundColor: c.amberSurface,
  },
  warningText: {
    ...MenteType.caption,
    color: c.amberText,
  },
  title: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  danger: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH + 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  action: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  editor: {
    gap: 10,
    padding: 12,
    borderRadius: MenteRadius.row,
    borderWidth: 1,
    borderColor: c.border,
  },
}));
