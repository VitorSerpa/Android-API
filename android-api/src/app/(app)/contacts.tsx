import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, IconBubble, Input, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { useUserData } from '@/data/user-data-context';
import { confirm } from '@/lib/dialogs';
import { call } from '@/lib/phone';
import { makeStyles } from '@/theme';

export default function ContactsScreen() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const canAdd = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 3;

  const add = () => {
    actions.addContact({ name: name.trim(), phone: phone.trim() });
    setName('');
    setPhone('');
  };

  const remove = async (id: string, contactName: string) => {
    if (await confirm('Remover contato', `Remover ${contactName} dos seus contatos de apoio?`, 'Remover')) {
      actions.removeContact(id);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          // Android is edge-to-edge (targetSdk 35+), where `adjustResize` no longer
          // shrinks the window, so pad on both platforms.
          behavior="padding">
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <TopBar title="Contatos de apoio" />

            <Text style={styles.intro}>
              Pessoas para quem você pode ligar num momento difícil. Elas aparecem no Modo crise.
            </Text>

            <Card style={styles.card}>
              {data.contacts.length === 0 ? (
                <Text style={styles.empty}>Nenhum contato ainda. Adicione alguém de confiança abaixo.</Text>
              ) : null}

              {data.contacts.map((contact) => (
                <View key={contact.id} style={styles.contact}>
                  <IconBubble name="phone" size={35} glyphSize={17} />
                  <View style={styles.contactText}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactDetail}>{contact.phone}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${contact.name}`}
                    hitSlop={8}
                    onPress={() => remove(contact.id, contact.name)}>
                    <Text style={styles.remove}>Remover</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ligar para ${contact.name}`}
                    onPress={() => call(contact.phone)}
                    style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
                    <Text style={styles.callButtonText}>Ligar</Text>
                  </Pressable>
                </View>
              ))}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Novo contato</Text>
              <Input
                placeholder="Nome (ex.: Marcos, irmão)"
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
              <Input
                placeholder="Telefone"
                value={phone}
                onChangeText={setPhone}
                inputMode="tel"
                autoComplete="tel"
                onSubmitEditing={() => canAdd && add()}
              />
              <Button label="Adicionar" onPress={add} disabled={!canAdd} />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 24,
  },
  intro: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  empty: {
    ...MenteType.small,
    color: c.textMuted,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: c.text,
  },
  contactDetail: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  remove: {
    ...MenteType.link,
    color: c.dangerText,
  },
  callButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  callButtonText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
}));
